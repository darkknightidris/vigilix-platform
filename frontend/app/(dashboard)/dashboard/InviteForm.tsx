"use client"
import { useState } from "react"

export default function InviteForm() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleInvite = async () => {
    if (!email) return
    setStatus("loading")
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    })
    const data = await res.json()
    if (data.success) {
      setStatus("success")
      setMessage(`Undangan terkirim ke ${email}`)
      setEmail("")
    } else {
      setStatus("error")
      setMessage(data.error || "Gagal mengirim undangan")
    }
  }

  return (
    <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
      <h2 className="text-white font-semibold mb-4">Invite Anggota Tim</h2>
      {status === "success" && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm">{message}</div>
      )}
      {status === "error" && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">{message}</div>
      )}
      <div className="flex gap-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="email@perusahaan.com"
          className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button
          onClick={handleInvite}
          disabled={status === "loading"}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition"
        >
          {status === "loading" ? "Mengirim..." : "Kirim"}
        </button>
      </div>
    </div>
  )
}