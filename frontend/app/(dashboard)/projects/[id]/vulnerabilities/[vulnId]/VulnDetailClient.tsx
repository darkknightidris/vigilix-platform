"use client"
import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import RemediationTracker from "@/components/RemediationTracker"

const severityOptions = ["critical","high","medium","low","info"]
const severityColors: Record<string,string> = {
  critical:"bg-red-600", high:"bg-orange-500", medium:"bg-yellow-500",
  low:"bg-blue-500", info:"bg-gray-600"
}

export default function VulnDetailClient({
  vuln, projectId, comments, attachments, logs, members, currentUserId, userRole
}: {
  vuln: any, projectId: string, comments: any[], attachments: any[],
  logs: any[], members: any[], currentUserId: string, userRole: string
}) {
  const [data, setData] = useState(vuln)
  const [editing, setEditing] = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [localComments, setLocalComments] = useState(comments)
  const [localAttachments, setLocalAttachments] = useState(attachments)
  const [toast, setToast] = useState<string|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const isAdminOrOwner = ["owner","admin"].includes(userRole?.toLowerCase())

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const saveField = async (field: string, value: any) => {
    setSaving(true)
    const { error } = await supabase.from("vulnerabilities").update({ [field]: value }).eq("id", data.id)
    if (!error) {
      setData((prev: any) => ({ ...prev, [field]: value }))
      await supabase.from("activity_logs").insert({
        vulnerability_id: data.id, user_id: currentUserId,
        action: "edit", detail: `Mengubah ${field}`
      })
      showToast("Tersimpan")
    }
    setEditing(null)
    setSaving(false)
  }

  const handleComment = async () => {
    if (!comment.trim()) return
    setSubmitting(true)
    const { data: c } = await supabase.from("comments").insert({
      vulnerability_id: data.id, author_id: currentUserId, content: comment.trim(),
    }).select("*, profiles(full_name)").single()
    await supabase.from("activity_logs").insert({
      vulnerability_id: data.id, user_id: currentUserId, action: "comment", detail: "Menambahkan komentar"
    })
    if (c) setLocalComments((prev: any) => [...prev, c])
    setComment("")
    setSubmitting(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `${data.id}/${Date.now()}-${file.name}`
    const { data: upload, error } = await supabase.storage.from("attachments").upload(path, file)
    if (!error && upload) {
      const { data: { publicUrl } } = supabase.storage.from("attachments").getPublicUrl(path)
      const { data: att } = await supabase.from("attachments").insert({
        vulnerability_id: data.id, file_url: publicUrl,
        file_name: file.name, file_size: file.size, uploaded_by: currentUserId,
      }).select().single()
      await supabase.from("activity_logs").insert({
        vulnerability_id: data.id, user_id: currentUserId,
        action: "attachment", detail: `Upload file: ${file.name}`
      })
      if (att) setLocalAttachments((prev: any) => [att, ...prev])
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium border shadow-lg bg-green-950 border-green-700 text-green-300">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href={`/projects/${projectId}`} className="text-gray-400 hover:text-white transition mt-1">
          &larr;
        </Link>
        <div className="flex-1 space-y-2">
          {/* Severity badge - editable */}
          {isAdminOrOwner && editing === "severity" ? (
            <div className="flex gap-2 flex-wrap">
              {severityOptions.map(s => (
                <button key={s} onClick={() => saveField("severity", s)}
                  className={`px-3 py-1 rounded text-xs font-bold uppercase text-white transition ${severityColors[s]} ${data.severity === s ? "ring-2 ring-white" : "opacity-70 hover:opacity-100"}`}>
                  {s}
                </button>
              ))}
              <button onClick={() => setEditing(null)} className="px-2 py-1 text-xs text-gray-400 hover:text-white">Batal</button>
            </div>
          ) : (
            <span
              onClick={() => isAdminOrOwner && setEditing("severity")}
              className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase text-white ${severityColors[data.severity] || "bg-gray-600"} ${isAdminOrOwner ? "cursor-pointer hover:opacity-80" : ""}`}>
              {data.severity}
            </span>
          )}
          {/* Title - editable */}
          {isAdminOrOwner && editing === "title" ? (
            <div className="flex gap-2">
              <input autoFocus defaultValue={data.title}
                onKeyDown={e => { if (e.key === "Enter") saveField("title", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditing(null) }}
                className="flex-1 text-xl font-bold bg-gray-800 border border-blue-500 rounded-lg px-3 py-1 text-white focus:outline-none" />
              <button onClick={() => setEditing(null)} className="text-xs text-gray-400 hover:text-white px-2">Batal</button>
            </div>
          ) : (
            <h1
              onClick={() => isAdminOrOwner && setEditing("title")}
              className={`text-xl font-bold text-white ${isAdminOrOwner ? "cursor-pointer hover:text-blue-400 transition" : ""}`}>
              {data.title}
              {isAdminOrOwner && <span className="ml-2 text-xs text-gray-600 font-normal">✏️</span>}
            </h1>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-xs mb-1">Status</p>
          <p className="text-white font-medium capitalize">{data.status?.replace("_"," ")}</p>
        </div>
        <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-xs mb-1">CVSS Score</p>
          <p className="text-white font-medium">{data.cvss_score || "N/A"}</p>
        </div>
        <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-xs mb-1">Deadline</p>
          <p className="text-white font-medium text-sm">
            {data.due_date ? new Date(data.due_date).toLocaleDateString("en-US") : "N/A"}
          </p>
        </div>
      </div>

      {/* Description - editable */}
      <div className="p-5 bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-white font-semibold">Description</h2>
          {isAdminOrOwner && editing !== "description" && (
            <button onClick={() => setEditing("description")} className="text-xs text-gray-500 hover:text-blue-400 transition">✏️ Edit</button>
          )}
        </div>
        {isAdminOrOwner && editing === "description" ? (
          <div className="space-y-2">
            <textarea autoFocus defaultValue={data.description || ""}
              id="desc-input" rows={5}
              className="w-full px-3 py-2 bg-gray-800 border border-blue-500 rounded-lg text-white text-sm focus:outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={() => saveField("description", (document.getElementById("desc-input") as HTMLTextAreaElement).value)}
                disabled={saving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded-lg transition">
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setEditing(null)} className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition">Batal</button>
            </div>
          </div>
        ) : (
          <p
            onClick={() => isAdminOrOwner && setEditing("description")}
            className={`text-gray-300 text-sm leading-relaxed whitespace-pre-wrap ${isAdminOrOwner ? "cursor-pointer hover:text-white transition" : ""} ${!data.description ? "text-gray-600 italic" : ""}`}>
            {data.description || "Belum ada deskripsi. Klik untuk menambah."}
          </p>
        )}
      </div>

      {/* Steps to Reproduce - editable */}
      <div className="p-5 bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-white font-semibold">Steps to Reproduce</h2>
          {isAdminOrOwner && editing !== "steps" && (
            <button onClick={() => setEditing("steps")} className="text-xs text-gray-500 hover:text-blue-400 transition">✏️ Edit</button>
          )}
        </div>
        {isAdminOrOwner && editing === "steps" ? (
          <div className="space-y-2">
            <textarea autoFocus defaultValue={data.steps_to_reproduce || ""}
              id="steps-input" rows={6}
              className="w-full px-3 py-2 bg-gray-800 border border-blue-500 rounded-lg text-white text-sm font-mono focus:outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={() => saveField("steps_to_reproduce", (document.getElementById("steps-input") as HTMLTextAreaElement).value)}
                disabled={saving}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded-lg transition">
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button onClick={() => setEditing(null)} className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition">Batal</button>
            </div>
          </div>
        ) : (
          <pre
            onClick={() => isAdminOrOwner && setEditing("steps")}
            className={`text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-gray-800 p-4 rounded-lg ${isAdminOrOwner ? "cursor-pointer hover:bg-gray-750 transition" : ""} ${!data.steps_to_reproduce ? "text-gray-600 italic" : ""}`}>
            {data.steps_to_reproduce || "Belum ada langkah reproduksi. Klik untuk menambah."}
          </pre>
        )}
      </div>

      {/* CVSS Vector */}
      {data.cvss_vector && (
        <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-xs mb-1">CVSS Vector</p>
          <p className="text-gray-300 text-xs font-mono break-all">{data.cvss_vector}</p>
        </div>
      )}

      {/* Remediation */}
      <RemediationTracker
        vulnId={data.id}
        initialStatus={data.remediation_status ?? "open"}
        initialSlaDeadline={data.sla_deadline}
        initialSlaNote={data.sla_note}
        isAdminOrOwner={isAdminOrOwner}
      />

      {/* Attachments */}
      <div className="p-5 bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-semibold">Screenshot & Attachment ({localAttachments.length})</h2>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
            {uploading ? "Uploading..." : "+ Upload"}
          </button>
          <input ref={fileRef} type="file" accept="image/*,.pdf,.txt,.doc,.docx" onChange={handleUpload} className="hidden" />
        </div>
        {localAttachments.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Belum ada attachment</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {localAttachments.map((att: any) => (
              <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                className="block p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-500 transition">
                {isImage(att.file_name) ? (
                  <img src={att.file_url} alt={att.file_name} className="w-full h-24 object-cover rounded mb-2" />
                ) : (
                  <div className="w-full h-24 bg-gray-700 rounded mb-2 flex items-center justify-center">
                    <span className="text-2xl">📄</span>
                  </div>
                )}
                <p className="text-gray-300 text-xs truncate">{att.file_name}</p>
                <p className="text-gray-500 text-xs">{(att.file_size/1024).toFixed(1)} KB</p>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="p-5 bg-gray-900 rounded-xl border border-gray-800">
        <h2 className="text-white font-semibold mb-4">Komentar ({localComments.length})</h2>
        <div className="space-y-3 mb-4">
          {localComments.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">Belum ada komentar</p>
          ) : localComments.map((c: any) => (
            <div key={c.id} className="p-3 bg-gray-800 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-blue-400 text-xs font-medium">{c.profiles?.full_name || "Unknown"}</span>
                <span className="text-gray-500 text-xs">{new Date(c.created_at).toLocaleString("id-ID")}</span>
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
            placeholder="Tulis komentar..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 resize-none" />
          <button onClick={handleComment} disabled={submitting || !comment.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition self-end">
            {submitting ? "..." : "Kirim"}
          </button>
        </div>
      </div>

      {/* Activity Log */}
      <div className="p-5 bg-gray-900 rounded-xl border border-gray-800">
        <h2 className="text-white font-semibold mb-4">Activity Log</h2>
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Belum ada aktivitas</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                <div>
                  <p className="text-gray-300 text-sm">
                    <span className="text-blue-400">{log.profiles?.full_name || "User"}</span>
                    {" "}{log.detail}
                  </p>
                  <p className="text-gray-500 text-xs">{new Date(log.created_at).toLocaleString("id-ID")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
