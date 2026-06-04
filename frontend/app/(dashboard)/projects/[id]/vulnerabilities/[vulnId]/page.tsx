import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import VulnDetailClient from "./VulnDetailClient"

const severityColors: Record<string,string> = {
  critical:"bg-red-600", high:"bg-orange-500", medium:"bg-yellow-500",
  low:"bg-blue-500", info:"bg-gray-600"
}

export default async function VulnDetailPage({
  params
}: {
  params: { id: string; vulnId: string }
}) {
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${params.id}`} className="text-gray-400 hover:text-white transition">
          &larr;
        </Link>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase text-white ${severityColors[vuln.severity] || "bg-gray-600"}`}>
            {vuln.severity}
          </span>
          <h1 className="text-xl font-bold text-white">{vuln.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-xs mb-1">Status</p>
          <p className="text-white font-medium capitalize">{vuln.status?.replace("_", " ")}</p>
        </div>
        <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-xs mb-1">CVSS Score</p>
          <p className="text-white font-medium">{vuln.cvss_score || "N/A"}</p>
        </div>
        <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-xs mb-1">Deadline</p>
          <p className="text-white font-medium">
            {vuln.due_date ? new Date(vuln.due_date).toLocaleDateString("en-US") : "N/A"}
          </p>
        </div>
      </div>

      {vuln.description && (
        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
          <h2 className="text-white font-semibold mb-3">Description</h2>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{vuln.description}</p>
        </div>
      )}

      {vuln.steps_to_reproduce && (
        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800">
          <h2 className="text-white font-semibold mb-3">Steps to Reproduce</h2>
          <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-mono bg-gray-800 p-4 rounded-lg">
            {vuln.steps_to_reproduce}
          </pre>
        </div>
      )}

      {vuln.cvss_vector && (
        <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-xs mb-1">CVSS Vector</p>
          <p className="text-gray-300 text-xs font-mono break-all">{vuln.cvss_vector}</p>
        </div>
      )}

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
    </div>
  )
}
