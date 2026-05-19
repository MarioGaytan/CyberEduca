const { app, BrowserWindow, shell, protocol } = require('electron')
const path = require('path')

const isDev = process.env.NODE_ENV !== 'production'

// Evitar múltiples instancias (importante en laboratorio)
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
  process.exit(0)
}

// Registrar custom protocol para Google OAuth en Electron
// Firebase redirige a cibereduca://callback después del login
app.setAsDefaultProtocolClient('cibereduca')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    title: 'CiberEduca',
    // icon: path.join(__dirname, '../src/assets/icon.ico'), // habilitar cuando exista el icono
    webPreferences: {
      // CRÍTICO: mantener contextIsolation: true y nodeIntegration: false
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      // Permitir IndexedDB para Firestore offline persistence
      enableBlinkFeatures: '',
    },
  })

  // En desarrollo: cargar el dev server de Vite
  // En producción: cargar el build estático
  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))

    // Deshabilitar DevTools en producción
    win.webContents.on('devtools-opened', () => {
      win.webContents.closeDevTools()
    })
  }

  // Abrir links externos en el browser del sistema, no en Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Allowlist de URLs que puede cargar la ventana Electron
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    const allowedOrigins = [
      'http://localhost:5173',
      'https://accounts.google.com',
      'cibereduca://',
    ]
    const isAllowed = allowedOrigins.some(
      (origin) => navigationUrl.startsWith(origin) || parsedUrl.protocol === 'file:'
    )
    if (!isAllowed) {
      event.preventDefault()
    }
  })

  return win
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Manejar el callback OAuth cuando se abre cibereduca://callback?...
// La segunda instancia envía la URL al proceso principal
app.on('second-instance', (_event, commandLine) => {
  const callbackUrl = commandLine.find((arg) => arg.startsWith('cibereduca://'))
  if (callbackUrl) {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      // Pasar el token al renderer via IPC (implementar en auth-handler.js)
      win.webContents.send('oauth-callback', callbackUrl)
      win.focus()
    }
  }
})

// macOS: no cerrar la app cuando se cierran todas las ventanas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
