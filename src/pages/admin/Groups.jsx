import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'
import { createGroup, updateGroup } from '@/features/groups/groupService.js'
import { logAction } from '@/firebase/audit.js'
import { useAuthStore } from '@/store/authStore.js'

const CURRENT_YEAR = '2025-2026'

function CreateGroupModal({ onConfirm, onClose }) {
  const [form, setForm] = useState({ name: '', grade: '1', letter: 'A', schoolYear: CURRENT_YEAR })
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    setForm((f) => ({ ...f, name: `${f.grade}°${f.letter}` }))
  }, [form.grade, form.letter])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.schoolYear) return
    setLoading(true)
    await onConfirm(form)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-neutral-900 mb-5">Nuevo grupo</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-neutral-700 block mb-1">Grado</label>
              <select value={form.grade} onChange={set('grade')} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                <option>1</option><option>2</option><option>3</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-neutral-700 block mb-1">Grupo</label>
              <select value={form.letter} onChange={set('letter')} className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                {['A','B','C','D','E','F'].map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 block mb-1">Nombre del grupo</label>
            <input value={form.name} onChange={set('name')} required className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 block mb-1">Ciclo escolar</label>
            <input value={form.schoolYear} onChange={set('schoolYear')} required placeholder="2025-2026" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50">
              {loading ? 'Creando…' : 'Crear grupo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Groups() {
  const { user } = useAuthStore()
  const [groups, setGroups] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    async function load() {
      const [groupsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'groups')),
        getDocs(collection(db, 'users')),
      ])
      const allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setGroups(groupsSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setTeachers(allUsers.filter((u) => u.role === 'docente' && u.status === 'active'))
      setLoading(false)
    }
    load()
  }, [])

  async function handleCreate(form) {
    const ref = await createGroup({ ...form, createdBy: user.uid })
    const newGroup = { id: ref.id, ...form, teacherIds: [], studentIds: [], allowedTopicIds: [], allowedQuizSetIds: [], allowedGames: [], isActive: true }
    setGroups((prev) => [...prev, newGroup])
    await logAction('create_group', 'groups', ref.id, { name: form.name })
  }

  async function toggleActive(groupId, current) {
    await updateGroup(groupId, { isActive: !current })
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, isActive: !current } : g))
    await logAction('toggle_group', 'groups', groupId, { isActive: !current })
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Grupos</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{groups.length} grupos registrados</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors">
          + Nuevo grupo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 bg-white border border-neutral-200 rounded-xl">
          <p className="text-neutral-500">No hay grupos creados.</p>
          <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-primary hover:underline">Crear el primero</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {groups.map((g) => {
            const groupTeachers = teachers.filter((t) => g.teacherIds?.includes(t.uid))
            return (
              <div key={g.id} className={`bg-white border rounded-xl p-5 ${!g.isActive ? 'opacity-60' : 'border-neutral-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-neutral-900 text-lg">{g.name}</h3>
                    <p className="text-xs text-neutral-400">{g.schoolYear}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {g.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-neutral-500 mb-4">
                  <span>👥 {g.studentIds?.length ?? 0} alumnos</span>
                  <span>📚 {g.allowedTopicIds?.length ?? 0} temas</span>
                </div>
                {groupTeachers.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-neutral-400 mb-1">Docentes</p>
                    {groupTeachers.map((t) => (
                      <p key={t.uid} className="text-xs font-medium text-neutral-700">{t.displayName}</p>
                    ))}
                  </div>
                )}
                <button onClick={() => toggleActive(g.id, g.isActive)}
                  className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                  {g.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && <CreateGroupModal onConfirm={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  )
}
