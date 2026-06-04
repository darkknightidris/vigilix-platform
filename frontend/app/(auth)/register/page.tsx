"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [orgName, setOrgName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async () => {
    setLoading(true)
    setError("")
    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    const slug = orgName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    const { data: org, error: orgError } = await supabase
      .from("organizations").insert({ name: orgName, slug: `${slug}-${Date.now()}` })
      .select().single()
    if (orgError) { setError(orgError.message); setLoading(false); return }
    await supabase.from("profiles").update({ organization_id: org.id, role: "owner" }).eq("id", data.user!.id)
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl border border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-2">Buat Akun Vigilix</h1>
        <p className="text-gray-400 mb-6 text-sm">Trial 30 hari gratis, tanpa kartu kredit</p>
        {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nama Lengkap</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="Budi Santoso" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nama Organisasi / Tim</label>
            <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="PT Keamanan Digital" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="budi@perusahaan.com" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="Minimal 8 karakter" />
          </div>
          <button onClick={handleRegister} disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition">
            {loading ? "Memproses..." : "Buat Akun Gratis"}
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-gray-500">
          Sudah punya akun? <Link href="/login" className="text-blue-400 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  )
}
