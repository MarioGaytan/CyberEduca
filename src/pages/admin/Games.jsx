import { useEffect, useState } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'
import { logAction } from '@/firebase/audit.js'
import { useAuthStore } from '@/store/authStore.js'

const GAME_FLAGS = [
  { key: 'hangmanEnabled', label: 'Ahorcado', desc: 'Juego de adivinar palabras de ciberseguridad. Bloque 7.' },
  { key: 'memoramaEnabled', label: 'Memorama', desc: 'Juego de pares de conceptos. Bloque 8.' },
  { key: 'bytedefenderEnabled', label: 'ByteDefender', desc: 'Juego de aventura con laberintos. Bloque 13 (opcional).' },
  { key: 'rankingsEnabled', label: 'Rankings', desc: 'Tablas de clasificación por grupo y escuela. Bloque 6.' },
]

const DEFAULT_FLAGS = {
  hangmanEnabled: true,
  memoramaEnabled: true,
  bytedefenderEnabled: false,
  rankingsEnabled: true,
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-primary' : 'bg-neutral-200'} disabled:opacity-50`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

export default function Games() {
  const { user } = useAuthStore()
  const [flags, setFlags] = useState(DEFAULT_FLAGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'app_settings', 'global'))
        if (snap.exists() && snap.data().featureFlags) {
          setFlags({ ...DEFAULT_FLAGS, ...snap.data().featureFlags })
        }
      } catch {
        // Usa defaults si no se puede leer
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function toggleFlag(key) {
    const newFlags = { ...flags, [key]: !flags[key] }
    setFlags(newFlags)
    setSaving(true)
    try {
      await updateDoc(doc(db, 'app_settings', 'global'), { featureFlags: newFlags, updatedBy: user.uid })
      await logAction('update_feature_flags', 'app_settings', 'global', { [key]: newFlags[key] })
    } catch (err) {
      console.error(err)
      setFlags(flags) // Revertir si falla
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Juegos</h1>
      <p className="text-sm text-neutral-500 mb-8">Activar o desactivar juegos globalmente para toda la plataforma.</p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
          {GAME_FLAGS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-neutral-900">{label}</p>
                <p className="text-sm text-neutral-400 mt-0.5">{desc}</p>
              </div>
              <Toggle checked={flags[key]} onChange={() => toggleFlag(key)} disabled={saving} />
            </div>
          ))}
        </div>
      )}

      {saving && <p className="text-xs text-neutral-400 mt-3 text-right">Guardando…</p>}

      <div className="mt-8 p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
        <p className="text-xs text-neutral-500">
          El contenido pendiente de revisión (palabras de Ahorcado, sets de Memorama) aparecerá aquí una vez implementados los Bloques 7 y 8.
        </p>
      </div>
    </div>
  )
}
