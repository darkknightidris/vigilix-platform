import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import LogoutButton from "./dashboard/LogoutButton"
import InviteForm from "./dashboard/InviteForm"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("*, organizations(*)")
    .eq("id", user.id).single()

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })

  const isAdmin = ["owner", "admin"].includes(profile?.role || "")

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {profile?.organizations?.name || "Dashboard"}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Selamat datang, {profile?.full_name || user.email}
          </p>
        </div>
        <LogoutButton />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-sm">Total Project</p>
          <p className="text-3xl font-bold text-white mt-1">{projects?.length || 0}</p>
        </div>
        <div className="p-5 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-sm">Plan</p>
          <p className="text-3xl font-bold text-blue-400 mt-1 capitalize">
            {profile?.organizations?.plan || "trial"}
          </p>
        </div>
        <div className="p-5 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-sm">Role Kamu</p>
          <p className="text-3xl font-bold text-green-400 mt-1 capitalize">
            {profile?.role || "member"}
          </p>
        </div>
      </div>

      {isAdmin && <InviteForm />}
    </div>
  )
}