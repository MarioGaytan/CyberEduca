import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'

export async function createOrUpdateUserProfile(firebaseUser) {
  const { uid, email, displayName, photoURL } = firebaseUser
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)

  if (!snap.exists()) {
    const isAdmin = await checkIsAdminEmail(email)
    await setDoc(userRef, {
      uid,
      email,
      displayName,
      photoURL,
      role: isAdmin ? 'admin' : null,
      status: isAdmin ? 'active' : 'pending',
      groupId: null,
      assignedGroups: [],
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      metadata: {
        loginCount: 1,
        deviceInfo: navigator.userAgent.slice(0, 200),
      },
    })
  } else {
    const data = snap.data()

    if (data.status === 'pre_registered') {
      // Primera vez que este usuario pre-registrado hace login → activar
      // La regla de Firestore permite este cambio específico (pre_registered → active)
      await updateDoc(userRef, {
        displayName,
        photoURL,
        status: 'active',
        lastLogin: serverTimestamp(),
        'metadata.loginCount': increment(1),
      })
    } else {
      // Usuario existente — NUNCA sobreescribir role, status, groupId, assignedGroups
      await updateDoc(userRef, {
        photoURL,
        lastLogin: serverTimestamp(),
        'metadata.loginCount': increment(1),
      })
    }
  }

  return getDoc(userRef)
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

async function checkIsAdminEmail(email) {
  try {
    const snap = await getDoc(doc(db, 'app_settings', 'global'))
    if (!snap.exists()) return false
    const { adminEmails = [] } = snap.data()
    return adminEmails.includes(email)
  } catch {
    // Si no se puede leer app_settings (reglas aún no configuradas), no es admin
    return false
  }
}
