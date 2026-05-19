// Página 404 — Implementado en Bloque 12
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold text-neutral-200">404</p>
        <h1 className="text-xl font-bold text-neutral-800">Página no encontrada</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-primary hover:underline"
        >
          Regresar
        </button>
      </div>
    </div>
  )
}
