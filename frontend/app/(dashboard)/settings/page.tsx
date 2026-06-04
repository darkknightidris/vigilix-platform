"use client"
import TwoFactorSection from "@/components/TwoFactorSection"
import WebhookSettings from "@/components/WebhookSettings"
import ApiKeySettings from "@/components/ApiKeySettings"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface OrgMember {
  id: string
  full_name: string
  email: string
  role: string
}

// â”€â”€ Icons (inline SVG) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const IconUpload = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
)
const IconTrash = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)
const IconShield = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)
const IconUsers = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const IconBuilding = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)
const IconKey = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)
const IconDanger = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)
const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)
const IconX = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)
const IconCrown = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

// â”€â”€ Toast component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium transition-all
      ${type === "success" ? "bg-green-950 border-green-700 text-green-300" : "bg-red-950 border-red-700 text-red-300"}`}>
      {type === "success" ? <IconCheck /> : <IconX />}
      {message}
    </div>
  )
}

// â”€â”€ Section card wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Section({ icon, title, children, danger = false }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; danger?: boolean
}) {
  return (
    <div className={`rounded-xl border ${danger ? "border-red-800/60 bg-red-950/20" : "border-gray-800 bg-gray-900"} overflow-hidden`}>
      <div className={`flex items-center gap-3 px-6 py-4 border-b ${danger ? "border-red-800/60 bg-red-950/30" : "border-gray-800"}`}>
        <span className={danger ? "text-red-400" : "text-indigo-400"}>{icon}</span>
        <h2 className={`font-semibold text-sm uppercase tracking-wider ${danger ? "text-red-400" : "text-gray-300"}`}>{title}</h2>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  )
}

// â”€â”€ Input field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition placeholder-gray-600"
const disabledInputCls = "w-full px-4 py-2.5 bg-gray-800/40 border border-gray-700/50 rounded-lg text-gray-500 text-sm cursor-not-allowed"

// â”€â”€ Plan badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    trial: "bg-yellow-900/40 text-yellow-300 border-yellow-700/50",
    pro:   "bg-indigo-900/40 text-indigo-300 border-indigo-700/50",
    team:  "bg-purple-900/40 text-purple-300 border-purple-700/50",
    free:  "bg-gray-800 text-gray-400 border-gray-700",
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${colors[plan] || colors.free}`}>
      {plan === "pro" || plan === "team" ? <IconCrown /> : null}
      {plan}
    </span>
  )
}

