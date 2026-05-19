import { useEffect, useState } from 'react'
import { collection, getDocs, updateDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'
import { logAction } from '@/firebase/audit.js'
import { getGroups } from '@/features/groups/groupService.js'
import { assignStudentToGroup } from '@/features/groups/groupService.js'
import Papa from 'papaparse'

const STATUS_LABEL = { active: 'Activo', pending: 'Pendiente', rejected: 'Rechazado', suspended: 'Suspendido', pre_registered: 'Pre-registrado' }
const STATUS_COLOR = { active: 'bg-green-100 text-green-700', pending: 'bg-yellow-100 text-yellow-700', rejected: 'bg-red-100 text-red-700', suspended: 'bg-neutral-100 text-neutral-500', pre_registered: 'bg-blue-100 text-blue-700' }
const ROLE_LABEL = { admin: 'Admin', docente: 'Docente', estudiante: 'Estudiante', null: '—' }

function Badge({ status }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[status] ?? 'bg-neutral-100 text-neutral-500'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

// Modal para aprobar un usuario pendiente
function ApproveModal({ user, groups, onConfirm, onClose }) {
  const [role, setRole] = useState('estudiante')
  const [groupId, setGroupId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (role === 'estudiante' && !groupId) return
    setLoading(true)
    await onConfirm({ userId: user.uid, role, groupId: role === 'estudiante' ? groupId : null })
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-neutral-900 mb-1">Aprobar usuario</h3>
        <p className="text-sm text-neutral-500 mb-5">{user.displayName} · {user.email}</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 block mb-1.5">Rol a asignar</label>
            <div className="flex gap-3">
              {['estudiante', 'docente', 'admin'].map((r) => (
                <button key={r} onClick={() => setRole(r)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${role === r ? 'border-primary bg-primary/10 text-primary' : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'}`}>
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          {role === 'estudiante' && (
            <div>
              <label className="text-sm font-medium text-neutral-700 block mb-1.5">Grupo</label>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                <option value="">Seleccionar grupo…</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.schoolYear})</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">Cancelar</button>
          <button onClick={handleConfirm} disabled={loading || (role === 'estudiante' && !groupId)}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Guardando…' : 'Aprobar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [approveTarget, setApproveTarget] = useState(null)

  useEffect(() => {
    async function load() {
      const [usersSnap, groupsList] = await Promise.all([
        getDocs(collection(db, 'users')),
        getGroups(),
      ])
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setGroups(groupsList)
      setLoading(false)
    }
    load()
  }, [])

  async function approveUser({ userId, role, groupId }) {
    const updates = { role, status: 'active' }
    if (groupId) updates.groupId = groupId
    await updateDoc(doc(db, 'users', userId), updates)
    if (groupId) await assignStudentToGroup(userId, groupId)
    await logAction('approve_user', 'users', userId, { role, groupId })
    setUsers((prev) => prev.map((u) => u.uid === userId ? { ...u, ...updates } : u))
  }

  async function suspendUser(userId) {
    await updateDoc(doc(db, 'users', userId), { status: 'suspended' })
    await logAction('suspend_user', 'users', userId)
    setUsers((prev) => prev.map((u) => u.uid === userId ? { ...u, status: 'suspended' } : u))
  }

  async function reactivateUser(userId) {
    await updateDoc(doc(db, 'users', userId), { status: 'active' })
    await logAction('reactivate_user', 'users', userId)
    setUsers((prev) => prev.map((u) => u.uid === userId ? { ...u, status: 'active' } : u))
  }

  function handleCSVImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        for (const row of data) {
          const email = row.email?.trim()
          if (!email) continue
          await setDoc(doc(db, 'pre_registered', email), {
            email,
            displayName: row.displayName?.trim() ?? '',
            groupId: row.groupId?.trim() ?? null,
            role: 'estudiante',
            createdAt: serverTimestamp(),
          })
        }
        alert(`${data.length} usuario(s) pre-registrado(s). Activarán su cuenta al hacer login con Google.`)
      },
    })
    e.target.value = ''
  }

  const filtered = users.filter((u) => {
    const matchesSearch = !search || u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !filterStatus || u.status === filterStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Usuarios</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{users.length} registrados en total</p>
        </div>
        <label className="cursor-pointer px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors">
          Importar CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
        </label>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="flex-1 border border-neutral-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-12">Sin resultados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Usuario</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((u) => (
                <tr key={u.uid ?? u.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                          {u.displayName?.[0] ?? '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-neutral-800">{u.displayName ?? '—'}</p>
                        <p className="text-xs text-neutral-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{ROLE_LABEL[u.role] ?? '—'}</td>
                  <td className="px-4 py-3"><Badge status={u.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {u.status === 'pending' && (
                        <button onClick={() => setApproveTarget(u)}
                          className="text-xs px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium">
                          Aprobar
                        </button>
                      )}
                      {u.status === 'active' && (
                        <button onClick={() => suspendUser(u.uid)}
                          className="text-xs px-3 py-1 border border-neutral-200 text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors">
                          Suspender
                        </button>
                      )}
                      {u.status === 'suspended' && (
                        <button onClick={() => reactivateUser(u.uid)}
                          className="text-xs px-3 py-1 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors">
                          Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CSV hint */}
      <p className="text-xs text-neutral-400 mt-3">
        CSV para importación masiva — columnas: <code className="bg-neutral-100 px-1 rounded">email,displayName,groupId</code>
      </p>

      {approveTarget && (
        <ApproveModal
          user={approveTarget}
          groups={groups}
          onConfirm={approveUser}
          onClose={() => setApproveTarget(null)}
        />
      )}
    </div>
  )
}
