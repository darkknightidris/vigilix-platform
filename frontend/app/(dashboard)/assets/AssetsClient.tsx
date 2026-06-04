"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

const TYPE_LABELS: Record<string, string> = { ip: "IP Address", domain: "Domain", service: "Service" }
const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-900/50 text-green-400",
  inactive: "bg-gray-700 text-gray-400",
  unknown: "bg-yellow-900/50 text-yellow-400",
}
const TYPE_COLORS: Record<string, string> = {
  ip: "bg-blue-900/50 text-blue-400",
  domain: "bg-purple-900/50 text-purple-400",
  service: "bg-orange-900/50 text-orange-400",
}

interface Asset {
  id: string; name: string; type: string; ip_address: string | null;
  hostname: string | null; port: number | null; protocol: string | null;
  os: string | null; technology: string | null; status: string;
  notes: string | null; project_ids: string[]; created_at: string;
}

interface Project { id: string; name: string }

const EMPTY_FORM = {
  name: "", type: "ip", ip_address: "", hostname: "", port: "",
  protocol: "", os: "", technology: "", status: "active", notes: "", project_ids: [] as string[],
}

export default function AssetsClient({
  initialAssets, projects, organizationId, isAdmin,
}: {
  initialAssets: Asset[]; projects: Project[]; organizationId: string; isAdmin: boolean;
}) {
  const supabase = createClient()
  const [assets, setAssets] = useState<Asset[]>(initialAssets)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const openNew = () => {
    setForm({ ...EMPTY_FORM })
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (a: Asset) => {
    setForm({
      name: a.name, type: a.type, ip_address: a.ip_address || "",
      hostname: a.hostname || "", port: a.port?.toString() || "",
      protocol: a.protocol || "", os: a.os || "", technology: a.technology || "",
      status: a.status, notes: a.notes || "", project_ids: a.project_ids || [],
    })
    setEditId(a.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("Nama asset wajib diisi", false); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      type: form.type,
      ip_address: form.ip_address || null,
      hostname: form.hostname || null,
      port: form.port ? parseInt(form.port) : null,
      protocol: form.protocol || null,
      os: form.os || null,
      technology: form.technology || null,
      status: form.status,
      notes: form.notes || null,
      project_ids: form.project_ids,
      organization_id: organizationId,
      updated_at: new Date().toISOString(),
    }
    if (editId) {
      const { error } = await supabase.from("assets").update(payload).eq("id", editId)
      if (error) { showToast("Gagal update asset", false) }
      else {
        setAssets(prev => prev.map(a => a.id === editId ? { ...a, ...payload } : a))
        showToast("Asset diupdate")
        setShowForm(false)
      }
    } else {
      const { data, error } = await supabase.from("assets").insert(payload).select().single()
      if (error) { showToast("Gagal tambah asset", false) }
      else {
        setAssets(prev => [data, ...prev])
        showToast("Asset ditambahkan")
        setShowForm(false)
      }
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus asset ini?")) return
    setDeleting(id)
    const { error } = await supabase.from("assets").delete().eq("id", id)
    if (error) { showToast("Gagal hapus asset", false) }
    else { setAssets(prev => prev.filter(a => a.id !== id)); showToast("Asset dihapus") }
    setDeleting(null)
  }

  const toggleProject = (pid: string) => {
    setForm(prev => ({
      ...prev,
      project_ids: prev.project_ids.includes(pid)
        ? prev.project_ids.filter(p => p !== pid)
        : [...prev.project_ids, pid],
    }))
  }

  const filtered = assets.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || a.name.toLowerCase().includes(q) ||
      (a.ip_address || "").toLowerCase().includes(q) ||
      (a.hostname || "").toLowerCase().includes(q) ||
      (a.technology || "").toLowerCase().includes(q)
    const matchType = !filterType || a.type === filterType
    const matchStatus = !filterStatus || a.status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm font-medium border shadow-lg ${toast.ok ? "bg-green-950/90 border-green-700 text-green-300" : "bg-red-950/90 border-red-700 text-red-300"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Management</h1>
          <p className="text-gray-400 text-sm mt-1">{assets.length} asset terdaftar</p>
        </div>
        {isAdmin && (
          <button onClick={openNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
            + Tambah Asset
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, IP, domain, teknologi..."
          className="flex-1 min-w-48 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="">Semua Tipe</option>
          <option value="ip">IP Address</option>
          <option value="domain">Domain</option>
          <option value="service">Service</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="">Semua Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {["ip", "domain", "service"].map(t => (
          <div key={t} className="p-4 bg-gray-900 rounded-xl border border-gray-800 text-center">
            <p className="text-2xl font-bold text-white">{assets.filter(a => a.type === t).length}</p>
            <p className="text-gray-400 text-xs mt-1">{TYPE_LABELS[t]}</p>
          </div>
        ))}
      </div>

      {/* Asset list */}
      {filtered.length === 0 ? (
        <div className="p-12 bg-gray-900 rounded-xl border border-gray-800 text-center">
          <p className="text-4xl mb-3">🖥️</p>
          <p className="text-white font-medium">Belum ada asset</p>
          {isAdmin && (
            <button onClick={openNew}
              className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
              + Tambah Asset Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const expanded = expandedId === a.id
            const linkedProjects = projects.filter(p => (a.project_ids || []).includes(p.id))
            return (
              <div key={a.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => setExpandedId(expanded ? null : a.id)}>
                    <div className="mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[a.type]}`}>
                        {TYPE_LABELS[a.type]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{a.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {a.ip_address && <span className="text-gray-400 text-xs font-mono">{a.ip_address}</span>}
                        {a.hostname && <span className="text-gray-400 text-xs font-mono">{a.hostname}</span>}
                        {a.port && <span className="text-gray-500 text-xs">{a.protocol ? `${a.protocol}/` : ""}{a.port}</span>}
                        {a.technology && <span className="text-blue-400 text-xs">{a.technology}</span>}
                        {a.os && <span className="text-purple-400 text-xs">{a.os}</span>}
                      </div>
                      {linkedProjects.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {linkedProjects.map(p => (
                            <span key={p.id} className="px-1.5 py-0.5 bg-indigo-950/50 border border-indigo-800/50 text-indigo-400 text-xs rounded">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>
                      {a.status}
                    </span>
                    {isAdmin && (
                      <>
                        <button onClick={() => openEdit(a)}
                          className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-950/30 rounded-lg transition text-xs">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition text-xs">
                          {deleting === a.id ? "..." : "🗑"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {expanded && a.notes && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-800">
                    <p className="text-gray-400 text-sm mt-3">{a.notes}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-white font-semibold">{editId ? "Edit Asset" : "Tambah Asset"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-xl">x</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Nama Asset *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="contoh: Web Server Production"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              {/* Type */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Tipe</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="ip">IP Address</option>
                  <option value="domain">Domain / Hostname</option>
                  <option value="service">Port / Service</option>
                </select>
              </div>
              {/* IP + Hostname */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">IP Address</label>
                  <input value={form.ip_address} onChange={e => setForm(p => ({ ...p, ip_address: e.target.value }))}
                    placeholder="192.168.1.1"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Hostname / Domain</label>
                  <input value={form.hostname} onChange={e => setForm(p => ({ ...p, hostname: e.target.value }))}
                    placeholder="example.com"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              {/* Port + Protocol */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Port</label>
                  <input type="number" value={form.port} onChange={e => setForm(p => ({ ...p, port: e.target.value }))}
                    placeholder="80"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Protocol</label>
                  <select value={form.protocol} onChange={e => setForm(p => ({ ...p, protocol: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="">-</option>
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="ssh">SSH</option>
                    <option value="ftp">FTP</option>
                    <option value="smtp">SMTP</option>
                  </select>
                </div>
              </div>
              {/* OS + Technology */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">OS</label>
                  <input value={form.os} onChange={e => setForm(p => ({ ...p, os: e.target.value }))}
                    placeholder="Ubuntu 22.04"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Technology / Stack</label>
                  <input value={form.technology} onChange={e => setForm(p => ({ ...p, technology: e.target.value }))}
                    placeholder="Nginx, Laravel, MySQL"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              {/* Status */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              {/* Linked projects */}
              {projects.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Link ke Project</label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {projects.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.project_ids.includes(p.id)} onChange={() => toggleProject(p.id)}
                          className="w-4 h-4 accent-indigo-500" />
                        <span className="text-sm text-gray-300">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {/* Notes */}
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3} placeholder="Informasi tambahan..."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-800 flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
                {saving ? "Menyimpan..." : editId ? "Update" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}