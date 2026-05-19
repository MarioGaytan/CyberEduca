import { useAuthStore } from '@/store/authStore.js'

/**
 * Renderiza children solo si el usuario tiene el rol indicado.
 * No redirige — simplemente oculta el contenido.
 *
 * @param {object} props
 * @param {'admin'|'docente'|'estudiante'|string[]} props.roles
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.fallback] — qué mostrar si no tiene permiso (default: null)
 */
export default function RoleGuard({ roles, children, fallback = null }) {
  const { user } = useAuthStore()

  if (!user) return fallback

  const allowed = Array.isArray(roles) ? roles : [roles]
  if (!allowed.includes(user.role)) return fallback

  return children
}
