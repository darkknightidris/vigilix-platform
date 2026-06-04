"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!email.trim()) { setError("Email wajib diisi"); return }
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-blue-400 text-xl">🛡️</span>
          <span className="font-bold text-white text-lg">Vigilix</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Forgot Password</h1>
        <p className="text-gray-400 text-sm mb-6">
          Enter your email and we will send you a reset link.
        </p>

        {sent ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
              <p className="text-green-400 font-medium text-sm">✅ Reset link sent!</p>
              <p className="text-green-300/70 text-xs mt-1">
                Check your email at <strong>{email}</strong> and click the link to reset your password.
              </p>
            </div>
            <Link href="/login"
              className="block w-full py-2.5 text-center bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg transition text-sm">
              Back to Login
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="your@email.com" />
            </div>
            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <p className="text-center text-sm text-gray-500">
              Remember your password?{" "}
              <Link href="/login" className="text-blue-400 hover:underline">Login</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}