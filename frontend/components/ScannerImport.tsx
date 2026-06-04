"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface ParsedVuln {
  title: string
  severity: string
  description: string
  host: string
  port: string
}

const SEVERITY_MAP_NESSUS: Record<string, string> = {
  "0": "info", "1": "low", "2": "medium", "3": "high", "4": "critical",
  "none": "info", "low": "low", "medium": "medium", "high": "high", "critical": "critical",
}
const SEVERITY_MAP_OPENVAS: Record<string, string> = {
  "log": "info", "low": "low", "medium": "medium", "high": "high", "alarm": "critical",
}

function parseNessus(xml: string): ParsedVuln[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, "text/xml")
  const items = doc.querySelectorAll("ReportItem")
  const results: ParsedVuln[] = []
  items.forEach(item => {
    const riskFactor = item.querySelector("risk_factor")?.textContent?.toLowerCase() || "none"
    const severity = SEVERITY_MAP_NESSUS[riskFactor] ?? "info"
    if (riskFactor === "none") return
    results.push({
      title: item.getAttribute("pluginName") || "Untitled",
      severity,
      description: item.querySelector("description")?.textContent?.trim() || "",
      host: item.closest("ReportHost")?.getAttribute("name") || "",
      port: item.getAttribute("port") || "",
    })
  })
  return results
}

function parseOpenVAS(xml: string): ParsedVuln[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, "text/xml")
  const results: ParsedVuln[] = []

  // Format GXR (get_reports_response)
  const results1 = doc.querySelectorAll("result")
  if (results1.length > 0) {
    results1.forEach(r => {
      const threat = r.querySelector("threat")?.textContent?.toLowerCase() || "log"
      const severity = SEVERITY_MAP_OPENVAS[threat] ?? "info"
      if (threat === "log") return
      results.push({
        title: r.querySelector("name")?.textContent?.trim() || "Untitled",
        severity,
        description: r.querySelector("description")?.textContent?.trim() || "",
        host: r.querySelector("host")?.textContent?.trim() || "",
        port: r.querySelector("port")?.textContent?.trim() || "",
      })
    })
    return results
  }

  // Format simple vulnerability list
  const vulns = doc.querySelectorAll("vulnerability")
  vulns.forEach(v => {
    const sev = v.querySelector("severity")?.textContent?.toLowerCase() || "log"
    const severity = SEVERITY_MAP_OPENVAS[sev] ?? "info"
    results.push({
      title: v.querySelector("name")?.textContent?.trim() || "Untitled",
      severity,
      description: v.querySelector("description")?.textContent?.trim() || "",
      host: v.querySelector("host")?.textContent?.trim() || "",
      port: v.querySelector("port")?.textContent?.trim() || "",
    })
  })
  return results
}

function detectFormat(xml: string): "nessus" | "openvas" | null {
  if (xml.includes("<NessusClientData") || xml.includes("<ReportItem")) return "nessus"
  if (xml.includes("<get_reports_response") || xml.includes("<report") || xml.includes("<vulnerability")) return "openvas"
  return null
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-600", high: "bg-orange-500", medium: "bg-yellow-500",
  low: "bg-blue-500", info: "bg-gray-600",
}

