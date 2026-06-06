"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

const API = process.env.NEXT_PUBLIC_API_URL || "https://vigilix-platform-production.up.railway.app"

interface Props { token: string | null }

type Step = "idle" | "setup" | "verifying" | "enabled" | "disabling"

export default function TwoFactorSection({ token }: Props) {
  const supabase = createClient()
  const [enabled, setEnabled] = useState(false)
  const [step, setStep] = useState<Step>("idle")
  const [qrCode, setQrCode] = useState("")
  const [secret, setSecret] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  // Cek status 2FA saat mount
  useEffect(() => {
    const check = async () => {
      if (!token) return
      try {
        const res = await fetch(`${API}/api/totp/status`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setEnabled(data.totp_enabled || false)
        setStep(data.totp_enabled ? "enabled" : "idle")
      } catch (_) {}
      setChecking(false)
    }
    check()
  }, [token])

  const handleSetup = async () => {
    if (!token) return
    setLoading(true); setError("")
    try {
      const res = await fetch(`${API}/api/totp/setup`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setQrCode(data.qr_code)
      setSecret(data.secret)
      setStep("setup")
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const handleVerifyEnable = async () => {
    if (!token || code.length !== 6) return
    setLoading(true); setError("")
    try {
      const res = await fetch(`${API}/api/totp/verify-and-enable`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setEnabled(true); setStep("enabled"); setCode("")
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const handleDisable = async () => {
    if (!token || code.length !== 6) return
    setLoading(true); setError("")
    try {
      const res = await fetch(`${API}/api/totp/disable`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setEnabled(false); setStep("idle"); setCode("")
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  if (checking) return (
    <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
      <span className="w-3 h-3 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
      Memuat status 2FA...
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-300 font-medium">Two-Factor Authentication</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {enabled ? "2FA aktif via authenticator app" : "Tambah lapisan keamanan dengan TOTP"}
          </p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
          enabled
            ? "bg-green-950/40 border-green-700/50 text-green-400"
            : "bg-gray-800 border-gray-700 text-gray-500"
        }`}>
          {enabled ? "✓ Aktif" : "Nonaktif"}
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* IDLE — belum setup */}
      {step === "idle" && (
        <button onClick={handleSetup} disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
          {loading ? "Memuat..." : "Setup 2FA"}
        </button>
      )}

      {/* SETUP — tampilkan QR code */}
      {step === "setup" && (
        <div className="space-y-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <p className="text-sm text-gray-300 font-medium">Scan QR Code ini dengan Google Authenticator atau Authy:</p>
          {qrCode && (
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48 rounded-lg bg-white p-2" />
            </div>
          )}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Atau masukkan kode manual:</p>
            <code className="text-xs font-mono bg-gray-900 px-3 py-1.5 rounded-lg text-indigo-300 border border-gray-700 select-all">
              {secret}
            </code>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Masukkan 6-digit kode dari app untuk verifikasi:</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" maxLength={6} value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-indigo-500"
              />
              <button onClick={handleVerifyEnable} disabled={loading || code.length !== 6}
                className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
                {loading ? "..." : "Aktifkan"}
              </button>
            </div>
          </div>
          <button onClick={() => { setStep("idle"); setCode(""); setError("") }}
            className="text-xs text-gray-500 hover:text-gray-400 transition">
            Batal
          </button>
        </div>
      )}

      {/* ENABLED — tampilkan opsi disable */}
      {step === "enabled" && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 p-3 bg-green-950/20 border border-green-800/40 rounded-lg">
            <span className="text-green-400 text-sm">🔒</span>
            <p className="text-xs text-green-300">Akun kamu dilindungi dengan 2FA. Setiap login akan meminta kode dari authenticator app.</p>
          </div>
          <button onClick={() => setStep("disabling")}
            className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-red-400 text-sm font-medium rounded-lg transition">
            Nonaktifkan 2FA
          </button>
        </div>
      )}

      {/* DISABLING — konfirmasi dengan kode */}
      {step === "disabling" && (
        <div className="space-y-3 p-4 bg-red-950/20 rounded-xl border border-red-800/40">
          <p className="text-sm text-red-300 font-medium">Masukkan kode dari authenticator untuk nonaktifkan 2FA:</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text" maxLength={6} value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="flex-1 px-4 py-2 bg-gray-900 border border-red-800/50 rounded-lg text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-red-500"
            />
            <button onClick={handleDisable} disabled={loading || code.length !== 6}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
              {loading ? "..." : "Nonaktifkan"}
            </button>
          </div>
          <button onClick={() => { setStep("enabled"); setCode(""); setError("") }}
            className="text-xs text-gray-500 hover:text-gray-400 transition">
            Batal
          </button>
        </div>
      )}
    </div>
  )
}

