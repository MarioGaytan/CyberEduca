import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getCountFromServer,
} from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'

function StatCard({ label, value, loading, to, accent }) {
  const content = (
    <div className={`bg-white rounded-xl border p-5 ${accent ? 'border-danger/30 bg-red-50/50' : 'border-neutral-200'}`}>
      <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent ? 'text-danger' : 'text-neutral-900'}`}>
        {loading ? <span className="inline-block w-10 h-8 bg-neutral-200 rounded animate-pulse" /> : value}
      </p>
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ users: 0, pending: 0, groups: 0 })
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [logs, setLogs] = useState([])

  useEffect(() => {
    async function loadCounts() {
      try {
        const [usersSnap, pendingSnap, groupsSnap] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(query(collection(db, 'users'), where('status', '==', 'pending'))),
          getCountFromServer(collection(db, 'groups')),
        ])
        setCounts({
          users: usersSnap.data().count,
          pending: pendingSnap.data().count,
          groups: groupsSnap.data().count,
        })
      } catch (err) {
        console.error('Error al cargar contadores:', err)
      } finally {
        setLoadingCounts(false)
      }
    }
    loadCounts()

    // Últimas 20 entradas del audit_log en tiempo real
    const logsQuery = query(
      collection(db, 'audit_logs'),
      orderBy('timestamp', 'desc'),
      limit(20)
    )
    const unsubscribe = onSnapshot(logsQuery, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })

    return unsubscribe
  }, [])

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Dashboard</h1>
      <p className="text-sm text-neutral-500 mb-8">Vista general de la plataforma</p>

      {/* Contadores */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <StatCard label="Total usuarios" value={counts.users} loading={loadingCounts} />
        <StatCard
          label="Pendientes de aprobar"
          value={counts.pending}
          loading={loadingCounts}
          to={counts.pending > 0 ? '/admin/users' : null}
          accent={counts.pending > 0}
        />
        <StatCard label="Grupos activos" value={counts.groups} loading={loadingCounts} />
      </div>

      {/* Actividad reciente */}
      <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-3">
        Actividad reciente
      </h2>
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        {logs.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-10">Sin actividad registrada aún.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Acción</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Colección</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-neutral-500 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-800">{log.action}</td>
                  <td className="px-4 py-3 text-neutral-500">{log.targetCollection}</td>
                  <td className="px-4 py-3 text-neutral-400">
                    {log.timestamp?.toDate().toLocaleString('es-MX') ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
