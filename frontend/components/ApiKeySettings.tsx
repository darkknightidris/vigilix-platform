"use client"
import { useState, useEffect } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "https://vigilix-platform-production.up.railway.app"

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  enabled: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

interface Props { token: string | null; isAdmin: boolean; plan: string }

const SCOPES = [
  { id: "read", label: "Read All", desc: "Baca projects & findings" },
  { id: "findings:write", label: "Findings Write", desc: "Update status findings" },
  { id: "write", label: "Write All", desc: "Akses penuh read + write" },
]

export default function ApiKeySettings({ token, isAdmin, plan }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [form, setForm] = useState({ name: "", scopes: ["read"], expires_at: "" })
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }

  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/apikeys`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (Array.isArray(data)) setKeys(data) }).catch(() => {}).finally(() => setLoading(false))
  }, [token])

  const handleCreate = async () => {
    if (!form.name) return
    setCreating(true)
    try {
      const body: any = { name: form.name, scopes: form.scopes }
      if (form.expires_at) body.expires_at = new Date(form.expires_at).toISOString()
      const res = await fetch(`${API}/api/apikeys`, { method: "POST", headers, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setNewKey(data.full_key)
      setKeys(prev => [{ ...data, full_key: undefined }, ...prev])
      setShowForm(false)
      setForm({ name: "", scopes: ["read"], expires_at: "" })
    } catch (e: any) { showToast(e.message, false) }
    setCreating(false)
  }

  const handleRevoke = async (keyId: string) => {
    if (!confirm("Hapus API key ini? Semua aplikasi yang pakai key ini akan berhenti berfungsi.")) return
    setRevokingId(keyId)
    try {
      await fetch(`${API}/api/apikeys/${keyId}`, { method: "DELETE", headers })
      setKeys(prev => prev.filter(k => k.id !== keyId))
      showToast("API key dihapus")
    } catch (e: any) { showToast(e.message, false) }
    setRevokingId(null)
  }

  const handleToggle = async (key: ApiKey) => {
    try {
      const res = await fetch(`${API}/api/apikeys/${key.id}`, {
        method: "PATCH", headers, body: JSON.stringify({ enabled: !key.enabled })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setKeys(prev => prev.map(k => k.id === key.id ? { ...k, enabled: !k.enabled } : k))
    } catch (e: any) { showToast(e.message, false) }
  }

  const copyKey = () => {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleScope = (scopeId: string) => {
    setForm(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter(s => s !== scopeId)
        : [...prev.scopes, scopeId]
    }))
  }

  if (plan !== "team") {
    return (
      <div className="p-4 bg-purple-950/20 border border-purple-700/40 rounded-xl text-center">
        <p className="text-purple-300 font-medium text-sm mb-1">Fitur Team Plan</p>
        <p className="text-gray-400 text-xs">REST API publik tersedia di plan Team. Upgrade untuk akses API key.</p>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
      <span className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
      Memuat API keys...
    </div>
  )

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`px-4 py-2.5 rounded-lg text-sm font-medium border ${toast.ok ? "bg-green-950/40 border-green-700/50 text-green-300" : "bg-red-950/40 border-red-700/50 text-red-300"}`}>
          {toast.msg}
        </div>
      )}

      {/* New key reveal */}
      {newKey && (
        <div className="p-4 bg-yellow-950/30 border border-yellow-700/50 rounded-xl space-y-3">
          <p className="text-yellow-300 font-medium text-sm">API Key Berhasil Dibuat</p>
          <p className="text-yellow-200/70 text-xs">Simpan key ini sekarang — tidak bisa dilihat lagi setelah ditutup.</p>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-900 border border-yellow-700/50 rounded-lg text-xs font-mono text-yellow-300 break-all">{newKey}</code>
            <button onClick={copyKey} className="px-3 py-2 bg-yellow-700 hover:bg-yellow-600 text-white text-xs rounded-lg transition whitespace-nowrap">
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs text-gray-500 hover:text-gray-400">Tutup</button>
        </div>
      )}

      {/* List keys */}
      {keys.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <p className="text-2xl mb-2">🔑</p>
          <p>Belum ada API key. Buat key untuk akses REST API Vigilix.</p>
        </div>
      )}

      {keys.map(key => (
        <div key={key.id} className="flex items-center justify-between p-4 bg-gray-800/60 rounded-xl border border-gray-700/50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔑</span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-white font-medium">{key.name}</p>
                {!key.enabled && <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400 border border-gray-600">Nonaktif</span>}
              </div>
              <code className="text-xs text-gray-500 font-mono">{key.key_prefix}••••••••</code>
              <div className="flex items-center gap-2 mt-0.5">
                {key.scopes?.map(s => (
                  <span key={s} className="text-xs px-1.5 py-0.5 bg-indigo-950/40 border border-indigo-700/40 text-indigo-300 rounded">{s}</span>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {key.last_used_at ? `Terakhir dipakai: ${new Date(key.last_used_at).toLocaleDateString("id-ID")}` : "Belum pernah dipakai"}
                {key.expires_at && ` · Expires: ${new Date(key.expires_at).toLocaleDateString("id-ID")}`}
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button onClick={() => handleToggle(key)}
                className={`px-3 py-1.5 text-xs rounded-lg transition ${key.enabled ? "bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 text-green-400" : "bg-gray-700 hover:bg-gray-600 text-gray-400"}`}>
                {key.enabled ? "Aktif" : "Nonaktif"}
              </button>
              <button onClick={() => handleRevoke(key.id)} disabled={revokingId === key.id}
                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Form buat key baru */}
      {showForm && (
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 space-y-4">
          <p className="text-sm text-white font-medium">Buat API Key Baru</p>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Nama Key</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. CI/CD Pipeline, Monitoring System"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Scopes</label>
            <div className="space-y-2">
              {SCOPES.map(s => (
                <label key={s.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-700/30 transition">
                  <input type="checkbox" checked={form.scopes.includes(s.id)} onChange={() => toggleScope(s.id)}
                    className="w-3.5 h-3.5 accent-indigo-500" />
                  <div>
                    <p className="text-xs text-white font-medium">{s.label}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Expires (opsional)</label>
            <input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} disabled={creating || !form.name || form.scopes.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
              {creating ? "Membuat..." : "Buat API Key"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition">
              Batal
            </button>
          </div>
        </div>
      )}

      {isAdmin && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm rounded-lg transition flex items-center gap-2">
          <span>+</span> Buat API Key
        </button>
      )}

      {/* Docs singkat */}
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50 space-y-2">
        <p className="text-xs text-gray-400 font-medium">Cara pakai API:</p>
        <code className="block text-xs text-indigo-300 font-mono bg-gray-900 px-3 py-2 rounded-lg break-all">
          GET https://vigilix-platform-production.up.railway.app/api/apikeys/v1/findings
        </code>
        <code className="block text-xs text-gray-400 font-mono bg-gray-900 px-3 py-2 rounded-lg">
          Header: X-API-Key: vgx_your_api_key_here
        </code>
      </div>
    </div>
  )
}

