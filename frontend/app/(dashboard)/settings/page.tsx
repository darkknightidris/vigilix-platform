"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const [fullName, setFullName] = useState("")
  const [orgName, setOrgName] = useState("")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data } = await supabase
        .from("profiles").select("*, organizations(*)")
        .eq("id", user.id).single()
      if (data) { setProfile(data); setFullName(data.full_name || ""); setOrgName(data.organizations?.name || "") }
    }
    load()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id)
    if (["owner", "admin"].includes(profile?.role)) {
      await supabase.from("organizations").update({ name: orgName }).eq("id", profile.organization_id)
    }
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>
      <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 space-y-4">
        <h2 className="text-white font-semibold">Profil</h2>
        {saved && <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm">Perubahan tersimpan!</div>}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Nama Lengkap</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" />
        </div>
        {["owner", "admin"].includes(profile?.role) && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nama Organisasi</label>
            <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500" />
          </div>
        )}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Role</label>
          <input type="text" value={profile?.role || ""} disabled
            className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-500 capitalize" />
        </div>
        <button onClick={handleSave} disabled={loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition">
          {loading ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  )
}