"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

export default function EditProjectPage() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: project } = await supabase
        .from("projects").select("*").eq("id", id).single()
      if (!project) { router.push("/projects"); return }
      setName(project.name || "")
      setDescription(project.description || "")
      setLoading(false)
    }
    load()
  }, [id])

  const handleSave = async () => {
    if (!name.trim()) { setError("Nama project wajib diisi"); return }
    setSaving(true)
    setError("")
    const { error: updateError } = await supabase
      .from("projects")
      .update({ name: name.trim(), description: description.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (updateError) { setError(updateError.message); setSaving(false); return }
    router.push(`/projects/${id}`)
  }

  const handleDelete = async () => {
    if (!confirm("Hapus project ini beserta semua temuannya? Tindakan ini tidak bisa dibatalkan.")) return
    setDeleting(true)
    const { error: deleteError } = await supabase.from("projects").delete().eq("id", id)
    if (deleteError) { setError(deleteError.message); setDeleting(false); return }
    router.push("/projects")
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Memuat...</div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-gray-400 hover:text-white transition">←</Link>
        <h1 className="text-2xl font-bold text-white">Edit Project</h1>
      </div>
      <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 space-y-4">
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>
        )}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Nama Project *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="Nama project" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Deskripsi (opsional)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Deskripsi singkat scope dan tujuan project" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition">
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
          <Link href={`/projects/${id}`}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition">
            Batal
          </Link>
        </div>
      </div>

      {/* Danger zone */}
      <div className="p-6 bg-gray-900 rounded-xl border border-red-900/50 space-y-3">
        <h2 className="text-red-400 font-semibold text-sm uppercase tracking-wider">Danger Zone</h2>
        <p className="text-gray-400 text-sm">Menghapus project akan menghapus semua temuan di dalamnya secara permanen.</p>
        <button onClick={handleDelete} disabled={deleting}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
          {deleting ? "Menghapus..." : "Hapus Project"}
        </button>
      </div>
    </div>
  )
}