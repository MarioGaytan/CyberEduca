import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthChange, isDomainAllowed, signOut } from '@/firebase/auth.js'
import { createOrUpdateUserProfile } from '@/features/auth/userProfile.js'
import { useAuthStore } from '@/store/authStore.js'
import ProtectedRoute from '@/components/shared/ProtectedRoute.jsx'

// Auth
import Login from '@/pages/auth/Login.jsx'
import PendingApproval from '@/pages/auth/PendingApproval.jsx'
import Unauthorized from '@/pages/auth/Unauthorized.jsx'

// Admin — layout + páginas
import AdminLayout from '@/pages/admin/AdminLayout.jsx'
import AdminDashboard from '@/pages/admin/Dashboard.jsx'
import AdminUsers from '@/pages/admin/Users.jsx'
import AdminGroups from '@/pages/admin/Groups.jsx'
import AdminContent from '@/pages/admin/Content.jsx'
import AdminGames from '@/pages/admin/Games.jsx'
import AdminSettings from '@/pages/admin/Settings.jsx'
import AdminLogs from '@/pages/admin/Logs.jsx'

// Placeholders — se reemplazan en sus respectivos bloques
import TeacherDashboard from '@/pages/teacher/Dashboard.jsx'
import StudentInicio from '@/pages/student/Inicio.jsx'
import NotFound from '@/pages/shared/NotFound.jsx'

// Inicializa la suscripción de auth una sola vez para toda la app
function AuthProvider({ children }) {
  const { setUser, clearUser, setError, setLoading } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (!firebaseUser) {
        clearUser()
        return
      }

      if (!isDomainAllowed(firebaseUser.email)) {
        await signOut()
        setError('Solo cuentas del dominio institucional pueden acceder.')
        return
      }

      try {
        const profileSnap = await createOrUpdateUserProfile(firebaseUser)
        setUser(profileSnap.data(), firebaseUser)
      } catch (err) {
        console.error('[Auth] Error al cargar perfil:', err.code, err.message)
        // NO llamar clearUser() — borra el error antes de que Login lo muestre
        setError(
          err.code === 'permission-denied'
            ? 'Error de permisos en la base de datos. Contacta al administrador.'
            : 'Error al cargar tu perfil. Intenta de nuevo.'
        )
        setLoading(false)
        await signOut()
      }
    })

    return unsubscribe
  }, [])

  return children
}

function RootRedirect() {
  const { user } = useAuthStore()

  if (!user) return <Navigate to="/login" replace />

  if (user.status === 'pending' || user.status === 'pre_registered') return <Navigate to="/pending-approval" replace />
  if (user.status === 'rejected' || user.status === 'suspended') return <Navigate to="/unauthorized" replace />

  if (user.role === 'admin') return <Navigate to="/admin" replace />
  if (user.role === 'docente') return <Navigate to="/teacher" replace />
  if (user.role === 'estudiante') return <Navigate to="/student" replace />

  return <Navigate to="/pending-approval" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Público */}
          <Route path="/login" element={<Login />} />

          {/* Semi-protegido: necesita sesión pero acepta cualquier status */}
          <Route path="/pending-approval" element={<ProtectedRoute allowPending><PendingApproval /></ProtectedRoute>} />
          <Route path="/unauthorized" element={<ProtectedRoute allowPending><Unauthorized /></ProtectedRoute>} />

          {/* Admin — layout con Outlet y rutas anidadas */}
          <Route
            path="/admin"
            element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="groups" element={<AdminGroups />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="games" element={<AdminGames />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="logs" element={<AdminLogs />} />
          </Route>

          {/* Docente — Bloque 3+ implementa las subrutas reales */}
          <Route path="/teacher/*" element={<ProtectedRoute requiredRole="docente"><TeacherDashboard /></ProtectedRoute>} />

          {/* Estudiante — Bloque 9+ implementa las subrutas reales */}
          <Route path="/student/*" element={<ProtectedRoute requiredRole="estudiante"><StudentInicio /></ProtectedRoute>} />

          {/* Raíz: redirige según estado de sesión */}
          <Route path="/" element={<ProtectedRoute allowPending><RootRedirect /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