// â”€â”€ Role badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    owner:  "bg-yellow-900/30 text-yellow-400 border-yellow-700/40",
    admin:  "bg-blue-900/30 text-blue-400 border-blue-700/40",
    member: "bg-gray-800 text-gray-400 border-gray-700/40",
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border capitalize ${colors[role] || colors.member}`}>
      {role === "owner" && <IconCrown />}
      {role}
    </span>
  )
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function SettingsPage() {
  const supabase = createClient()
  const router   = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // profile state
  const [profile, setProfile]   = useState<any>(null)
  const [fullName, setFullName] = useState("")
  const [orgName, setOrgName]   = useState("")
  const [logoUrl, setLogoUrl]   = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword]         = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // members
  const [members, setMembers] = useState<OrgMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  // danger zone
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // 2FA state
  const [twoFAToken, setTwoFAToken] = useState<string | null>(null)

  // loading / toast
  const [saving, setSaving]     = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [kickingId, setKickingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ message, type })

  // â”€â”€ Load profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }

      const { data } = await supabase
        .from("profiles")
        .select("*, organizations(*)")
        .eq("id", user.id)
        .single()

      if (data) {
        const { data: { session } } = await supabase.auth.getSession()
        setTwoFAToken(session?.access_token || null)
        setProfile(data)
        setFullName(data.full_name || "")
        setOrgName(data.organizations?.name || "")
        setLogoUrl(data.organizations?.logo_url || null)
      }
    }
    load()
  }, [])

  // â”€â”€ Load members â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!profile) return
    const loadMembers = async () => {
      setMembersLoading(true)
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("organization_id", profile.organization_id)
        .order("role")

      // get emails from auth (owner only can see)
      if (data) {
        setMembers(data.map((m: any) => ({
          id: m.id,
          full_name: m.full_name || "â€”",
          email: "",
          role: m.role,
        })))
      }
      setMembersLoading(false)
    }
    loadMembers()
  }, [profile])

  // â”€â”€ Logo file picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showToast("Ukuran file maksimal 2MB", "error"); return }
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      showToast("Format file harus PNG, JPG, atau WebP", "error"); return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setLogoUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // â”€â”€ Save profile + logo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Update full_name
      await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id)

      if (["owner", "admin"].includes(profile?.role)) {
        let newLogoUrl = logoUrl

        // Upload logo baru jika ada
        if (logoFile) {
          const ext  = logoFile.name.split(".").pop()
          const path = `${profile.organization_id}/logo.${ext}`
          const { error: uploadErr } = await supabase.storage
            .from("org-logos")
            .upload(path, logoFile, { upsert: true, contentType: logoFile.type })

          if (uploadErr) throw uploadErr

          const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path)
          newLogoUrl = urlData.publicUrl + `?t=${Date.now()}` // cache bust
        }

        // Hapus logo jika dihapus
        if (!logoFile && !logoUrl && logoPreview === null) {
          try {
            const ext = ["png","jpg","jpeg","webp"]
            for (const e of ext) {
              await supabase.storage.from("org-logos").remove([`${profile.organization_id}/logo.${e}`])
            }
          } catch (_) {}
          newLogoUrl = null
        }

        await supabase.from("organizations")
          .update({ name: orgName, logo_url: newLogoUrl })
          .eq("id", profile.organization_id)

        setLogoUrl(newLogoUrl)
        setLogoFile(null)
      }

      showToast("Perubahan berhasil disimpan!")
    } catch (err: any) {
      showToast(err?.message || "Gagal menyimpan", "error")
    } finally {
      setSaving(false)
    }
  }

  // â”€â”€ Change password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { showToast("Password baru tidak cocok", "error"); return }
    if (newPassword.length < 8) { showToast("Password minimal 8 karakter", "error"); return }
    setPwSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      showToast("Password berhasil diubah!")
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("")
    } catch (err: any) {
      showToast(err?.message || "Gagal ubah password", "error")
    } finally {
      setPwSaving(false)
    }
  }

  // â”€â”€ Kick member â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleKickMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Hapus ${memberName} dari organisasi?`)) return
    setKickingId(memberId)
    try {
      await supabase.from("profiles")
        .update({ organization_id: null, role: "member" })
        .eq("id", memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
      showToast(`${memberName} berhasil dikeluarkan`)
    } catch (err: any) {
      showToast(err?.message || "Gagal hapus member", "error")
    } finally {
      setKickingId(null)
    }
  }

  // â”€â”€ Promote/demote member â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await supabase.from("profiles").update({ role: newRole }).eq("id", memberId)
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
      showToast("Role berhasil diubah!")
    } catch (err: any) {
      showToast(err?.message || "Gagal ubah role", "error")
    }
  }

  const isOwnerOrAdmin = ["owner", "admin"].includes(profile?.role)
  const isOwner = profile?.role === "owner"

  const planInfo: Record<string, string> = {
    trial: "30 hari gratis Â· semua fitur",
    pro:   "5 project Â· 10 user Â· PDF export",
    team:  "Unlimited project & user Â· API Â· SSO",
  }

  const trialEndsAt = profile?.organizations?.trial_ends_at
    ? new Date(profile.organizations.trial_ends_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        {profile?.organizations?.plan && (
          <div className="flex items-center gap-2">
            <PlanBadge plan={profile.organizations.plan} />
            {profile.organizations.plan === "trial" && trialEndsAt && (
              <span className="text-xs text-gray-500">s/d {trialEndsAt}</span>
            )}
          </div>
        )}
      </div>

      {/* â”€â”€ 1. Profil â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Section icon={<IconBuilding />} title="Profil & Organisasi">
        <Field label="Nama Lengkap">
          <input className={inputCls} value={fullName}
            onChange={e => setFullName(e.target.value)} placeholder="Nama kamu" />
        </Field>

        {isOwnerOrAdmin && (
          <Field label="Nama Organisasi">
            <input className={inputCls} value={orgName}
              onChange={e => setOrgName(e.target.value)} placeholder="Nama perusahaan / tim" />
          </Field>
        )}

        <Field label="Role">
          <div className={disabledInputCls + " flex items-center"}>
            <RoleBadge role={profile?.role || ""} />
          </div>
        </Field>

        {/* Logo upload â€” owner/admin only */}
        {isOwnerOrAdmin && (
          <Field label="Logo Organisasi">
            <div className="space-y-3">
              {/* Preview */}
              {(logoPreview || logoUrl) ? (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-16 rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center overflow-hidden">
                    <img
                      src={logoPreview || logoUrl!}
                      alt="Logo organisasi"
                      className="max-w-full max-h-full object-contain p-1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-400">
                      {logoFile ? logoFile.name : "Logo tersimpan"}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => fileInputRef.current?.click()}
                        className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition">
                        Ganti
                      </button>
                      <button onClick={handleRemoveLogo}
                        className="text-xs px-3 py-1.5 bg-red-950/40 hover:bg-red-950/60 border border-red-800/50 text-red-400 rounded-lg transition flex items-center gap-1">
                        <IconTrash /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-gray-700 hover:border-indigo-600 rounded-xl text-gray-500 hover:text-indigo-400 transition group">
                  <div className="p-2 bg-gray-800 group-hover:bg-indigo-950/40 rounded-lg transition">
                    <IconUpload />
                  </div>
                  <span className="text-sm">Klik untuk upload logo</span>
                  <span className="text-xs text-gray-600">PNG, JPG, WebP Â· Maks 2MB</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
              <p className="text-xs text-gray-600">
                Logo akan muncul di header & cover page PDF laporan kamu.
              </p>
            </div>
          </Field>
        )}

        <button onClick={handleSaveProfile} disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition flex items-center gap-2">
          {saving ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan...</>
          ) : "Simpan Perubahan"}
        </button>
      </Section>

      {/* â”€â”€ 2. Members â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Section icon={<IconUsers />} title="Anggota Organisasi">
        {membersLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
            <span className="w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
            Memuat anggota...
          </div>
        ) : members.length === 0 ? (
          <p className="text-gray-500 text-sm py-2">Belum ada anggota.</p>
        ) : (
          <div className="space-y-2">
            {members.map(member => (
              <div key={member.id}
                className="flex items-center justify-between p-3 bg-gray-800/60 rounded-lg border border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-900/60 border border-indigo-700/40 flex items-center justify-center text-indigo-300 text-xs font-bold">
                    {(member.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{member.full_name || "â€”"}</p>
                    <RoleBadge role={member.role} />
                  </div>
                </div>

                {/* Actions â€” owner bisa ubah role & kick, tapi tidak bisa kick dirinya sendiri */}
                {isOwner && member.id !== profile?.id && (
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={e => handleChangeRole(member.id, e.target.value)}
                      className="text-xs bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500">
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => handleKickMember(member.id, member.full_name)}
                      disabled={kickingId === member.id}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition disabled:opacity-50">
                      {kickingId === member.id
                        ? <span className="w-4 h-4 border-2 border-gray-600 border-t-red-400 rounded-full animate-spin block" />
                        : <IconTrash />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-600">
          Untuk invite anggota baru, gunakan fitur Invite di halaman Project.
        </p>
      </Section>

      {/* â”€â”€ 3. Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Section icon={<IconKey />} title="Keamanan">
        <p className="text-xs text-gray-500 -mt-1">Ubah password akun kamu.</p>

        <Field label="Password Baru">
          <input type="password" className={inputCls} value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Minimal 8 karakter" />
        </Field>

        <Field label="Konfirmasi Password Baru">
          <input type="password" className={inputCls} value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Ulangi password baru" />
        </Field>

        {newPassword && confirmPassword && newPassword !== confirmPassword && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <IconX /> Password tidak cocok
          </p>
        )}
        {newPassword && confirmPassword && newPassword === confirmPassword && newPassword.length >= 8 && (
          <p className="text-xs text-green-400 flex items-center gap-1.5">
            <IconCheck /> Password cocok
          </p>
        )}

        <button
          onClick={handleChangePassword}
          disabled={pwSaving || !newPassword || newPassword !== confirmPassword || newPassword.length < 8}
          className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition flex items-center gap-2">
          {pwSaving ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan...</>
          ) : <><IconShield /> Ubah Password</>}
        </button>

                <div className="pt-2 border-t border-gray-800">
          <TwoFactorSection token={twoFAToken} />
        </div>
      </Section>

      {/* â”€â”€ 4. Danger Zone (owner only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* ── REST API Keys ── */}
      <Section icon={<span className="text-lg">🔑</span>} title="REST API Keys">
        <p className="text-xs text-gray-500 -mt-1">Akses data Vigilix via REST API. Tersedia untuk plan Team.</p>
        <ApiKeySettings token={twoFAToken} isAdmin={isOwnerOrAdmin} plan={profile?.organizations?.plan || "free"} />
      </Section>

      {/* ── Webhook Integrations ── */}
      <Section icon={<span className="text-lg">🔗</span>} title="Webhook & Integrations">
        <p className="text-xs text-gray-500 -mt-1">Kirim notifikasi otomatis ke Slack, Discord, atau Microsoft Teams.</p>
        <WebhookSettings token={twoFAToken} isAdmin={isOwnerOrAdmin} />
      </Section>

      {isOwner && (
        <Section icon={<IconDanger />} title="Danger Zone" danger>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300 font-medium">Hapus Organisasi</p>
              <p className="text-xs text-red-400/70 mt-0.5">
                Semua project, temuan, dan data akan dihapus permanen. Tidak bisa dibatalkan.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 text-red-400 text-sm font-medium rounded-lg transition whitespace-nowrap">
              Hapus Organisasi
            </button>
          </div>
        </Section>
      )}

      {/* â”€â”€ Delete Confirm Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-red-800/60 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-950/60 rounded-lg text-red-400"><IconDanger /></div>
              <h3 className="text-white font-semibold">Hapus Organisasi</h3>
            </div>
            <p className="text-sm text-gray-400">
              Tindakan ini <span className="text-red-400 font-semibold">tidak dapat dibatalkan</span>.
              Ketik nama organisasi <span className="text-white font-mono bg-gray-800 px-1.5 py-0.5 rounded">{orgName}</span> untuk konfirmasi.
            </p>
            <input
              className={inputCls + " border-red-800/50 focus:border-red-600"}
              placeholder={`Ketik: ${orgName}`}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm("") }}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm font-medium rounded-lg transition">
                Batal
              </button>
              <button
                disabled={deleteConfirm !== orgName}
                className="flex-1 px-4 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition">
                Hapus Selamanya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

