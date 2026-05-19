import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'

export async function createOrUpdateUserProfile(firebaseUser) {
  const { uid, email, displayName, photoURL } = firebaseUser
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)

  if (!snap.exists()) {
    // Orden de prioridad: admin > pre_registered > nuevo pendiente
    const isAdmin = await checkIsAdminEmail(email)

    if (isAdmin) {
      await setDoc(userRef, buildProfile({ uid, email, displayName, photoURL, role: 'admin', status: 'active' }))
    } else {
      // Buscar si el admin pre-registró este email (CSV import) — O(1), clave directa por email
      const preRegSnap = await getDoc(doc(db, 'pre_registered', email))
      if (preRegSnap.exists()) {
        const preReg = preRegSnap.data()
        await setDoc(userRef, buildProfile({
          uid, email, displayName, photoURL,
          role: preReg.role ?? 'estudiante',
          status: 'active',
          groupId: preReg.groupId ?? null,
        }))
        // Limpiar la entrada pre_registered — ya no se necesita
        await deleteDoc(doc(db, 'pre_registered', email))
      } else {
        await setDoc(userRef, buildProfile({ uid, email, displayName, photoURL, role: null, status: 'pending' }))
      }
    }
  } else {
    const data = snap.data()

    if (data.status === 'pre_registered') {
      // Usuario que existía como pre_registered en la colección users (legacy) → activar
      await updateDoc(userRef, {
        displayName,
        photoURL,
        status: 'active',
        lastLogin: serverTimestamp(),
        'metadata.loginCount': increment(1),
      })
    } else {
      // Login normal — NUNCA sobreescribir role, status, groupId, assignedGroups
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

function buildProfile({ uid, email, displayName, photoURL, role, status, groupId = null }) {
  return {
    uid,
    email,
    displayName,
    photoURL,
    role,
    status,
    groupId,
    assignedGroups: [],
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    metadata: {
      loginCount: 1,
      deviceInfo: navigator.userAgent.slice(0, 200),
    },
  }
}

async function checkIsAdminEmail(email) {
  try {
    const snap = await getDoc(doc(db, 'app_settings', 'global'))
    if (!snap.exists()) return false
    const { adminEmails = [] } = snap.data()
    return adminEmails.includes(email)
  } catch {
    return false
  }
}
