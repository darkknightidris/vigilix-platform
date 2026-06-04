"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function NewProjectPage() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Nama project wajib diisi"); return }
    setLoading(true)
    setError("")
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }
    const { data: profile } = await supabase
      .from("profiles").select("organization_id").eq("id", user.id).single()
    const { error: insertError } = await supabase.from("projects").insert({
      name: name.trim(),
      description: description.trim() || null,
      organization_id: profile?.organization_id,
      created_by: user.id,
    })
    if (insertError) { setError(insertError.message); setLoading(false); return }
    router.push("/projects")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="text-gray-400 hover:text-white transition">←</Link>
        <h1 className="text-2xl font-bold text-white">Buat Project Baru</h1>
      </div>
      <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 space-y-4">
        {error && <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Nama Project *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="Contoh: Pentest Web App PT Maju 2024" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Deskripsi (opsional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Deskripsi singkat scope dan tujuan project" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={handleSubmit} disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition">
            {loading ? "Menyimpan..." : "Buat Project"}
          </button>
          <Link href="/projects" className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition">
            Batal
          </Link>
        </div>
      </div>
    </div>
  )
}