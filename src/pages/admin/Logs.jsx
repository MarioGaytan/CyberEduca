import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'

const PAGE_SIZE = 25

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastDoc, setLastDoc] = useState(null)
  const [hasMore, setHasMore] = useState(true)

  async function loadPage(after = null) {
    setLoading(true)
    try {
      const base = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(PAGE_SIZE))
      const q = after ? query(base, startAfter(after)) : base
      const snap = await getDocs(q)
      const newLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

      setLogs((prev) => after ? [...prev, ...newLogs] : newLogs)
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null)
      setHasMore(snap.docs.length === PAGE_SIZE)
    } catch (err) {
      console.error('Error al cargar logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPage() }, [])

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Logs de auditoría</h1>
      <p className="text-sm text-neutral-500 mb-8">Registro de todas las acciones administrativas. Solo lectura.</p>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-12">Sin logs registrados aún.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Acción</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Colección</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">ID objetivo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-400 whitespace-nowrap text-xs">
                      {log.timestamp?.toDate().toLocaleString('es-MX') ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-800">{log.action}</td>
                    <td className="px-4 py-3 text-neutral-500">{log.targetCollection}</td>
                    <td className="px-4 py-3 text-neutral-400 text-xs font-mono truncate max-w-[8rem]">{log.targetId}</td>
                    <td className="px-4 py-3 text-neutral-400 text-xs font-mono truncate max-w-[8rem]">{log.userId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore && (
              <div className="border-t border-neutral-100 p-4 text-center">
                <button
                  onClick={() => loadPage(lastDoc)}
                  disabled={loading}
                  className="px-6 py-2 text-sm text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Cargando…' : 'Cargar más'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
