import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initOfflinePersistence } from './firebase/offline.js'

// Activar persistencia offline de Firestore antes de montar la app
initOfflinePersistence()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
