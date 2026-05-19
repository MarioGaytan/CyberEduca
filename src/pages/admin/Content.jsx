import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'
import { logAction } from '@/firebase/audit.js'
import { useAuthStore } from '@/store/authStore.js'

const STATUS_COLOR = {
  draft: 'bg-neutral-100 text-neutral-500',
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  archived: 'bg-neutral-200 text-neutral-600',
}
const STATUS_LABEL = {
  draft: 'Borrador', pending_review: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado', archived: 'Archivado',
}

export default function Content() {
  const { user } = useAuthStore()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectComment, setRejectComment] = useState({})

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'topics'))
        setTopics(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch {
        setTopics([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function approveTopic(topicId) {
    await updateDoc(doc(db, 'topics', topicId), {
      status: 'approved',
      approvedBy: user.uid,
    })
    await logAction('approve_topic', 'topics', topicId)
    setTopics((prev) => prev.map((t) => t.id === topicId ? { ...t, status: 'approved', approvedBy: user.uid } : t))
  }

  async function rejectTopic(topicId) {
    const comment = rejectComment[topicId] ?? ''
    await updateDoc(doc(db, 'topics', topicId), {
      status: 'rejected',
      approvedBy: null,
      rejectionComment: comment,
    })
    await logAction('reject_topic', 'topics', topicId, { comment })
    setTopics((prev) => prev.map((t) => t.id === topicId ? { ...t, status: 'rejected' } : t))
    setRejectComment((prev) => { const n = { ...prev }; delete n[topicId]; return n })
  }

  const pending = topics.filter((t) => t.status === 'pending_review')
  const rest = topics.filter((t) => t.status !== 'pending_review')

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Contenido</h1>
      <p className="text-sm text-neutral-500 mb-8">Revisión y aprobación de temas educativos</p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Pendientes de revisión */}
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-3">
              Pendientes de revisión
              {pending.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{pending.length}</span>}
            </h2>
            {pending.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center text-sm text-neutral-400">
                Sin temas pendientes de revisión. Los docentes enviarán sus temas desde el Bloque 4.
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((t) => (
                  <div key={t.id} className="bg-white border border-yellow-200 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-neutral-900">{t.title}</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">{t.category} · creado por {t.createdBy}</p>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-600 mb-4 line-clamp-2">{t.description}</p>
                    <div className="flex gap-3 items-start">
                      <input
                        value={rejectComment[t.id] ?? ''}
                        onChange={(e) => setRejectComment((p) => ({ ...p, [t.id]: e.target.value }))}
                        placeholder="Motivo de rechazo (opcional)…"
                        className="flex-1 border border-neutral-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                      />
                      <button onClick={() => rejectTopic(t.id)} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors">Rechazar</button>
                      <button onClick={() => approveTopic(t.id)} className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors font-medium">Aprobar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Todos los temas */}
          {rest.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-3">Todos los temas</h2>
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Título</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Categoría</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {rest.map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 font-medium text-neutral-800">{t.title}</td>
                        <td className="px-4 py-3 text-neutral-500">{t.category ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[t.status] ?? ''}`}>
                            {STATUS_LABEL[t.status] ?? t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
