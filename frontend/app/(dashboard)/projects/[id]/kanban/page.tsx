import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import KanbanBoard from "@/components/KanbanBoard"

export default async function KanbanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase
    .from("profiles").select("organization_id, role").eq("id", user.id).single()
  const { data: project } = await supabase
    .from("projects").select("*").eq("id", id).single()
  if (!project || project.organization_id !== profile?.organization_id) notFound()
  const { data: vulns } = await supabase
    .from("vulnerabilities")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${id}`} className="text-gray-400 hover:text-white transition">?</Link>
          <div>
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
            <p className="text-gray-400 text-xs mt-0.5">Kanban Board</p>
          </div>
        </div>
        <Link href={`/projects/${id}/vulnerabilities/new`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          + Tambah Temuan
        </Link>
      </div>
      <KanbanBoard initialVulns={vulns || []} projectId={id} />
    </div>
  )
}
