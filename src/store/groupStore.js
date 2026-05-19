import { create } from 'zustand'

// Implementado en Bloque 3
export const useGroupStore = create((set) => ({
  groups: [],
  currentGroup: null,
  loading: false,
  error: null,

  setGroups: (groups) => set({ groups }),
  setCurrentGroup: (group) => set({ currentGroup: group }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))
