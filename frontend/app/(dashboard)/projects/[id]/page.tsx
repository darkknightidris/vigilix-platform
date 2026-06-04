import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import ProjectActions from "./ProjectActions"
import AssignDeadlineForm from "./AssignDeadlineForm"

const severityColors: Record<string,string> = {
  critical:"bg-red-600",high:"bg-orange-500",medium:"bg-yellow-500",low:"bg-blue-500",info:"bg-gray-600"
}
const statusColors: Record<string,string> = {
  open:"bg-red-900/50 text-red-400",
  in_progress:"bg-yellow-900/50 text-yellow-400",
  fixed:"bg-green-900/50 text-green-400",
  closed:"bg-gray-700 text-gray-400"
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("organization_id, role").eq("id", user.id).single()

  const { data: project } = await supabase
    .from("projects").select("*").eq("id", params.id).single()

  if (!project || project.organization_id !== profile?.organization_id) notFound()

  const { data: vulns } = await supabase
    .from("vulnerabilities").select("*")
    .eq("project_id", params.id).order("created_at", { ascending: false })

  const { data: members } = await supabase
    .from("profiles").select("id, full_name, role")
    .eq("organization_id", profile.organization_id)

  const isAdmin = ["owner", "admin"].includes(profile?.role || "")
  const counts = { critical:0, high:0, medium:0, low:0, info:0 }
  vulns?.forEach((v:any) => { if (v.severity in counts) (counts as any)[v.severity]++ })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-gray-400 hover:text-white transition">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            {project.description && <p className="text-gray-400 text-sm mt-1">{project.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/projects/${params.id}/kanban`}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition">
            📋 Kanban
          </Link>
          {isAdmin && <ProjectActions project={project} />}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {Object.entries(counts).map(([sev, count]) => (
          <div key={sev} className="p-4 bg-gray-900 rounded-xl border border-gray-800 text-center">
            <div className={`inline-block w-2 h-2 rounded-full mb-2 ${severityColors[sev]}`} />
            <p className="text-white font-bold text-xl">{count}</p>
            <p className="text-gray-400 text-xs capitalize">{sev}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-white font-semibold">Temuan ({vulns?.length || 0})</h2>
        <Link href={`/projects/${params.id}/vulnerabilities/new`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          + Tambah Temuan
        </Link>
      </div>

      {!vulns || vulns.length === 0 ? (
        <div className="p-12 bg-gray-900 rounded-xl border border-gray-800 text-center">
          <p className="text-4xl mb-3">🛡️</p>
          <p className="text-white font-medium">Belum ada temuan</p>
          <Link href={`/projects/${params.id}/vulnerabilities/new`}
            className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
            + Tambah Temuan Pertama
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {vulns.map((v: any) => (
            <div key={v.id} className="p-5 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-600 transition">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <span className={`mt-1 px-2 py-0.5 rounded text-xs font-bold uppercase text-white ${severityColors[v.severity] || "bg-gray-600"}`}>
                    {v.severity}
                  </span>
                  <div>
                    <p className="text-white font-medium">{v.title}</p>
                    {v.cvss_score && <p className="text-gray-400 text-xs mt-0.5">CVSS: {v.cvss_score}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[v.status] || ""}`}>
                    {v.status?.replace("_"," ")}
                  </span>
                  <span className="text-gray-500 text-xs">{new Date(v.created_at).toLocaleDateString("id-ID")}</span>
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
    </div>
  )
}