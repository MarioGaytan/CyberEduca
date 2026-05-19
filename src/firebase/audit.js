import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firestore.js'
import { auth } from './auth.js'

/**
 * Escribe una entrada en audit_logs. Nunca lanza error — el flujo principal no debe romperse por un log fallido.
 * @param {string} action — ej: 'approve_user', 'create_group', 'update_settings'
 * @param {string} targetCollection — colección afectada
 * @param {string} targetId — ID del documento afectado
 * @param {object} [metadata] — datos adicionales del contexto
 */
export async function logAction(action, targetCollection, targetId, metadata = {}) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      userId: auth.currentUser?.uid ?? 'system',
      action,
      targetCollection,
      targetId,
      metadata,
      timestamp: serverTimestamp(),
      ipHash: null,
    })
  } catch (err) {
    console.warn('[audit] Error al escribir log:', action, err.message)
  }
}
