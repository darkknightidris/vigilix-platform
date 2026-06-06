import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import VulnDetailClient from "./VulnDetailClient"

export default async function VulnDetailPage({ params }: { params: { id: string; vulnId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("*, organizations(*)")
    .eq("id", user.id).single()

  const { data: vuln } = await supabase
    .from("vulnerabilities").select("*")
    .eq("id", params.vulnId).single()

  if (!vuln) notFound()

  const { data: comments } = await supabase
    .from("comments").select("*, profiles(full_name)")
    .eq("vulnerability_id", params.vulnId)
    .order("created_at", { ascending: true })

  const { data: attachments } = await supabase
    .from("attachments").select("*")
    .eq("vulnerability_id", params.vulnId)
    .order("created_at", { ascending: false })

  const { data: logs } = await supabase
    .from("activity_logs").select("*, profiles(full_name)")
    .eq("vulnerability_id", params.vulnId)
    .order("created_at", { ascending: false })

  const { data: members } = await supabase
    .from("profiles").select("id, full_name")
    .eq("organization_id", profile?.organization_id)

  return (
    <VulnDetailClient
      vuln={vuln}
      userRole={profile?.role || "member"}
      projectId={params.id}
      comments={comments || []}
      attachments={attachments || []}
      logs={logs || []}
      members={members || []}
      currentUserId={user.id}
    />
  )
}
