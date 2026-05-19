import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore.js'

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-neutral-500">Cargando...</p>
      </div>
    </div>
  )
}

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {'admin'|'docente'|'estudiante'} [props.requiredRole]
 * @param {boolean} [props.allowPending] — permite status pending/pre_registered (para /pending-approval y /unauthorized)
 */
export default function ProtectedRoute({ children, requiredRole, allowPending = false }) {
  const { user, loading } = useAuthStore()
  const location = useLocation()

  if (loading) return <FullScreenSpinner />

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const { status, role } = user

  if (status === 'rejected' || status === 'suspended') {
    if (location.pathname === '/unauthorized') return children
    return <Navigate to="/unauthorized" replace />
  }

  if (status === 'pending' || status === 'pre_registered') {
    if (allowPending || location.pathname === '/pending-approval') return children
    return <Navigate to="/pending-approval" replace />
  }

  if (requiredRole && role !== requiredRole) {
    if (role === 'admin') return <Navigate to="/admin" replace />
    if (role === 'docente') return <Navigate to="/teacher" replace />
    if (role === 'estudiante') return <Navigate to="/student" replace />
    return <Navigate to="/pending-approval" replace />
  }

  return children
}
