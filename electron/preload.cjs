const { contextBridge, ipcRenderer } = require('electron')

// Exponer solo APIs seguras al renderer via contextBridge
// NUNCA exponer ipcRenderer completo ni APIs de Node
contextBridge.exposeInMainWorld('electronAPI', {
  // Versión de la app (útil para mostrar en UI)
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Escuchar el callback OAuth que llega por el custom protocol cibereduca://
  onOAuthCallback: (callback) => {
    ipcRenderer.on('oauth-callback', (_event, url) => callback(url))
  },

  // Remover listener (llamar en cleanup del componente)
  removeOAuthCallback: () => {
    ipcRenderer.removeAllListeners('oauth-callback')
  },

  // Detectar si estamos corriendo en Electron
  isElectron: true,
})
