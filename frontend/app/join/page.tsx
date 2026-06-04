"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

function JoinForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "ready" | "success" | "error">("loading")
  const [invitation, setInvitation] = useState<any>(null)
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const supabase = createClient()

  useEffect(() => {
    if (!token) { setStatus("error"); return }
    supabase
      .from("invitations")
      .select("*, organizations(name)")
      .eq("token", token)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus("error"); return }
        setInvitation(data)
        setStatus("ready")
      })
  }, [token])

  const handleAccept = async () => {
    setStatus("loading")
    const { data, error } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: { data: { full_name: fullName } }
    })
    if (error) { setStatus("error"); return }

    await supabase.from("profiles")
      .update({ organization_id: invitation.organization_id, role: invitation.role })
      .eq("id", data.user!.id)

    await supabase.from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("token", token)

    setStatus("success")
    setTimeout(() => router.push("/dashboard"), 2000)
  }

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      Memverifikasi undangan...
    </div>
  )
  if (status === "error") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-red-400">
      Link tidak valid atau sudah kadaluarsa.
    </div>
  )
  if (status === "success") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-green-400">
      Berhasil bergabung! Mengarahkan ke dashboard...
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl border border-gray-800">
        <h1 className="text-xl font-bold text-white mb-2">Terima Undangan</h1>
        <p className="text-gray-400 text-sm mb-6">
          Kamu diundang ke <strong className="text-white">{invitation?.organizations?.name}</strong> sebagai {invitation?.role}
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nama Lengkap</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Nama kamu" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input type="email" value={invitation?.email} disabled
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Buat Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Minimal 8 karakter" />
          </div>
          <button onClick={handleAccept}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">
            Bergabung ke {invitation?.organizations?.name}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>}>
      <JoinForm />
    </Suspense>
  )
}
