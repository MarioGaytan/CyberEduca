import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { app } from './config.js'

export const auth = getAuth(app)

const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN

const provider = new GoogleAuthProvider()
// hd filtra la UI de Google al dominio — es UX, no seguridad
// La seguridad real la da isDomainAllowed() + Firestore Security Rules
provider.setCustomParameters({ hd: ALLOWED_DOMAIN })

export async function signInWithGoogle() {
  return signInWithPopup(auth, provider)
}

export async function signOut() {
  return firebaseSignOut(auth)
}

// Retorna la función unsubscribe — llamar en cleanup del useEffect
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

export function isDomainAllowed(email) {
  if (!email) return false
  return email.endsWith('@' + ALLOWED_DOMAIN)
}
