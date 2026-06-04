"use client"
import { useState, useEffect } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "https://vigilix-platform-production.up.railway.app"

interface Webhook {
  id: string
  name: string
  type: "slack" | "discord" | "teams" | "custom"
  url: string
  enabled: boolean
  events: string[]
  created_at: string
}

interface Props { token: string | null; isAdmin: boolean }

const TYPE_INFO = {
  slack:   { label: "Slack",           icon: "💬", color: "bg-purple-900/30 border-purple-700/40 text-purple-300" },
  discord: { label: "Discord",         icon: "🎮", color: "bg-indigo-900/30 border-indigo-700/40 text-indigo-300" },
  teams:   { label: "Microsoft Teams", icon: "🔷", color: "bg-blue-900/30 border-blue-700/40 text-blue-300" },
  custom:  { label: "Custom",          icon: "🔗", color: "bg-gray-800 border-gray-700 text-gray-300" },
}

const ALL_EVENTS = [
  { id: "deadline_reminder", label: "⚠️ Deadline Reminder" },
  { id: "overdue",           label: "🔴 Overdue Alert" },
  { id: "finding_created",   label: "🆕 Finding Dibuat" },
  { id: "finding_resolved",  label: "✅ Finding Resolved" },
]

export default function WebhookSettings({ token, isAdmin }: Props) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: "", type: "slack", url: "",
    events: ["deadline_reminder", "overdue", "finding_created", "finding_resolved"]
  })

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }

  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/webhooks`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setWebhooks).catch(() => {}).finally(() => setLoading(false))
  }, [token])

  const handleCreate = async () => {
    if (!form.name || !form.url) return
    try {
      const res = await fetch(`${API}/api/webhooks`, {
        method: "POST", headers,
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setWebhooks(prev => [...prev, data])
      setShowForm(false)
      setForm({ name: "", type: "slack", url: "", events: ["deadline_reminder", "overdue", "finding_created", "finding_resolved"] })
      showToast("Webhook berhasil ditambahkan!")
    } catch (e: any) { showToast(e.message, false) }
  }

  const handleToggle = async (wh: Webhook) => {
    try {
      const res = await fetch(`${API}/api/webhooks/${wh.id}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ enabled: !wh.enabled })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setWebhooks(prev => prev.map(w => w.id === wh.id ? { ...w, enabled: !w.enabled } : w))
    } catch (e: any) { showToast(e.message, false) }
  }

  const handleTest = async (webhookId: string) => {
    setTestingId(webhookId)
    try {
      const res = await fetch(`${API}/api/webhooks/test`, {
        method: "POST", headers,
        body: JSON.stringify({ webhook_id: webhookId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      showToast("✅ Test webhook berhasil dikirim!")
    } catch (e: any) { showToast(e.message, false) }
    setTestingId(null)
  }

  const handleDelete = async (webhookId: string) => {
    if (!confirm("Hapus webhook ini?")) return
    setDeletingId(webhookId)
    try {
      await fetch(`${API}/api/webhooks/${webhookId}`, { method: "DELETE", headers })
      setWebhooks(prev => prev.filter(w => w.id !== webhookId))
      showToast("Webhook dihapus")
    } catch (e: any) { showToast(e.message, false) }
    setDeletingId(null)
  }

  const toggleEvent = (eventId: string) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }))
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
      <span className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
      Memuat webhooks...
    </div>
  )

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`px-4 py-2.5 rounded-lg text-sm font-medium border ${
          toast.ok ? "bg-green-950/40 border-green-700/50 text-green-300" : "bg-red-950/40 border-red-700/50 text-red-300"
        }`}>{toast.msg}</div>
      )}

      {/* List webhooks */}
      {webhooks.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <p className="text-2xl mb-2">🔗</p>
          <p>Belum ada webhook. Tambahkan untuk notifikasi ke Slack, Discord, atau Teams.</p>
        </div>
      )}

      {webhooks.map(wh => {
        const info = TYPE_INFO[wh.type] || TYPE_INFO.custom
        return (
          <div key={wh.id} className="flex items-center justify-between p-4 bg-gray-800/60 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{info.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white font-medium">{wh.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded border ${info.color}`}>{info.label}</span>
                  {!wh.enabled && <span className="text-xs px-2 py-0.5 rounded border bg-gray-800 border-gray-700 text-gray-500">Nonaktif</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 font-mono truncate max-w-xs">{wh.url.substring(0, 50)}...</p>
                <p className="text-xs text-gray-600 mt-0.5">{wh.events?.length || 0} events aktif</p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button onClick={() => handleTest(wh.id)} disabled={testingId === wh.id}
                  className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition disabled:opacity-50">
                  {testingId === wh.id ? "..." : "Test"}
                </button>
                <button onClick={() => handleToggle(wh)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition ${
                    wh.enabled
                      ? "bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 text-green-400"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-400"
                  }`}>
                  {wh.enabled ? "Aktif" : "Nonaktif"}
                </button>
                <button onClick={() => handleDelete(wh.id)} disabled={deletingId === wh.id}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Form tambah webhook */}
      {showForm && (
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 space-y-4">
          <p className="text-sm text-white font-medium">Tambah Webhook Baru</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Nama</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Slack Security Channel"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Tipe</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">
                <option value="slack">💬 Slack</option>
                <option value="discord">🎮 Discord</option>
                <option value="teams">🔷 Microsoft Teams</option>
                <option value="custom">🔗 Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Webhook URL</label>
            <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-indigo-500" />
            <p className="text-xs text-gray-600 mt-1">
              {form.type === "slack" && "Buat di: Slack App → Incoming Webhooks"}
              {form.type === "discord" && "Buat di: Discord Channel Settings → Integrations → Webhooks"}
              {form.type === "teams" && "Buat di: Teams Channel → Connectors → Incoming Webhook"}
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Events</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_EVENTS.map(ev => (
                <label key={ev.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.events.includes(ev.id)}
                    onChange={() => toggleEvent(ev.id)}
                    className="w-3.5 h-3.5 rounded accent-indigo-500" />
                  <span className="text-xs text-gray-300">{ev.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} disabled={!form.name || !form.url}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
              Tambahkan
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
          <span>+</span> Tambah Webhook
        </button>
      )}
    </div>
  )
}
