import { create } from 'zustand'

// Implementado en Bloque 1
// Estado: user (perfil Firestore), firebaseUser (Firebase Auth), loading, error
export const useAuthStore = create((set) => ({
  user: null,          // perfil completo de Firestore (incluye role, status, groupId)
  firebaseUser: null,  // objeto Firebase Auth (uid, email, photoURL)
  loading: true,       // true mientras se verifica la sesión inicial
  error: null,

  setUser: (user, firebaseUser) => set({ user, firebaseUser, loading: false, error: null }),
  clearUser: () => set((state) => ({ user: null, firebaseUser: null, loading: false, error: state.error })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}))
