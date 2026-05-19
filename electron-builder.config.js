export default {
  appId: 'mx.edu.cibereduca',
  productName: 'CiberEduca',
  copyright: 'Copyright © 2025 CiberEduca',

  directories: {
    output: 'dist-electron',
    buildResources: 'assets',
  },

  files: [
    'dist/**/*',
    'electron/**/*',
    'node_modules/**/*',
    'package.json',
  ],

  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
    icon: 'src/assets/icon.ico',
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'src/assets/icon.ico',
    uninstallerIcon: 'src/assets/icon.ico',
    installerHeaderIcon: 'src/assets/icon.ico',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'CiberEduca',
    // Instalar para todos los usuarios del equipo (laboratorio)
    perMachine: true,
    // Instalar en C:\Program Files\CiberEduca
    defaultInstallDir: '$PROGRAMFILES\\CiberEduca',
  },

  publish: null,
}

