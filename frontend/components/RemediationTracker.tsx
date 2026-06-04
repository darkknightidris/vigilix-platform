"use client"
import { useState, useEffect } from "react"

type Status = "open" | "in_progress" | "resolved"

interface Props {
  vulnId: string
  initialStatus: Status
  initialSlaDeadline?: string
  initialSlaNote?: string
  isAdmin: boolean
}

const STATUS_LABELS: Record<Status, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
}

const STATUS_COLORS: Record<Status, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
}

function SLACountdown({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState("")
  const [isOverdue, setIsOverdue] = useState(false)

  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      setIsOverdue(diff < 0)
      const abs = Math.abs(diff)
      const d = Math.floor(abs / 86400000)
      const h = Math.floor((abs % 86400000) / 3600000)
      const m = Math.floor((abs % 3600000) / 60000)
      setTimeLeft(`${d}d ${h}h ${m}m`)
    }
    calc()
    const interval = setInterval(calc, 60000)
    return () => clearInterval(interval)
  }, [deadline])

  return (
    <span className={`text-sm font-medium ${isOverdue ? "text-red-600" : "text-gray-600"}`}>
      {isOverdue ? `Overdue by ${timeLeft}` : `${timeLeft} remaining`}
    </span>
  )
}

export default function RemediationTracker({
  vulnId, initialStatus, initialSlaDeadline, initialSlaNote, isAdmin
}: Props) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [slaDeadline, setSlaDeadline] = useState(initialSlaDeadline || "")
  const [slaNote, setSlaNote] = useState(initialSlaNote || "")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setLoading(true)
    try {
      await fetch(`/api/vulnerabilities/${vulnId}/remediation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remediation_status: status,
          sla_deadline: slaDeadline || null,
          sla_note: slaNote || null,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">Remediation Tracking</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {isAdmin && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as Status)}
              className="w-full text-sm border rounded px-2 py-1.5"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">SLA Deadline</label>
            <input
              type="datetime-local"
              value={slaDeadline ? new Date(slaDeadline).toISOString().slice(0,16) : ""}
              onChange={e => setSlaDeadline(e.target.value)}
              className="w-full text-sm border rounded px-2 py-1.5"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">SLA Note</label>
            <input
              type="text"
              value={slaNote}
              onChange={e => setSlaNote(e.target.value)}
              placeholder="Contoh: Fix by next sprint"
              className="w-full text-sm border rounded px-2 py-1.5"
            />
          </div>

          <button
            onClick={save}
            disabled={loading}
            className="w-full text-sm bg-blue-600 text-white rounded py-1.5 hover:bg-blue-700 disabled:opacity-50"
          >
            {saved ? "Saved ✓" : loading ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {slaDeadline && status !== "resolved" && (
        <div className="pt-2 border-t">
          <p className="text-xs text-gray-400 mb-1">SLA Countdown</p>
          <SLACountdown deadline={slaDeadline} />
        </div>
      )}

      {status === "resolved" && (
        <p className="text-xs text-green-600">✓ Resolved</p>
      )}
    </div>
  )
}
