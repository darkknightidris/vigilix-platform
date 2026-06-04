import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import ProjectDetailClient from "./ProjectDetailClient"

export default async function ProjectDetailPage({
  params, searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ severity?: string, status?: string, q?: string }>
}) {
  const { id } = await params
  const { severity, status, q } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("organization_id, role, organizations(name)").eq("id", user.id).single()

  const { data: project } = await supabase
    .from("projects").select("*").eq("id", id).single()

  if (!project || project.organization_id !== profile?.organization_id) notFound()

  let query = supabase.from("vulnerabilities").select("*").eq("project_id", id)
  if (severity) query = query.eq("severity", severity)
  if (status) query = query.eq("status", status)
  if (q) query = query.ilike("title", `%${q}%`)
  const { data: vulns } = await query.order("created_at", { ascending: false })

  const { data: allVulns } = await supabase
    .from("vulnerabilities").select("severity").eq("project_id", id)

  const { data: members } = await supabase
    .from("profiles").select("id, full_name, role").eq("organization_id", profile.organization_id)

  const isAdmin = ["owner", "admin"].includes(profile?.role || "")
  const counts = { critical:0, high:0, medium:0, low:0, info:0 }
  allVulns?.forEach((v:any) => { if (v.severity in counts) (counts as any)[v.severity]++ })
  const orgName = (profile?.organizations as any)?.name || "Vigilix"

  return (
    <ProjectDetailClient
      project={project}
      vulns={vulns || []}
      members={members || []}
      isAdmin={isAdmin}
      orgName={orgName}
      projectId={id}
      counts={counts}
    />
  )
}
