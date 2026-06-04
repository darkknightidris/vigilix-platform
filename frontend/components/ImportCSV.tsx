"use client"
import { useState, useRef } from "react"
import Papa from "papaparse"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function ImportCSV({ projectId }: { projectId: string }) {
  const [preview, setPreview] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreview(results.data.slice(0, 5) as any[])
      }
    })
  }

  const mapSeverity = (s: string): string => {
    const lower = s?.toLowerCase() || ""
    if (lower.includes("critical")) return "critical"
    if (lower.includes("high")) return "high"
    if (lower.includes("medium") || lower.includes("med")) return "medium"
    if (lower.includes("low")) return "low"
    return "info"
  }

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setImporting(true)
    setError("")

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[]
        const vulns = rows.map(row => ({
          title: row["Issue name"] || row["Name"] || row["title"] || row["vulnerability"] || "Untitled",
          severity: mapSeverity(row["Severity"] || row["severity"] || row["Risk"] || ""),
          description: row["Issue detail"] || row["Description"] || row["description"] || null,
          steps_to_reproduce: row["Remediation detail"] || row["Steps"] || null,
          project_id: projectId,
          reported_by: user.id,
          status: "open",
        }))

        const { error: insertError } = await supabase.from("vulnerabilities").insert(vulns)
        if (insertError) {
          setError(insertError.message)
        } else {
          setDone(true)
          setTimeout(() => { router.refresh(); router.push(`/projects/${projectId}`) }, 1500)
        }
        setImporting(false)
      }
    })
  }

  return (
    <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 space-y-4">
      <div>
        <h2 className="text-white font-semibold">Import dari CSV</h2>
        <p className="text-gray-400 text-sm mt-1">Support format export Burp Suite, Nessus, atau CSV custom</p>
      </div>

      {error && <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>}
      {done && <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm">Import berhasil! Mengarahkan...</div>}

      <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-gray-500 transition cursor-pointer"
        onClick={() => fileRef.current?.click()}>
        <p className="text-gray-400 text-sm">Klik untuk pilih file CSV</p>
        <p className="text-gray-600 text-xs mt-1">Kolom yang dikenali: Issue name, Severity, Issue detail, Remediation detail</p>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      </div>

      {preview.length > 0 && (
        <div>
          <p className="text-gray-400 text-sm mb-2">Preview ({preview.length} baris pertama):</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  {Object.keys(preview[0]).slice(0,4).map(k => (
                    <th key={k} className="text-left text-gray-400 pb-2 pr-4">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    {Object.values(row).slice(0,4).map((v: any, j) => (
                      <td key={j} className="text-gray-300 py-2 pr-4 truncate max-w-32">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={handleImport} disabled={importing}
            className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition">
            {importing ? "Mengimport..." : `Import ${preview.length}+ Temuan`}
          </button>
        </div>
      )}
    </div>
  )
}