export default function ScannerImport({ projectId }: { projectId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [parsed, setParsed] = useState<ParsedVuln[]>([])
  const [format, setFormat] = useState<string>("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState("")
  const [fileName, setFileName] = useState("")

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError("")
    setParsed([])
    setSelected(new Set())
    const reader = new FileReader()
    reader.onload = (ev) => {
      const xml = ev.target?.result as string
      const fmt = detectFormat(xml)
      if (!fmt) { setError("Format tidak dikenali. Pastikan file adalah .nessus atau OpenVAS XML."); return }
      setFormat(fmt === "nessus" ? "Nessus" : "OpenVAS")
      const vulns = fmt === "nessus" ? parseNessus(xml) : parseOpenVAS(xml)
      if (vulns.length === 0) { setError("Tidak ada temuan ditemukan di file ini."); return }
      setParsed(vulns)
      setSelected(new Set(vulns.map((_, i) => i)))
    }
    reader.readAsText(file)
  }

  const toggleAll = () => {
    if (selected.size === parsed.length) setSelected(new Set())
    else setSelected(new Set(parsed.map((_, i) => i)))
  }

  const toggle = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const handleImport = async () => {
    if (selected.size === 0) return
    setImporting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const toInsert = Array.from(selected).map(i => {
      const v = parsed[i]
      const desc = [
        v.description,
        v.host ? `Host: ${v.host}` : "",
        v.port ? `Port: ${v.port}` : "",
      ].filter(Boolean).join("\n\n")
      return {
        title: v.title,
        severity: v.severity,
        description: desc || null,
        status: "open",
        project_id: projectId,
        reported_by: user.id,
      }
    })

    const { error: insertError } = await supabase.from("vulnerabilities").insert(toInsert)
    if (insertError) { setError(insertError.message); setImporting(false); return }

    setToast(`${toInsert.length} temuan berhasil diimport!`)
    setTimeout(() => { router.push(`/projects/${projectId}`) }, 1500)
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium border shadow-lg bg-green-950/90 border-green-700 text-green-300">
          {toast}
        </div>
      )}

      {/* Info box */}
      <div className="p-5 bg-gray-900/50 border border-gray-800 rounded-xl space-y-3">
        <p className="text-white font-medium text-sm">Format yang didukung:</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-900 border border-orange-900/40 rounded-lg">
            <p className="text-orange-400 text-xs font-semibold mb-1">Nessus</p>
            <p className="text-gray-400 text-xs">Export dari Nessus Professional/Essentials. File extension: .nessus</p>
          </div>
          <div className="p-3 bg-gray-900 border border-green-900/40 rounded-lg">
            <p className="text-green-400 text-xs font-semibold mb-1">OpenVAS / GVM</p>
            <p className="text-gray-400 text-xs">Export XML dari Greenbone/OpenVAS. File extension: .xml</p>
          </div>
        </div>
      </div>

      {/* Upload area */}
      <label className="flex flex-col items-center justify-center p-8 bg-gray-900 border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-xl cursor-pointer transition group">
        <span className="text-3xl mb-2">📁</span>
        <span className="text-white font-medium text-sm group-hover:text-blue-400 transition">
          {fileName || "Klik untuk upload file scanner"}
        </span>
        <span className="text-gray-500 text-xs mt-1">.nessus, .xml</span>
        <input type="file" accept=".nessus,.xml" onChange={handleFile} className="hidden" />
      </label>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {/* Results */}
      {parsed.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={selected.size === parsed.length} onChange={toggleAll}
                className="w-4 h-4 accent-blue-500" />
              <span className="text-white font-medium">
                {parsed.length} temuan ditemukan
                <span className="text-gray-400 text-sm ml-2">({format})</span>
              </span>
            </div>
            <span className="text-gray-400 text-sm">{selected.size} dipilih</span>
          </div>

          {/* Severity summary */}
          <div className="flex gap-2 flex-wrap">
            {["critical","high","medium","low","info"].map(sev => {
              const count = parsed.filter(v => v.severity === sev).length
              if (!count) return null
              return (
                <span key={sev} className={`px-2 py-0.5 rounded text-xs font-bold uppercase text-white ${SEVERITY_COLORS[sev]}`}>
                  {sev} {count}
                </span>
              )
            })}
          </div>

          {/* Vuln list */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {parsed.map((v, i) => (
              <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${selected.has(i) ? "border-blue-700/50 bg-blue-950/20" : "border-gray-800 bg-gray-900 hover:border-gray-600"}`}>
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)}
                  className="w-4 h-4 accent-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase text-white shrink-0 ${SEVERITY_COLORS[v.severity]}`}>
                      {v.severity}
                    </span>
                    <span className="text-white text-sm truncate">{v.title}</span>
                  </div>
                  {(v.host || v.port) && (
                    <p className="text-gray-500 text-xs mt-0.5 font-mono">
                      {v.host}{v.port ? `:${v.port}` : ""}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>

          <button onClick={handleImport} disabled={importing || selected.size === 0}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition">
            {importing ? "Mengimport..." : `Import ${selected.size} Temuan`}
          </button>
        </div>
      )}
    </div>
  )
}