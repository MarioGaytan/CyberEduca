import { useNavigate } from 'react-router-dom'
import { signOut } from '@/firebase/auth.js'
import { useAuthStore } from '@/store/authStore.js'

const MESSAGES = {
  rejected: {
    title: 'Acceso denegado',
    body: 'Tu solicitud de acceso fue rechazada. Si crees que es un error, contacta al administrador de la plataforma.',
  },
  suspended: {
    title: 'Cuenta suspendida',
    body: 'Tu cuenta ha sido suspendida temporalmente. Contacta al administrador para más información.',
  },
}

export default function Unauthorized() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const msg = MESSAGES[user?.status] ?? {
    title: 'Sin acceso',
    body: 'No tienes permisos para acceder a esta sección.',
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md px-8 py-12 bg-white rounded-2xl shadow-lg border border-neutral-100 text-center">

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 mb-6">
          <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-neutral-900 mb-2">{msg.title}</h1>
        <p className="text-neutral-500 text-sm mb-8 leading-relaxed">{msg.body}</p>

        <button
          onClick={handleSignOut}
          className="px-6 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-medium text-sm transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
