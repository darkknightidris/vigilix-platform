"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function ProjectActions({ project }: { project: any }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [loading, setLoading] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleUpdate = async () => {
    if (!name.trim()) return
    setLoading(true)
    await supabase.from("projects").update({ name: name.trim() }).eq("id", project.id)
    setLoading(false)
    setEditing(false)
    router.refresh()
  }

  const handleDelete = async () => {
    setLoading(true)
    await supabase.from("projects").delete().eq("id", project.id)
    router.push("/projects")
  }

  if (editing) return (
    <div className="flex items-center gap-2">
      <input value={name} onChange={e => setName(e.target.value)}
        className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 w-48" />
      <button onClick={handleUpdate} disabled={loading}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition">
        {loading ? "..." : "Simpan"}
      </button>
      <button onClick={() => setEditing(false)}
        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition">
        Batal
      </button>
    </div>
  )

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setEditing(true)}
        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
        Edit
      </button>
      {showDelete ? (
        <div className="flex items-center gap-2">
          <span className="text-red-400 text-sm">Yakin hapus?</span>
          <button onClick={handleDelete} disabled={loading}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition">
            {loading ? "..." : "Hapus"}
          </button>
          <button onClick={() => setShowDelete(false)}
            className="px-3 py-1.5 bg-gray-700 text-gray-300 text-sm rounded-lg transition">
            Batal
          </button>
        </div>
      ) : (
        <button onClick={() => setShowDelete(true)}
          className="px-3 py-1.5 bg-gray-800 hover:bg-red-900/50 hover:text-red-400 text-gray-300 text-sm rounded-lg transition">
          Hapus
        </button>
      )}
    </div>
  )
}