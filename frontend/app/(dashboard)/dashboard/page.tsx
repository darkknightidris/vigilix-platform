import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import LogoutButton from "./LogoutButton"
import InviteForm from "./InviteForm"
import SeverityChart from "./SeverityChart"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("*, organizations(*)")
    .eq("id", user.id).single()

  const { data: projects } = await supabase
    .from("projects").select("*")
    .eq("organization_id", profile?.organization_id)

  const { data: vulns } = await supabase
    .from("vulnerabilities")
    .select("severity, status, project_id")
    .in("project_id", projects?.map((p:any) => p.id) || [])

  const severityCounts = { critical:0, high:0, medium:0, low:0, info:0 }
  vulns?.forEach((v:any) => { if (v.severity in severityCounts) (severityCounts as any)[v.severity]++ })

  const openCount = vulns?.filter((v:any) => v.status === "open").length || 0
  const fixedCount = vulns?.filter((v:any) => v.status === "fixed").length || 0
  const isAdmin = ["owner", "admin"].includes(profile?.role || "")

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">
            {profile?.organizations?.name || "Dashboard"}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Selamat datang, {profile?.full_name || user.email}
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 md:p-5 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-xs md:text-sm">Total Project</p>
          <p className="text-2xl md:text-3xl font-bold text-white mt-1">{projects?.length || 0}</p>
        </div>
        <div className="p-4 md:p-5 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-xs md:text-sm">Total Temuan</p>
          <p className="text-2xl md:text-3xl font-bold text-white mt-1">{vulns?.length || 0}</p>
        </div>
        <div className="p-4 md:p-5 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-xs md:text-sm">Open</p>
          <p className="text-2xl md:text-3xl font-bold text-red-400 mt-1">{openCount}</p>
        </div>
        <div className="p-4 md:p-5 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-xs md:text-sm">Fixed</p>
          <p className="text-2xl md:text-3xl font-bold text-green-400 mt-1">{fixedCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="p-5 md:p-6 bg-gray-900 rounded-xl border border-gray-800">
          <h2 className="text-white font-semibold mb-4">Severity Breakdown</h2>
          <SeverityChart data={severityCounts} />
        </div>
        <div className="p-5 md:p-6 bg-gray-900 rounded-xl border border-gray-800">
          <h2 className="text-white font-semibold mb-4">Ringkasan Severity</h2>
          <div className="space-y-3">
            {Object.entries(severityCounts).map(([sev, count]) => {
              const total = vulns?.length || 1
              const pct = Math.round((count / total) * 100)
              const colors: Record<string,string> = {
                critical:"bg-red-600",high:"bg-orange-500",medium:"bg-yellow-500",low:"bg-blue-500",info:"bg-gray-500"
              }
              return (
                <div key={sev}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400 capitalize">{sev}</span>
                    <span className="text-white">{count}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${colors[sev]}`} style={{width: `${pct}%`}} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {isAdmin && <InviteForm />}
    </div>
  )
}
