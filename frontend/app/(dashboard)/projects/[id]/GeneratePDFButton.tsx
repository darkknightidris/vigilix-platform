"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function GeneratePDFButton({ projectId, projectName, orgName }: {
  projectId: string
  projectName: string
  orgName: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  const handleGenerate = async () => {
    setLoading(true)
    setError("")
    try {
      const { data: vulns } = await supabase
        .from("vulnerabilities").select("*")
        .eq("project_id", projectId).order("severity")

      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("id", user!.id).single()

      const payload = {
        project_name: projectName,
        org_name: orgName,
        prepared_by: profile?.full_name || "Security Team",
        vulnerabilities: (vulns || []).map(v => ({
          title: v.title,
          severity: v.severity,
          status: v.status,
          cvss_score: v.cvss_score,
          description: v.description,
          steps_to_reproduce: v.steps_to_reproduce,
        }))
      }

      const res = await fetch("https://vigilix-platform-production.up.railway.app/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.detail || "Gagal generate PDF")
        setLoading(false)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `report-${projectName}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError("Pastikan server backend jalan di port 8000")
    }
    setLoading(false)
  }

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}
        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
        {loading ? "⏳ Generating..." : "📄 Export PDF"}
      </button>
      {error && <p className="text-red-400 text-xs mt-1 max-w-48">{error}</p>}
    </div>
  )
}