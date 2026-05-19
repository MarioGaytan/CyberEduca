import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/firestore.js'
import { logAction } from '@/firebase/audit.js'
import { useAuthStore } from '@/store/authStore.js'

const DEFAULTS = {
  schoolName: '',
  schoolDomain: '',
  allowedEmailDomain: '',
  maintenanceMode: false,
  registrationOpen: true,
  adminEmails: [],
  rankingConfig: { enableWeekly: false, enableMonthly: false, includeGamesInRanking: true, gamesWeight: 0.3 },
  featureFlags: { hangmanEnabled: true, memoramaEnabled: true, bytedefenderEnabled: false, rankingsEnabled: true },
}

function Toggle({ checked, onChange, label }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-neutral-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

export default function Settings() {
  const { user } = useAuthStore()
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'app_settings', 'global'))
        if (snap.exists()) {
          setSettings({ ...DEFAULTS, ...snap.data() })
        }
      } catch {
        // Usa defaults
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const set = (key) => (e) => setSettings((s) => ({ ...s, [key]: e.target.value }))
  const setToggle = (key) => () => setSettings((s) => ({ ...s, [key]: !s[key] }))
  const setRanking = (key) => (e) => setSettings((s) => ({
    ...s,
    rankingConfig: { ...s.rankingConfig, [key]: typeof s.rankingConfig[key] === 'boolean' ? !s.rankingConfig[key] : parseFloat(e.target.value) },
  }))

  function addAdminEmail() {
    const email = newAdminEmail.trim().toLowerCase()
    if (!email || settings.adminEmails.includes(email)) return
    setSettings((s) => ({ ...s, adminEmails: [...s.adminEmails, email] }))
    setNewAdminEmail('')
  }

  function removeAdminEmail(email) {
    setSettings((s) => ({ ...s, adminEmails: s.adminEmails.filter((e) => e !== email) }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await setDoc(doc(db, 'app_settings', 'global'), {
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      })
      await logAction('update_settings', 'app_settings', 'global')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 mb-1">Configuración</h1>
      <p className="text-sm text-neutral-500 mb-8">Ajustes globales de la plataforma.</p>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Escuela */}
        <section className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-neutral-800">Datos de la escuela</h2>
          {[
            { key: 'schoolName', label: 'Nombre de la escuela', placeholder: 'Secundaria Técnica #1' },
            { key: 'schoolDomain', label: 'Dominio web de la escuela', placeholder: 'escuela.edu.mx' },
            { key: 'allowedEmailDomain', label: 'Dominio de correos permitidos', placeholder: 'gmail.com' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-sm font-medium text-neutral-700 block mb-1">{label}</label>
              <input value={settings[key]} onChange={set(key)} placeholder={placeholder}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
          ))}
        </section>

        {/* Acceso */}
        <section className="bg-white border border-neutral-200 rounded-xl p-6">
          <h2 className="font-semibold text-neutral-800 mb-2">Acceso</h2>
          <div className="divide-y divide-neutral-100">
            <Toggle label="Modo mantenimiento (bloquea login de no-admins)" checked={settings.maintenanceMode} onChange={setToggle('maintenanceMode')} />
            <Toggle label="Registro abierto" checked={settings.registrationOpen} onChange={setToggle('registrationOpen')} />
          </div>
        </section>

        {/* Admin emails */}
        <section className="bg-white border border-neutral-200 rounded-xl p-6">
          <h2 className="font-semibold text-neutral-800 mb-3">Correos con acceso admin automático</h2>
          <div className="space-y-2 mb-3">
            {settings.adminEmails.map((email) => (
              <div key={email} className="flex items-center justify-between bg-neutral-50 px-3 py-2 rounded-lg">
                <span className="text-sm text-neutral-700">{email}</span>
                <button type="button" onClick={() => removeAdminEmail(email)} className="text-xs text-red-400 hover:text-red-600">Quitar</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="nuevo@admin.com"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAdminEmail())}
              className="flex-1 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            <button type="button" onClick={addAdminEmail} className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-sm font-medium text-neutral-700 rounded-lg transition-colors">Agregar</button>
          </div>
        </section>

        {/* Rankings */}
        <section className="bg-white border border-neutral-200 rounded-xl p-6">
          <h2 className="font-semibold text-neutral-800 mb-2">Rankings</h2>
          <div className="divide-y divide-neutral-100">
            <Toggle label="Rankings semanales" checked={settings.rankingConfig.enableWeekly} onChange={() => setSettings((s) => ({ ...s, rankingConfig: { ...s.rankingConfig, enableWeekly: !s.rankingConfig.enableWeekly } }))} />
            <Toggle label="Rankings mensuales" checked={settings.rankingConfig.enableMonthly} onChange={() => setSettings((s) => ({ ...s, rankingConfig: { ...s.rankingConfig, enableMonthly: !s.rankingConfig.enableMonthly } }))} />
            <Toggle label="Incluir juegos en ranking" checked={settings.rankingConfig.includeGamesInRanking} onChange={() => setSettings((s) => ({ ...s, rankingConfig: { ...s.rankingConfig, includeGamesInRanking: !s.rankingConfig.includeGamesInRanking } }))} />
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium text-neutral-700 block mb-1">
              Peso de juegos en ranking: <span className="font-bold">{Math.round((settings.rankingConfig.gamesWeight ?? 0.3) * 100)}%</span>
            </label>
            <input type="range" min="0" max="1" step="0.05" value={settings.rankingConfig.gamesWeight ?? 0.3}
              onChange={(e) => setSettings((s) => ({ ...s, rankingConfig: { ...s.rankingConfig, gamesWeight: parseFloat(e.target.value) } }))}
              className="w-full accent-primary" />
          </div>
        </section>

        {/* Guardar */}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving}
            className="px-8 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-hover transition-colors disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">✓ Guardado</span>}
        </div>
      </form>
    </div>
  )
}
