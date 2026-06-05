"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || ""

export default function AdminPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState<string|null>(null)
  const [toast, setToast] = useState<{msg:string,ok:boolean}|null>(null)
  const [key, setKey] = useState("")
  const [authed, setAuthed] = useState(false)
  const router = useRouter()

  const showToast = (msg: string, ok = true) => {
    setToast({msg,ok})
    setTimeout(() => setToast(null), 4000)
  }

  const load = async (adminKey: string) => {
    setLoading(true)
    const res = await fetch("/api/admin", {
      headers: { "Authorization": `Bearer ${adminKey}` }
    })
    if (!res.ok) { showToast("Unauthorized", false); setLoading(false); return }
    const data = await res.json()
    setPayments(data.payments || [])
    setLoading(false)
    setAuthed(true)
  }

  const handleLogin = async () => {
    await load(key)
  }

  const handleActivate = async (payment: any) => {
    setActivating(payment.id)
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        userId: payment.user_id,
        plan: payment.plan,
        paymentId: payment.id
      })
    })
    const data = await res.json()
    if (data.ok) {
      showToast(`Plan ${payment.plan.toUpperCase()} aktif untuk ${payment.org_name}`)
      setPayments(prev => prev.map(p => p.id === payment.id ? {...p, status: "activated"} : p))
    } else {
      showToast(data.error || "Gagal aktivasi", false)
    }
    setActivating(null)
  }

  const planColor: Record<string,string> = {
    pro: "bg-blue-900/40 text-blue-300",
    team: "bg-purple-900/40 text-purple-300"
  }

  const statusColor: Record<string,string> = {
    pending: "bg-yellow-900/40 text-yellow-300",
    activated: "bg-green-900/40 text-green-300"
  }

  if (!authed) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h1 className="text-white font-bold text-xl text-center">Vigilix Admin</h1>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          placeholder="Admin secret key"
          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
        />
        <button onClick={handleLogin} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition">
          Login
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium border shadow-lg ${toast.ok ? "bg-green-950 border-green-700 text-green-300" : "bg-red-950 border-red-700 text-red-300"}`}>
          {toast.msg}
        </div>
      )}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-white font-bold text-2xl">Konfirmasi Pembayaran</h1>
          <button onClick={() => load(key)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="text-gray-400 text-center py-12">Memuat...</div>
        ) : payments.length === 0 ? (
          <div className="text-gray-400 text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
            Belum ada konfirmasi pembayaran
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map(p => (
              <div key={p.id} className="p-5 bg-gray-900 rounded-xl border border-gray-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{p.org_name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${planColor[p.plan] || ""}`}>{p.plan}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[p.status] || ""}`}>{p.status}</span>
                    </div>
                    <div className="text-sm text-gray-400 space-y-0.5">
                      <p>Email: {p.user_email}</p>
                      <p>Pengirim: {p.sender_name} via {p.method}</p>
                      <p>Jumlah: <span className="text-green-400 font-semibold">{p.amount}</span></p>
                      <p className="text-xs text-gray-600">{new Date(p.created_at).toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                  {p.status === "pending" && (
                    <button
                      onClick={() => handleActivate(p)}
                      disabled={activating === p.id}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition whitespace-nowrap"
                    >
                      {activating === p.id ? "Mengaktifkan..." : "Aktifkan Plan"}
                    </button>
                  )}
                  {p.status === "activated" && (
                    <span className="px-4 py-2 bg-green-900/30 text-green-400 text-sm font-medium rounded-lg border border-green-700/30">
                      Sudah Aktif
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
