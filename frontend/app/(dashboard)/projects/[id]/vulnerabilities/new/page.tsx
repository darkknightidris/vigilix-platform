"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import CVSSCalculator from "@/components/CVSSCalculator"

const severityOptions = ["critical","high","medium","low","info"]
const severityColors: Record<string,string> = {
  critical:"bg-red-600",high:"bg-orange-500",medium:"bg-yellow-500",low:"bg-blue-500",info:"bg-gray-500"
}

export default function NewVulnerabilityPage({ params }: { params: { id: string } }) {
  const [title, setTitle] = useState("")
  const [severity, setSeverity] = useState("medium")
  const [cvssScore, setCvssScore] = useState(0)
  const [cvssVector, setCvssVector] = useState("")
  const [description, setDescription] = useState("")
  const [steps, setSteps] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleCVSS = (score: number, vector: string, sev: string) => {
    setCvssScore(score)
    setCvssVector(vector)
    if (score > 0) setSeverity(sev.toLowerCase())
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Judul temuan wajib diisi"); return }
    setLoading(true)
    setError("")
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }
    const { error: insertError } = await supabase.from("vulnerabilities").insert({
      title: title.trim(),
      severity,
      cvss_score: cvssScore || null,
      cvss_vector: cvssVector || null,
      description: description.trim() || null,
      steps_to_reproduce: steps.trim() || null,
      project_id: params.id,
      reported_by: user.id,
      status: "open",
    })
    if (insertError) { setError(insertError.message); setLoading(false); return }
    router.push(`/projects/${params.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${params.id}`} className="text-gray-400 hover:text-white transition">←</Link>
        <h1 className="text-2xl font-bold text-white">Tambah Temuan Baru</h1>
      </div>

      <div className="space-y-4">
        {error && <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>}

        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 space-y-4">
          <h2 className="text-white font-semibold">Informasi Dasar</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Judul Temuan *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="Contoh: SQL Injection pada endpoint /api/users" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Severity</label>
            <div className="flex gap-2">
              {severityOptions.map(s => (
                <button key={s} onClick={() => setSeverity(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition ${
                    severity === s
                      ? severityColors[s] + " text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
          <h2 className="text-white font-semibold mb-4">CVSS v3.1 Score</h2>
          <CVSSCalculator onChange={handleCVSS} />
        </div>

        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 space-y-4">
          <h2 className="text-white font-semibold">Detail Temuan</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Deskripsi</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Jelaskan temuan ini secara detail..." />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Langkah Reproduksi</label>
            <textarea value={steps} onChange={e => setSteps(e.target.value)} rows={4}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="1. Buka halaman login&#10;2. Masukkan payload...&#10;3. Observe response" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition">
            {loading ? "Menyimpan..." : "Simpan Temuan"}
          </button>
          <Link href={`/projects/${params.id}`}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition">
            Batal
          </Link>
        </div>
      </div>
    </div>
  )
}