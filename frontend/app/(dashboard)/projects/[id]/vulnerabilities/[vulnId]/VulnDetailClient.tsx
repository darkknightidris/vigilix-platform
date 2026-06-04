"use client"
import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import RemediationTracker from "@/components/RemediationTracker"

export default function VulnDetailClient({
  vuln, projectId, comments, attachments, logs, members, currentUserId, userRole
}: {
  vuln: any, projectId: string, comments: any[], attachments: any[],
  logs: any[], members: any[], currentUserId: string, userRole: string
}) {
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [localComments, setLocalComments] = useState(comments)
  const [localAttachments, setLocalAttachments] = useState(attachments)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleComment = async () => {
    if (!comment.trim()) return
    setSubmitting(true)
    const { data } = await supabase.from("comments").insert({
      vulnerability_id: vuln.id,
      author_id: currentUserId,
      content: comment.trim(),
    }).select("*, profiles(full_name)").single()

    await supabase.from("activity_logs").insert({
      vulnerability_id: vuln.id,
      user_id: currentUserId,
      action: "comment",
      detail: "Menambahkan komentar",
    })

    if (data) setLocalComments(prev => [...prev, data])
    setComment("")
    setSubmitting(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `${vuln.id}/${Date.now()}-${file.name}`
    const { data: upload, error } = await supabase.storage
      .from("attachments").upload(path, file)

    if (!error && upload) {
      const { data: { publicUrl } } = supabase.storage
        .from("attachments").getPublicUrl(path)

      const { data: att } = await supabase.from("attachments").insert({
        vulnerability_id: vuln.id,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: currentUserId,
      }).select().single()

      await supabase.from("activity_logs").insert({
        vulnerability_id: vuln.id,
        user_id: currentUserId,
        action: "attachment",
        detail: `Upload file: ${file.name}`,
      })

      if (att) setLocalAttachments(prev => [att, ...prev])
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
  const isAdminOrOwner = ["owner", "admin"].includes(userRole?.toLowerCase())

  return (
    <div className="space-y-6">
      {/* Remediation Tracking */}
      <RemediationTracker
        vulnId={vuln.id}
        initialStatus={vuln.remediation_status ?? "open"}
        initialSlaDeadline={vuln.sla_deadline}
        initialSlaNote={vuln.sla_note}
        isAdminOrOwner={isAdminOrOwner}
      />

      {/* Attachments */}
      <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-semibold">Screenshot & Attachment ({localAttachments.length})</h2>
          <button onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
            {uploading ? "Uploading..." : "+ Upload"}
          </button>
          <input ref={fileRef} type="file" accept="image/*,.pdf,.txt,.doc,.docx" onChange={handleUpload} className="hidden" />
        </div>
        {localAttachments.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Belum ada attachment</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {localAttachments.map((att: any) => (
              <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                className="block p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-500 transition">
                {isImage(att.file_name) ? (
                  <img src={att.file_url} alt={att.file_name}
                    className="w-full h-24 object-cover rounded mb-2" />
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
      <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
        <h2 className="text-white font-semibold mb-4">Komentar ({localComments.length})</h2>
        <div className="space-y-3 mb-4">
          {localComments.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">Belum ada komentar</p>
          ) : (
            localComments.map((c: any) => (
              <div key={c.id} className="p-3 bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-blue-400 text-xs font-medium">
                    {c.profiles?.full_name || "Unknown"}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {new Date(c.created_at).toLocaleString("id-ID")}
                  </span>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{c.content}</p>
              </div>
            ))
          )}
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
      <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
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
