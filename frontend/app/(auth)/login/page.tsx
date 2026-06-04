"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

const API = process.env.NEXT_PUBLIC_API_URL || "https://vigilix-platform-production.up.railway.app"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [totpRequired, setTotpRequired] = useState(false)
  const [totpCode, setTotpCode] = useState("")
  const [totpToken, setTotpToken] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError("")
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    // Cek apakah user punya 2FA aktif
    const token = data.session?.access_token
    if (token) {
      try {
        const res = await fetch(`${API}/api/totp/status`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const status = await res.json()
        if (status.totp_enabled) {
          setTotpToken(token)
          setTotpRequired(true)
          setLoading(false)
          return
        }
      } catch (_) {}
    }

    router.push("/dashboard")
  }

  const handleTotpVerify = async () => {
    if (totpCode.length !== 6) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API}/api/totp/verify-login`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${totpToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ code: totpCode })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      router.push("/dashboard")
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  // ── TOTP Screen ──────────────────────────────────────────────────────────
  if (totpRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-blue-400 text-xl">🛡️</span>
            <span className="font-bold text-white text-lg">Vigilix</span>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-950/60 rounded-lg text-indigo-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Verifikasi 2FA</h1>
              <p className="text-gray-400 text-sm">Masukkan kode dari authenticator app</p>
            </div>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>
          )}
          <div className="space-y-4">
            <input
              type="text" maxLength={6} value={totpCode}
              onChange={e => setTotpCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleTotpVerify()}
              placeholder="000000"
              className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white text-center font-mono text-2xl tracking-[0.5em] focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <button onClick={handleTotpVerify} disabled={loading || totpCode.length !== 6}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition">
              {loading ? "Memverifikasi..." : "Verifikasi"}
            </button>
            <button onClick={() => { setTotpRequired(false); setTotpCode(""); setError("") }}
              className="w-full text-sm text-gray-500 hover:text-gray-400 transition">
              ← Kembali ke Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Login Screen ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-blue-400 text-xl">🛡️</span>
          <span className="font-bold text-white text-lg">Vigilix</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Login to Vigilix</h1>
        <p className="text-gray-400 text-sm mb-6">Welcome back!</p>
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="your@email.com" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm text-gray-400">Password</label>
              <Link href="/forgot-password" className="text-xs text-blue-400 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="Password" />
          </div>
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition">
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-400 hover:underline">Start free trial</Link>
        </p>
      </div>
    </div>
  )
}
