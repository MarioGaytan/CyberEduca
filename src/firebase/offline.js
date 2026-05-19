import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore'
import { app } from './config.js'

export const db = getFirestore(app)

export async function initOfflinePersistence() {
  try {
    await enableMultiTabIndexedDbPersistence(db)
  } catch (err) {
    if (err.code === 'failed-precondition') {
      // Múltiples tabs abiertas — solo una puede tener persistencia activa.
      // La app sigue funcionando, solo sin sincronización entre tabs.
      console.warn('CiberEduca: persistencia offline no disponible (múltiples tabs abiertas)')
    } else if (err.code === 'unimplemented') {
      // Navegador no soporta IndexedDB (ej: Safari privado, IE)
      console.warn('CiberEduca: este navegador no soporta modo offline')
    }
    // En ambos casos la app funciona en modo online normal
  }
}
