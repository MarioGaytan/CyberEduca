import { useNavigate } from 'react-router-dom'
import { signOut } from '@/firebase/auth.js'
import { useAuthStore } from '@/store/authStore.js'

export default function PendingApproval() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const isDocente = user?.role === 'docente'

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md px-8 py-12 bg-white rounded-2xl shadow-lg border border-neutral-100 text-center">

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-50 border-2 border-yellow-200 mb-6">
          <svg className="w-8 h-8 text-yellow-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          {isDocente ? 'Pendiente de aprobación' : 'Cuenta en configuración'}
        </h1>
        <p className="text-neutral-500 text-sm mb-8 leading-relaxed">
          {isDocente
            ? 'Tu cuenta de docente está siendo revisada por el administrador. Recibirás acceso una vez que sea aprobada.'
            : 'Tu cuenta está siendo configurada por el administrador del sistema. Esto puede tomar unos minutos.'}
        </p>

        {user && (
          <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 rounded-xl mb-8 text-left">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-800 truncate">{user.displayName}</p>
              <p className="text-xs text-neutral-400 truncate">{user.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          Cerrar sesión y usar otra cuenta
        </button>
      </div>
    </div>
  )
}
