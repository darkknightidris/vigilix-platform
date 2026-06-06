"use client"
import AnalyticsDashboard from "@/components/AnalyticsDashboard"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import AssignDeadlineForm from "./AssignDeadlineForm"
import GeneratePDFButton from "./GeneratePDFButton"

const severityColors: Record<string,string> = {
  critical:"bg-red-600",high:"bg-orange-500",medium:"bg-yellow-500",low:"bg-blue-500",info:"bg-gray-600"
}
const statusColors: Record<string,string> = {
  open:"bg-red-900/50 text-red-400",
  in_progress:"bg-yellow-900/50 text-yellow-400",
  fixed:"bg-green-900/50 text-green-400",
  closed:"bg-gray-700 text-gray-400"
}

export default function ProjectDetailClient({ project, vulns: initialVulns, members, isAdmin, orgName, projectId, counts, userId, orgPlan }: {
  project: any, vulns: any[], members: any[], isAdmin: boolean, orgName: string, projectId: string, counts: Record<string,number>, userId: string, orgPlan: string
}) {
  const [vulns, setVulns] = useState(initialVulns)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [toast, setToast] = useState<{msg:string,ok:boolean}|null>(null)
  const [shareUrl, setShareUrl] = useState<string|null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [aiModal, setAiModal] = useState<{vulnId:string,title:string}|null>(null)
  const [aiResult, setAiResult] = useState<string|null>(null)
  const [aiModel, setAiModel] = useState<string|null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const showToast = (msg: string, ok = true) => {
    setToast({msg,ok})
    setTimeout(() => setToast(null), 3000)
  }

  const handleAiFix = async (vulnId: string, title: string) => {
    setAiModal({vulnId, title})
    setAiResult(null)
    setAiModel(null)
    setAiLoading(true)
    try {
      const res = await fetch("/api/ai-fix", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ vulnId, userId })
      })
      const data = await res.json()
      if (data.error) {
        setAiResult("Gagal mendapatkan saran AI: " + data.error)
      } else {
        setAiResult(data.suggestion)
        setAiModel(data.model)
      }
    } catch (e) {
      setAiResult("Terjadi kesalahan. Coba lagi.")
    }
    setAiLoading(false)
  }

  const handleShare = async () => {
    setShareLoading(true)
    setShowShareModal(true)
    const { data: existing } = await supabase
      .from("shared_reports").select("token").eq("project_id", projectId).maybeSingle()
    if (existing?.token) {
      setShareUrl(`${window.location.origin}/report/${existing.token}`)
      setShareLoading(false)
      return
    }
    const token = crypto.randomUUID()
    const { error } = await supabase.from("shared_reports").insert({
      project_id: projectId, token, view_count: 0,
    })
    if (error) { showToast("Gagal membuat link", false); setShowShareModal(false) }
    else setShareUrl(`${window.location.origin}/report/${token}`)
    setShareLoading(false)
  }

  const handleCopy = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === vulns.length) setSelected(new Set())
    else setSelected(new Set(vulns.map(v => v.id)))
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Hapus ${selected.size} temuan? Tindakan ini tidak bisa dibatalkan.`)) return
    setDeleting(true)
    const ids = Array.from(selected)
    const { error } = await supabase.from("vulnerabilities").delete().in("id", ids)
    if (error) { showToast("Gagal menghapus temuan", false) }
    else {
      setVulns(prev => prev.filter(v => !ids.includes(v.id)))
      setSelected(new Set())
      showToast(`${ids.length} temuan berhasil dihapus`)
    }
    setDeleting(false)
  }

  const handleBulkStatus = async () => {
    if (!bulkStatus) return
    setUpdating(true)
    const ids = Array.from(selected)
    const { error } = await supabase.from("vulnerabilities").update({ status: bulkStatus }).in("id", ids)
    if (error) { showToast("Gagal update status", false) }
    else {
      setVulns(prev => prev.map(v => ids.includes(v.id) ? {...v, status: bulkStatus} : v))
      setSelected(new Set())
      setBulkStatus("")
      showToast(`${ids.length} temuan diupdate ke "${bulkStatus.replace("_"," ")}"`)
    }
    setUpdating(false)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium border shadow-lg ${toast.ok ? "bg-green-950/90 border-green-700 text-green-300" : "bg-red-950/90 border-red-700 text-red-300"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-gray-400 hover:text-white transition">
            &larr;
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            {project.description && <p className="text-gray-400 text-sm mt-1">{project.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <GeneratePDFButton projectId={projectId} projectName={project.name} orgName={orgName} />
          <button onClick={handleShare} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition flex items-center gap-1.5">
            Share
          </button>
          <Link href={`/projects/${projectId}/compliance`} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
            Compliance
          </Link>
          <Link href={`/projects/${projectId}/kanban`} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
            Kanban
          </Link>
          <Link href={`/projects/${projectId}/scanner`} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
            Scanner
          </Link>
          <Link href={`/projects/${projectId}/import`} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
            Import CSV
          </Link>
          {isAdmin && (
            <Link href={`/projects/${projectId}/edit`} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Severity counts */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(counts).map(([sev, count]) => (
          <div key={sev} className="p-4 bg-gray-900 rounded-xl border border-gray-800 text-center">
            <div className={`inline-block w-2 h-2 rounded-full mb-2 ${severityColors[sev]}`} />
            <p className="text-white font-bold text-xl">{count}</p>
            <p className="text-gray-400 text-xs capitalize">{sev}</p>
          </div>
        ))}
      </div>

      <AnalyticsDashboard projectId={projectId} />

      {/* Bulk action bar */}
      {selected.size > 0 && isAdmin && (
        <div className="flex items-center gap-3 p-3 bg-indigo-950/40 border border-indigo-700/50 rounded-xl flex-wrap">
          <span className="text-indigo-300 text-sm font-medium">{selected.size} dipilih</span>
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500">
              <option value="">Ubah status...</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="fixed">Fixed</option>
              <option value="closed">Closed</option>
            </select>
            <button onClick={handleBulkStatus} disabled={!bulkStatus || updating} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg transition">
              {updating ? "Mengupdate..." : "Update Status"}
            </button>
            <button onClick={handleBulkDelete} disabled={deleting} className="px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm rounded-lg transition">
              {deleting ? "Menghapus..." : `Hapus (${selected.size})`}
            </button>
            <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Header list */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {isAdmin && vulns.length > 0 && (
            <input type="checkbox" checked={selected.size === vulns.length && vulns.length > 0} onChange={toggleAll} className="w-4 h-4 accent-indigo-500 cursor-pointer" />
          )}
          <h2 className="text-white font-semibold">Temuan ({vulns.length})</h2>
        </div>
        <Link href={`/projects/${projectId}/vulnerabilities/new`} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          + Tambah Temuan
        </Link>
      </div>

      {/* Vuln list */}
      {vulns.length === 0 ? (
        <div className="p-12 bg-gray-900 rounded-xl border border-gray-800 text-center">
          <p className="text-4xl mb-3">ðŸ“‹</p>
          <p className="text-white font-medium">Belum ada temuan</p>
          <Link href={`/projects/${projectId}/vulnerabilities/new`} className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
            + Tambah Temuan Pertama
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {vulns.map((v: any) => (
            <div key={v.id} className={`p-5 bg-gray-900 rounded-xl border transition ${selected.has(v.id) ? "border-indigo-500/60 bg-indigo-950/20" : "border-gray-800 hover:border-gray-600"}`}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {isAdmin && (
                    <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggleSelect(v.id)} className="w-4 h-4 mt-1.5 accent-indigo-500 cursor-pointer shrink-0" />
                  )}
                  <Link href={`/projects/${projectId}/vulnerabilities/${v.id}`} className="flex items-start gap-3 flex-1 group">
                    <span className={`mt-1 px-2 py-0.5 rounded text-xs font-bold uppercase text-white shrink-0 ${severityColors[v.severity] || "bg-gray-600"}`}>
                      {v.severity}
                    </span>
                    <div>
                      <p className="text-white font-medium group-hover:text-blue-400 transition">{v.title}</p>
                      {v.cvss_score && <p className="text-gray-400 text-xs mt-0.5">CVSS: {v.cvss_score}</p>}
                    </div>
                  </Link>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[v.status] || ""}`}>
                      {v.status?.replace("_"," ")}
                    </span>
                    <span className="text-gray-500 text-xs">{new Date(v.created_at).toLocaleDateString("id-ID")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAiFix(v.id, v.title)}
                      className="px-2 py-1 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded-lg transition"
                    >
                      AI Fix
                    </button>
                    {isAdmin && (
                      <Link href={`/projects/${projectId}/vulnerabilities/${v.id}`} className="px-2 py-1 text-gray-400 hover:text-blue-400 hover:bg-blue-950/30 rounded-lg transition text-xs border border-gray-700">
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <AssignDeadlineForm vuln={v} members={members || []} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Fix Modal */}
      {aiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-white font-semibold">AI Fix Suggestion</h2>
                <p className="text-gray-400 text-sm mt-1">{aiModal.title}</p>
                {aiModel && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded-full">
                    Powered by {aiModel}
                  </span>
                )}
              </div>
              <button onClick={() => setAiModal(null)} className="text-gray-500 hover:text-white text-xl shrink-0">x</button>
            </div>
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">AI sedang menganalisis vulnerability...</p>
              </div>
            ) : (
              <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {aiResult}
              </div>
            )}
            {!aiLoading && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                <p className="text-gray-600 text-xs">
                  {orgPlan === "free" ? "Free plan - upgrade ke Pro untuk Claude Haiku" : orgPlan === "pro" ? "Pro plan - upgrade ke Team untuk Claude Sonnet" : "Team plan - Claude Sonnet aktif"}
                </p>
                <button onClick={() => setAiModal(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-semibold">Share Project</h2>
              <button onClick={() => setShowShareModal(false)} className="text-gray-500 hover:text-white text-xl">x</button>
            </div>
            <p className="text-gray-400 text-sm">Link ini bisa dibuka siapa saja tanpa login. Hanya bisa membaca, tidak bisa mengedit.</p>
            {shareLoading ? (
              <div className="flex items-center justify-center h-16 text-gray-500 text-sm">Membuat link...</div>
            ) : (
              <div className="flex gap-2">
                <input readOnly value={shareUrl || ""} className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-sm font-mono focus:outline-none" />
                <button onClick={handleCopy} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${copied ? "bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            )}
            <p className="text-gray-600 text-xs">Link aktif selamanya sampai dihapus manual.</p>
          </div>
        </div>
      )}
    </div>
  )
}


