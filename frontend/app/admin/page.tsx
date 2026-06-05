"use client"
import { useState } from "react"

export default function AdminPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [orgs, setOrgs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activating, setActivating] = useState<string|null>(null)
  const [toast, setToast] = useState<{msg:string,ok:boolean}|null>(null)
  const [key, setKey] = useState("")
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<"payments"|"orgs">("payments")
  const [editingOrg, setEditingOrg] = useState<string|null>(null)
  const [editPlan, setEditPlan] = useState("")

  const showToast = (msg: string, ok = true) => {
    setToast({msg,ok})
    setTimeout(() => setToast(null), 4000)
  }

  const load = async (adminKey: string) => {
    setLoading(true)
    const res = await fetch("/api/admin", {
      headers: { "Authorization": `Bearer ${adminKey}` }
    })
    if (!res.ok) { showToast("Key salah atau unauthorized", false); setLoading(false); return }
    const data = await res.json()
    setPayments(data.payments || [])
    setOrgs(data.orgs || [])
    setLoading(false)
    setAuthed(true)
  }

  const callApi = async (body: any) => {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify(body)
    })
    return res.json()
  }

  const handleActivate = async (payment: any) => {
    setActivating(payment.id)
    const data = await callApi({ action: "activate", userId: payment.user_id, plan: payment.plan, paymentId: payment.id })
    if (data.ok) {
      showToast(`Plan ${payment.plan.toUpperCase()} aktif untuk ${payment.org_name}`)
      setPayments(prev => prev.map(p => p.id === payment.id ? {...p, status: "activated"} : p))
    } else { showToast(data.error || "Gagal", false) }
    setActivating(null)
  }

  const handleSetPlan = async (orgId: string, orgName: string, plan: string) => {
    setActivating(orgId)
    const data = await callApi({ action: "set_plan", orgId, plan })
    if (data.ok) {
      showToast(`Plan ${orgName} diubah ke ${plan.toUpperCase()}`)
      setOrgs(prev => prev.map(o => o.id === orgId ? {...o, plan} : o))
      setEditingOrg(null)
    } else { showToast(data.error || "Gagal", false) }
    setActivating(null)
  }

  const planColor: Record<string,string> = {
    free: "bg-gray-800 text-gray-400",
    trial: "bg-yellow-900/40 text-yellow-300",
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
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <h1 className="text-white font-bold text-xl">Vigilix Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Panel manajemen internal</p>
        </div>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === "Enter" && load(key)}
          placeholder="Admin secret key"
          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
        />
        {toast && <p className="text-red-400 text-sm text-center">{toast.msg}</p>}
        <button onClick={() => load(key)} disabled={loading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition">
          {loading ? "Memuat..." : "Masuk"}
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <h1 className="text-white font-bold text-xl">Vigilix Admin</h1>
          </div>
          <button onClick={() => load(key)} disabled={loading} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>

        <div className="flex gap-2 border-b border-gray-800 pb-0">
          <button onClick={() => setTab("payments")} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === "payments" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"}`}>
            Konfirmasi Pembayaran
            {payments.filter(p => p.status === "pending").length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-yellow-600 text-white text-xs rounded-full">
                {payments.filter(p => p.status === "pending").length}
              </span>
            )}
          </button>
          <button onClick={() => setTab("orgs")} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === "orgs" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"}`}>
            Semua Organisasi ({orgs.length})
          </button>
        </div>

        {tab === "payments" && (
          <div className="space-y-3">
            {payments.length === 0 ? (
              <div className="text-gray-400 text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
                Belum ada konfirmasi pembayaran
              </div>
            ) : payments.map(p => (
              <div key={p.id} className="p-5 bg-gray-900 rounded-xl border border-gray-800">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{p.org_name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${planColor[p.plan] || ""}`}>{p.plan}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[p.status] || ""}`}>{p.status}</span>
                    </div>
                    <div className="text-sm text-gray-400 space-y-0.5">
                      <p>Email: {p.user_email}</p>
                      <p>Pengirim: <span className="text-white">{p.sender_name}</span> via {p.method}</p>
                      <p>Jumlah: <span className="text-green-400 font-semibold">{p.amount}</span></p>
                      <p className="text-xs text-gray-600">{new Date(p.created_at).toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {p.status === "pending" && (
                      <button onClick={() => handleActivate(p)} disabled={activating === p.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
                        {activating === p.id ? "Mengaktifkan..." : "Aktifkan Plan"}
                      </button>
                    )}
                    {p.status === "activated" && (
                      <span className="px-4 py-2 bg-green-900/30 text-green-400 text-sm font-medium rounded-lg border border-green-700/30 text-center">
                        Sudah Aktif
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "orgs" && (
          <div className="space-y-3">
            {orgs.length === 0 ? (
              <div className="text-gray-400 text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
                Belum ada organisasi
              </div>
            ) : orgs.map(org => (
              <div key={org.id} className="p-5 bg-gray-900 rounded-xl border border-gray-800">
                <div className="flex justify-between items-center gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{org.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${planColor[org.plan] || ""}`}>{org.plan}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      <p>Owner: <span className="text-gray-300">{org.owner_name}</span></p>
                      <p className="text-xs text-gray-600">{new Date(org.created_at).toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {editingOrg === org.id ? (
                      <>
                        <select value={editPlan} onChange={e => setEditPlan(e.target.value)}
                          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">
                          <option value="free">Free</option>
                          <option value="trial">Trial</option>
                          <option value="pro">Pro</option>
                          <option value="team">Team</option>
                        </select>
                        <button onClick={() => handleSetPlan(org.id, org.name, editPlan)} disabled={activating === org.id}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition">
                          {activating === org.id ? "..." : "Simpan"}
                        </button>
                        <button onClick={() => setEditingOrg(null)}
                          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition">
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingOrg(org.id); setEditPlan(org.plan) }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition">
                          Edit Plan
                        </button>
                        {(org.plan === "pro" || org.plan === "team") && (
                          <button onClick={() => handleSetPlan(org.id, org.name, "free")} disabled={activating === org.id}
                            className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 text-red-400 text-sm rounded-lg transition">
                            Batalkan
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
