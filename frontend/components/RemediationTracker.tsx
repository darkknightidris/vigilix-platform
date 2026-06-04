"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

type RemStatus = "open" | "in_progress" | "resolved"

interface Props {
  vulnId: string
  initialStatus: RemStatus
  initialSlaDeadline?: string | null
  initialSlaNote?: string | null
  isAdminOrOwner: boolean
}

const STATUS_CONFIG: Record<RemStatus, { label: string; color: string; dot: string }> = {
  open:        { label: "Open",        color: "bg-red-900/40 text-red-400 border-red-700/50",    dot: "bg-red-400"    },
  in_progress: { label: "In Progress", color: "bg-yellow-900/40 text-yellow-400 border-yellow-700/50", dot: "bg-yellow-400" },
  resolved:    { label: "Resolved",    color: "bg-green-900/40 text-green-400 border-green-700/50",  dot: "bg-green-400"  },
}

// ── SLA Countdown ─────────────────────────────────────────────────────────────
function SLACountdown({ deadline }: { deadline: string }) {
  const [display, setDisplay] = useState({ text: "", overdue: false, urgent: false })

  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      const overdue = diff < 0
      const abs = Math.abs(diff)
      const d = Math.floor(abs / 86400000)
      const h = Math.floor((abs % 86400000) / 3600000)
      const m = Math.floor((abs % 3600000) / 60000)
      const text = d > 0 ? `${d}h ${h}j ${m}m` : `${h}j ${m}m`
      setDisplay({ text, overdue, urgent: !overdue && diff < 86400000 * 2 })
    }
    calc()
    const id = setInterval(calc, 30000)
    return () => clearInterval(id)
  }, [deadline])

  if (display.overdue) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-950/40 border border-red-800/50 rounded-lg">
        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
        <span className="text-red-400 text-sm font-medium">Overdue {display.text}</span>
      </div>
    )
  }
  if (display.urgent) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-950/40 border border-yellow-800/50 rounded-lg">
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
        <span className="text-yellow-400 text-sm font-medium">Sisa {display.text}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-lg">
      <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
      <span className="text-gray-300 text-sm font-medium">Sisa {display.text}</span>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function SLAProgress({ deadline, createdAt }: { deadline: string; createdAt?: string }) {
  const total = new Date(deadline).getTime() - new Date(createdAt || Date.now() - 86400000 * 7).getTime()
  const elapsed = Date.now() - new Date(createdAt || Date.now() - 86400000 * 7).getTime()
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100))
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-green-500"

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Progress SLA</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://vigilix-platform-production.up.railway.app"

export default function RemediationTracker({
  vulnId, initialStatus, initialSlaDeadline, initialSlaNote, isAdminOrOwner
}: Props) {
  const supabase = createClient()

  const [status, setStatus]         = useState<RemStatus>(initialStatus)
  const [slaDeadline, setSlaDeadline] = useState(
    initialSlaDeadline ? new Date(initialSlaDeadline).toISOString().slice(0, 16) : ""
  )
  const [slaNote, setSlaNote]       = useState(initialSlaNote || "")
  const [loading, setLoading]       = useState(false)
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { showToast("Sesi tidak valid", false); return }

      const res = await fetch(`${BACKEND}/api/vulnerabilities/${vulnId}/remediation`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          remediation_status: status,
          sla_deadline: slaDeadline ? new Date(slaDeadline).toISOString() : null,
          sla_note: slaNote || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${res.status}`)
      }

      showToast("Remediation berhasil disimpan!")
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan", false)
    } finally {
      setLoading(false)
    }
  }

  const cfg = STATUS_CONFIG[status]

  return (
    <div className="p-5 bg-gray-900 rounded-xl border border-gray-800 space-y-4 relative">
      {/* Toast */}
      {toast && (
        <div className={`absolute top-3 right-3 text-xs px-3 py-1.5 rounded-lg border font-medium z-10
          ${toast.ok
            ? "bg-green-950 border-green-700 text-green-300"
            : "bg-red-950 border-red-700 text-red-300"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Remediation Tracking</h3>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* SLA countdown — tampil untuk semua user */}
      {slaDeadline && status !== "resolved" && (
        <div className="space-y-2">
          <SLACountdown deadline={slaDeadline} />
          <SLAProgress deadline={slaDeadline} />
        </div>
      )}

      {/* Resolved state */}
      {status === "resolved" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-950/30 border border-green-800/40 rounded-lg">
          <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-green-400 text-sm font-medium">Vulnerability telah di-resolve</span>
        </div>
      )}

      {/* SLA note — read only untuk non-admin */}
      {!isAdminOrOwner && slaNote && (
        <div className="px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <p className="text-xs text-gray-500 mb-0.5">Catatan SLA</p>
          <p className="text-sm text-gray-300">{slaNote}</p>
        </div>
      )}

      {/* Edit form — admin/owner only */}
      {isAdminOrOwner && (
        <div className="space-y-3 pt-1 border-t border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider pt-1">Edit Remediation</p>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(["open", "in_progress", "resolved"] as RemStatus[]).map(s => (
                <button key={s}
                  onClick={() => setStatus(s)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition
                    ${status === s
                      ? `${STATUS_CONFIG[s].color} border-opacity-100`
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                    }`}>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* SLA Deadline */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">SLA Deadline</label>
            <input
              type="datetime-local"
              value={slaDeadline}
              onChange={e => setSlaDeadline(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
            />
          </div>

          {/* SLA Note */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500">Catatan SLA</label>
            <input
              type="text"
              value={slaNote}
              onChange={e => setSlaNote(e.target.value)}
              placeholder="Contoh: Fix sebelum sprint berikutnya"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition placeholder-gray-600"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan...</>
              : "Simpan Remediation"
            }
          </button>
        </div>
      )}
    </div>
  )
}
