import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { onAuthChange, isDomainAllowed, signOut } from '@/firebase/auth.js'
import { createOrUpdateUserProfile } from '@/features/auth/userProfile.js'
import { useAuthStore } from '@/store/authStore.js'
import ProtectedRoute from '@/components/shared/ProtectedRoute.jsx'

// Auth
import Login from '@/pages/auth/Login.jsx'
import PendingApproval from '@/pages/auth/PendingApproval.jsx'
import Unauthorized from '@/pages/auth/Unauthorized.jsx'

// Placeholders — se reemplazan en sus respectivos bloques
import AdminDashboard from '@/pages/admin/Dashboard.jsx'
import TeacherDashboard from '@/pages/teacher/Dashboard.jsx'
import StudentInicio from '@/pages/student/Inicio.jsx'
import NotFound from '@/pages/shared/NotFound.jsx'

// Inicializa la suscripción de auth una sola vez en el árbol de la app
function AuthProvider({ children }) {
  const { setUser, clearUser, setError } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (!firebaseUser) {
        clearUser()
        return
      }

      // Validar dominio institucional — segundo factor de seguridad después de hd en GoogleAuthProvider
      if (!isDomainAllowed(firebaseUser.email)) {
        await signOut()
        setError('Solo cuentas del dominio institucional pueden acceder.')
        return
      }

      try {
        const profileSnap = await createOrUpdateUserProfile(firebaseUser)
        setUser(profileSnap.data(), firebaseUser)
      } catch (err) {
        console.error('Error al cargar perfil de usuario:', err)
        setError('Error al cargar tu perfil. Intenta de nuevo.')
        clearUser()
      }
    })

    return unsubscribe
  }, [])

  return children
}

function RootRedirect() {
  const { user, loading } = useAuthStore()
  const navigate = useNavigate()

  if (loading) return null // ProtectedRoute ya muestra el spinner

  if (!user) return <Navigate to="/login" replace />

  if (user.status === 'pending' || user.status === 'pre_registered') {
    return <Navigate to="/pending-approval" replace />
  }
  if (user.status === 'rejected' || user.status === 'suspended') {
    return <Navigate to="/unauthorized" replace />
  }

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
          <Route
            path="/pending-approval"
            element={
              <ProtectedRoute allowPending>
                <PendingApproval />
              </ProtectedRoute>
            }
          />
          <Route
            path="/unauthorized"
            element={
              <ProtectedRoute allowPending>
                <Unauthorized />
              </ProtectedRoute>
            }
          />

          {/* Rutas por rol — Bloque 2+ implementa el contenido real */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/*"
            element={
              <ProtectedRoute requiredRole="docente">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/*"
            element={
              <ProtectedRoute requiredRole="estudiante">
                <StudentInicio />
              </ProtectedRoute>
            }
          />

          {/* Raíz: redirige según estado de sesión */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowPending>
                <RootRedirect />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
