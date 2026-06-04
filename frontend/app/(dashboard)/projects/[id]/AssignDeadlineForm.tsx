"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function AssignDeadlineForm({ vuln, members }: { vuln: any, members: any[] }) {
  const [assignedTo, setAssignedTo] = useState(vuln.assigned_to || "")
  const [dueDate, setDueDate] = useState(vuln.due_date || "")
  const [status, setStatus] = useState(vuln.status || "open")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSave = async () => {
    setSaving(true)
    const prevAssigned = vuln.assigned_to
    await supabase.from("vulnerabilities").update({
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      status,
    }).eq("id", vuln.id)

    if (assignedTo && assignedTo !== prevAssigned) {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vuln_id: vuln.id, type: "assigned" }),
      })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); router.refresh() }, 1500)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Assign:</label>
        <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
          className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:border-blue-500">
          <option value="">— Unassigned —</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.full_name || m.id.slice(0,8)}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Deadline:</label>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
          className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:border-blue-500" />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Status:</label>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:border-blue-500">
          {["open","in_progress","fixed","closed"].map(s => (
            <option key={s} value={s}>{s.replace("_"," ")}</option>
          ))}
        </select>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded transition">
        {saving ? "..." : saved ? "✓ Saved" : "Save"}
      </button>
    </div>
  )
}