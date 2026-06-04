"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface Control { id: string; framework: string; code: string; title: string }

const FRAMEWORK_COLORS: Record<string, string> = {
  "OWASP Top 10": "bg-orange-900/50 text-orange-400 border-orange-800/50",
  "ISO 27001": "bg-blue-900/50 text-blue-400 border-blue-800/50",
}

export default function ComplianceTags({
  value, onChange,
}: {
  value: string[]
  onChange: (tags: string[]) => void
}) {
  const supabase = createClient()
  const [controls, setControls] = useState<Control[]>([])
  const [activeFramework, setActiveFramework] = useState("OWASP Top 10")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.from("compliance_controls").select("*").order("code")
      .then(({ data }) => { if (data) setControls(data) })
  }, [])

  const frameworks = [...new Set(controls.map(c => c.framework))]
  const filtered = controls.filter(c => c.framework === activeFramework)

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  }

  const selected = controls.filter(c => value.includes(c.id))

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">Compliance Mapping</label>
      {/* Selected tags */}
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-6">
        {selected.length === 0 && (
          <span className="text-gray-600 text-xs">Belum ada mapping</span>
        )}
        {selected.map(c => (
          <span key={c.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${FRAMEWORK_COLORS[c.framework] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
            {c.code}
            <button onClick={() => toggle(c.id)} className="hover:opacity-70 ml-0.5">x</button>
          </span>
        ))}
      </div>
      {/* Toggle picker */}
      <button type="button" onClick={() => setOpen(p => !p)}
        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded-lg transition">
        {open ? "Tutup" : "+ Tambah Control"}
      </button>
      {open && (
        <div className="mt-2 p-3 bg-gray-800 border border-gray-700 rounded-xl space-y-3">
          {/* Framework tabs */}
          <div className="flex gap-2">
            {frameworks.map(f => (
              <button key={f} onClick={() => setActiveFramework(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${activeFramework === f ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}>
                {f}
              </button>
            ))}
          </div>
          {/* Controls grid */}
          <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
            {filtered.map(c => (
              <label key={c.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700 cursor-pointer">
                <input type="checkbox" checked={value.includes(c.id)} onChange={() => toggle(c.id)}
                  className="w-4 h-4 accent-blue-500 shrink-0" />
                <span className="text-xs font-mono text-orange-400 shrink-0 w-20">{c.code}</span>
                <span className="text-xs text-gray-300">{c.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}