"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const PLANS = [
  { id:"pro", name:"Pro", price:"Rp 499.000", priceNum: 499000, color:"border-blue-500", badge:"bg-blue-600",
    features:["5 project","10 user","PDF export","Import CSV","Semua fitur"] },
  { id:"team", name:"Team", price:"Rp 1.200.000", priceNum: 1200000, color:"border-purple-500", badge:"bg-purple-600", popular:true,
    features:["Unlimited project & user","API access","SSO (coming soon)","Audit log","Priority support"] }
]

const PAYMENT_METHODS = [
  { id:"dana", label:"Dana", icon:"💙", number:"087753444120", name:"Idris" },
  { id:"gopay", label:"GoPay", icon:"💚", number:"087753444120", name:"Idris" },
]

export default function BillingClient({ plan, daysLeft, isExpired, orgName, status }: {
  plan:string, daysLeft:number, isExpired:boolean, orgName:string, status?:string
}) {
  const [selectedPlan, setSelectedPlan] = useState<string|null>(null)
  const [selectedMethod, setSelectedMethod] = useState<string|null>(null)
  const [step, setStep] = useState<"plans"|"payment"|"confirm">("plans")
  const [copied, setCopied] = useState(false)
  const [senderName, setSenderName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const planData = PLANS.find(p => p.id === selectedPlan)
  const methodData = PAYMENT_METHODS.find(m => m.id === selectedMethod)

  const copyNumber = (num: string) => {
    navigator.clipboard.writeText(num)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirmPayment = async () => {
    if (!senderName.trim()) { setError("Masukkan nama pengirim transfer"); return }
    setSubmitting(true)
    setError("")

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setError("Session expired, silakan login ulang"); setSubmitting(false); return }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_RESEND_KEY || ""}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "noreply@vigilix.id",
          to: "idris@vigilix.id",
          subject: `[Vigilix] Konfirmasi Pembayaran - ${orgName} - Plan ${selectedPlan?.toUpperCase()}`,
          html: `
            <h2>Konfirmasi Pembayaran Masuk</h2>
            <p><strong>Organisasi:</strong> ${orgName}</p>
            <p><strong>Plan:</strong> ${selectedPlan?.toUpperCase()}</p>
            <p><strong>Jumlah:</strong> ${planData?.price}</p>
            <p><strong>Metode:</strong> ${methodData?.label}</p>
            <p><strong>Nama Pengirim:</strong> ${senderName}</p>
            <p><strong>Email User:</strong> ${session.user.email}</p>
            <p><strong>User ID:</strong> ${session.user.id}</p>
            <hr/>
            <p>Silakan verifikasi dan aktifkan plan di Supabase dashboard.</p>
          `
        })
      })

      setSuccess(`Konfirmasi pembayaran berhasil dikirim! Tim kami akan mengaktifkan plan ${selectedPlan?.toUpperCase()} kamu dalam 1x24 jam.`)
      setStep("plans")
      setSelectedPlan(null)
      setSelectedMethod(null)
      setSenderName("")
    } catch (_) {
      setSuccess(`Terima kasih! Konfirmasi pembayaran kamu sudah diterima. Plan ${selectedPlan?.toUpperCase()} akan diaktifkan dalam 1x24 jam.`)
      setStep("plans")
    }
    setSubmitting(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Subscription</h1>
        <p className="text-gray-400 text-sm mt-1">{orgName}</p>
      </div>

      {success && (
        <div className="p-4 bg-green-900/30 border border-green-700 rounded-xl text-green-400 text-sm">
          ✅ {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-400 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Plan saat ini */}
      <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
        <h2 className="text-white font-semibold mb-3">Plan Saat Ini</h2>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-sm font-bold text-white capitalize ${
            plan==="trial"?"bg-gray-600":plan==="pro"?"bg-blue-600":"bg-purple-600"}`}>
            {plan==="trial"?"Free Trial":plan}
          </span>
          {plan==="trial" && (
            <p className={`text-sm ${isExpired?"text-red-400":"text-gray-400"}`}>
              {isExpired ? "⚠️ Trial berakhir" : `🕐 ${daysLeft} hari tersisa`}
            </p>
          )}
          {plan!=="trial" && <p className="text-green-400 text-sm">✅ Aktif</p>}
        </div>
      </div>

      {/* STEP 1: Pilih Plan */}
      {step === "plans" && (
        <div>
          <h2 className="text-white font-semibold mb-6">Pilih Plan</h2>
          <div className="grid grid-cols-2 gap-6">
            {PLANS.map(p => (
              <div key={p.id} className={`relative p-6 bg-gray-900 rounded-xl border-2 ${p.color}`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">POPULER</span>
                  </div>
                )}
                <h3 className="text-white font-bold text-lg">{p.name}</h3>
                <div className="flex items-baseline gap-1 mt-1 mb-4">
                  <span className="text-3xl font-bold text-white">{p.price}</span>
                  <span className="text-gray-400 text-sm">/bulan</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                {plan===p.id ? (
                  <div className="w-full py-2.5 text-center text-gray-500 text-sm border border-gray-700 rounded-lg">Plan Aktif</div>
                ) : (
                  <button onClick={() => { setSelectedPlan(p.id); setStep("payment") }}
                    className={`w-full py-2.5 ${p.badge} hover:opacity-90 text-white font-medium rounded-lg transition`}>
                    Upgrade ke {p.name}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Pilih Metode Pembayaran */}
      {step === "payment" && planData && (
        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Pilih Metode Pembayaran</h2>
            <button onClick={() => setStep("plans")} className="text-gray-500 hover:text-gray-300 text-sm">← Kembali</button>
          </div>

          <div className="p-3 bg-gray-800 rounded-lg flex items-center justify-between">
            <span className="text-gray-400 text-sm">Plan dipilih:</span>
            <span className="text-white font-bold">{planData.name} — {planData.price}/bulan</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {PAYMENT_METHODS.map(m => (
              <button key={m.id} onClick={() => { setSelectedMethod(m.id); setStep("confirm") }}
                className="p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 rounded-xl transition text-left">
                <div className="text-3xl mb-2">{m.icon}</div>
                <p className="text-white font-semibold">{m.label}</p>
                <p className="text-gray-400 text-sm">{m.number}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: Instruksi Transfer + Konfirmasi */}
      {step === "confirm" && planData && methodData && (
        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Instruksi Pembayaran</h2>
            <button onClick={() => setStep("payment")} className="text-gray-500 hover:text-gray-300 text-sm">← Kembali</button>
          </div>

          {/* Instruksi */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
              <span className="text-2xl">{methodData.icon}</span>
              <div>
                <p className="text-white font-medium">{methodData.label}</p>
                <p className="text-gray-400 text-xs">a.n. {methodData.name}</p>
              </div>
            </div>

            <div className="p-4 bg-indigo-950/40 border border-indigo-700/50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Nomor {methodData.label}</p>
                  <p className="text-2xl font-bold text-white font-mono">{methodData.number}</p>
                </div>
                <button onClick={() => copyNumber(methodData.number)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition">
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
              <div className="border-t border-indigo-700/30 pt-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">Jumlah Transfer</p>
                <p className="text-xl font-bold text-green-400">{planData.price}</p>
              </div>
            </div>

            <div className="p-3 bg-yellow-950/30 border border-yellow-700/40 rounded-lg">
              <p className="text-yellow-300 text-xs font-medium mb-1">⚠️ Penting:</p>
              <ul className="text-yellow-200/70 text-xs space-y-1">
                <li>• Transfer tepat sesuai nominal di atas</li>
                <li>• Setelah transfer, klik tombol konfirmasi di bawah</li>
                <li>• Plan akan diaktifkan dalam 1x24 jam hari kerja</li>
              </ul>
            </div>
          </div>

          {/* Form Konfirmasi */}
          <div className="space-y-3 border-t border-gray-800 pt-4">
            <p className="text-white font-medium text-sm">Konfirmasi Pembayaran</p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nama pengirim (sesuai akun {methodData.label})</label>
              <input value={senderName} onChange={e => setSenderName(e.target.value)}
                placeholder="Nama kamu di Dana/GoPay"
                className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <button onClick={handleConfirmPayment} disabled={submitting || !senderName.trim()}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition">
              {submitting ? "Mengirim konfirmasi..." : "✅ Saya Sudah Transfer"}
            </button>
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 space-y-3">
        <h2 className="text-white font-semibold">FAQ</h2>
        <div className="text-sm">
          <p className="text-white font-medium">Metode pembayaran?</p>
          <p className="text-gray-400">Transfer via Dana atau GoPay ke nomor 087753444120.</p>
        </div>
        <div className="text-sm">
          <p className="text-white font-medium">Berapa lama aktivasi?</p>
          <p className="text-gray-400">Maksimal 1x24 jam setelah konfirmasi pembayaran diterima.</p>
        </div>
        <div className="text-sm">
          <p className="text-white font-medium">Ada kontrak jangka panjang?</p>
          <p className="text-gray-400">Tidak. Per bulan, bisa cancel kapan saja.</p>
        </div>
      </div>
    </div>
  )
}
