"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL || "https://vigilix-platform-production.up.railway.app"

const ACTION_COLORS: Record<string, string> = {
  comment:      "bg-blue-900/30 border-blue-700/40 text-blue-300",
  attachment:   "bg-purple-900/30 border-purple-700/40 text-purple-300",
  status_change:"bg-yellow-900/30 border-yellow-700/40 text-yellow-300",
  create:       "bg-green-900/30 border-green-700/40 text-green-300",
  update:       "bg-indigo-900/30 border-indigo-700/40 text-indigo-300",
  delete:       "bg-red-900/30 border-red-700/40 text-red-300",
  login:        "bg-gray-800 border-gray-700 text-gray-300",
  invite:       "bg-teal-900/30 border-teal-700/40 text-teal-300",
}

const ACTION_ICONS: Record<string, string> = {
  comment: "💬", attachment: "📎", status_change: "🔄", create: "✨",
  update: "✏️", delete: "🗑️", login: "🔑", invite: "📧",
}

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] || "bg-gray-800 border-gray-700 text-gray-400"
  const icon = ACTION_ICONS[action] || "📋"
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${color}`}>
      {icon} {action}
    </span>
  )
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function AuditLogPage() {
  const supabase = createClient()
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState({ action: "", resource_type: "", project_id: "" })
  const [plan, setPlan] = useState("free")

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/login"); return }
      setToken(session.access_token)

      const { data: profile } = await supabase.from("profiles").select("organizations(plan)").eq("id", session.user.id).single()
      setPlan((profile as any)?.organizations?.plan || "free")
    }
    init()
  }, [])

  const fetchLogs = useCallback(async (p = 1) => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50" })
      if (filter.action) params.set("action", filter.action)
      if (filter.resource_type) params.set("resource_type", filter.resource_type)
      if (filter.project_id) params.set("project_id", filter.project_id)

      const [logsRes, summaryRes] = await Promise.all([
        fetch(`${API}/api/audit?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/audit/summary`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const logsData = await logsRes.json()
      const summaryData = await summaryRes.json()

      if (logsRes.ok) {
        setLogs(logsData.data || [])
        setTotal(logsData.total || 0)
        setPages(logsData.pages || 1)
        setPage(p)
      }
      if (summaryRes.ok) setSummary(summaryData.summary || {})
    } catch (_) {}
    setLoading(false)
  }, [token, filter])

  useEffect(() => { if (token) fetchLogs(1) }, [token, filter])

  const handleExport = async () => {
    if (!token) return
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (filter.action) params.set("action", filter.action)
      if (filter.resource_type) params.set("resource_type", filter.resource_type)
      const res = await fetch(`${API}/api/audit/export?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `vigilix-audit-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (_) {}
    setExporting(false)
  }

  if (plan !== "team") {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <div className="p-8 bg-purple-950/20 border border-purple-700/40 rounded-2xl">
          <p className="text-4xl mb-4">🔒</p>
          <p className="text-purple-300 font-semibold text-lg mb-2">Fitur Team Plan</p>
          <p className="text-gray-400 text-sm">Audit log tersedia di plan Team. Upgrade untuk akses riwayat aktivitas lengkap organisasi kamu.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-gray-400 text-sm mt-0.5">Riwayat aktivitas seluruh anggota organisasi</p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center gap-2">
          {exporting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "⬇️"}
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(summary).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([action, count]) => (
            <div key={action} className="p-3 bg-gray-900 rounded-xl border border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 capitalize">{action}</p>
                <p className="text-xl font-bold text-white">{count}</p>
              </div>
              <span className="text-2xl">{ACTION_ICONS[action] || "📋"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-gray-900 rounded-xl border border-gray-800">
        <select value={filter.action} onChange={e => setFilter(p => ({ ...p, action: e.target.value }))}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">
          <option value="">Semua Action</option>
          <option value="comment">💬 Comment</option>
          <option value="attachment">📎 Attachment</option>
          <option value="status_change">🔄 Status Change</option>
          <option value="create">✨ Create</option>
          <option value="update">✏️ Update</option>
          <option value="delete">🗑️ Delete</option>
          <option value="login">🔑 Login</option>
          <option value="invite">📧 Invite</option>
        </select>
        <select value={filter.resource_type} onChange={e => setFilter(p => ({ ...p, resource_type: e.target.value }))}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">
          <option value="">Semua Resource</option>
          <option value="vulnerability">Vulnerability</option>
          <option value="project">Project</option>
          <option value="comment">Comment</option>
          <option value="attachment">Attachment</option>
          <option value="member">Member</option>
        </select>
        {(filter.action || filter.resource_type) && (
          <button onClick={() => setFilter({ action: "", resource_type: "", project_id: "" })}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition">
            Reset Filter
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500 self-center">{total} total entri</span>
      </div>

      {/* Log table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
            <span className="w-5 h-5 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
            Memuat audit log...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-3xl mb-3">📋</p>
            <p>Belum ada aktivitas yang tercatat.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Waktu</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Detail</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Resource</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-800/40 transition">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="text-white text-xs font-medium">{log.user_name || log.profiles?.full_name || "—"}</p>
                      <p className="text-gray-500 text-xs">{log.user_email || ""}</p>
                    </td>
                    <td className="px-4 py-3"><ActionBadge action={log.action || "—"} /></td>
                    <td className="px-4 py-3 text-gray-300 text-xs max-w-xs truncate">{log.detail || "—"}</td>
                    <td className="px-4 py-3">
                      {log.resource_type && (
                        <div>
                          <p className="text-xs text-gray-500 capitalize">{log.resource_type}</p>
                          <p className="text-xs text-gray-400 truncate max-w-xs">{log.resource_name || log.resource_id || ""}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">{log.ip_address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => fetchLogs(page - 1)} disabled={page <= 1}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 text-sm rounded-lg transition">
            ← Prev
          </button>
          <span className="text-gray-400 text-sm">Halaman {page} dari {pages}</span>
          <button onClick={() => fetchLogs(page + 1)} disabled={page >= pages}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 text-sm rounded-lg transition">
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
