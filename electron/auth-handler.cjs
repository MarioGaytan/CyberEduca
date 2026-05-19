// Utilidades para manejar Google OAuth en el contexto de Electron
// El flujo estándar signInWithPopup no funciona bien en Electron porque
// el popup se abre dentro de la ventana de Electron y el redirect URI no coincide.
//
// Solución implementada:
// 1. La app abre la URL de auth de Google en el BROWSER del sistema con shell.openExternal()
// 2. Google redirige a cibereduca://callback?token=...
// 3. El SO envía el protocolo cibereduca:// a Electron (registrado como default handler)
// 4. Electron recibe la URL en el evento 'second-instance' de main.js
// 5. main.js envía la URL al renderer via IPC (canal 'oauth-callback')
// 6. El renderer usa window.electronAPI.onOAuthCallback para recibir el token
// 7. El renderer llama a signInWithCredential() con el token
//
// Este archivo es un módulo de referencia; la lógica principal está en main.js
// y en src/firebase/auth.js (lado renderer).

module.exports = {
  // URL base para el custom protocol
  PROTOCOL: 'cibereduca',
  CALLBACK_PATH: 'callback',
  FULL_CALLBACK_URL: 'cibereduca://callback',
}
