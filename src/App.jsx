import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Placeholder — las rutas reales se implementan en Bloque 1 y 2
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function WelcomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-primary">CiberEduca</h1>
        <p className="text-neutral-600">Plataforma educativa en construcción — Bloque 0 ✅</p>
        <p className="text-sm text-neutral-400">
          Tailwind{' '}
          <span className="text-blue-500 font-semibold">funcionando</span>
          {' · '}React 19{' · '}Vite 6
        </p>
      </div>
    </div>
  )
}

export default App
