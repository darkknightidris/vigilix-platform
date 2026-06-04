import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"

const FRAMEWORK_COLORS: Record<string, string> = {
  "OWASP Top 10": "border-orange-800/50 bg-orange-950/20",
  "ISO 27001": "border-blue-800/50 bg-blue-950/20",
}
const TAG_COLORS: Record<string, string> = {
  "OWASP Top 10": "bg-orange-900/50 text-orange-400",
  "ISO 27001": "bg-blue-900/50 text-blue-400",
}
const SEVERITY_COLORS: Record<string, string> = {
  critical:"bg-red-600", high:"bg-orange-500", medium:"bg-yellow-500", low:"bg-blue-500", info:"bg-gray-600"
}

export default async function CompliancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("organization_id, role").eq("id", user.id).single()

  const { data: project } = await supabase
    .from("projects").select("id, name, organization_id").eq("id", id).single()
  if (!project || project.organization_id !== profile?.organization_id) notFound()

  const { data: vulns } = await supabase
    .from("vulnerabilities")
    .select("id, title, severity, status, compliance_tags")
    .eq("project_id", id)

  const { data: controls } = await supabase
    .from("compliance_controls").select("*").order("code")

  const allVulns = vulns || []
  const allControls = controls || []
  const frameworks = [...new Set(allControls.map((c: any) => c.framework))]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-gray-400 hover:text-white transition">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Mapping</h1>
          <p className="text-gray-400 text-sm mt-0.5">{project.name}</p>
        </div>
      </div>

      {frameworks.map((fw: any) => {
        const fwControls = allControls.filter((c: any) => c.framework === fw)
        const coveredControls = fwControls.filter((c: any) =>
          allVulns.some((v: any) => (v.compliance_tags || []).includes(c.id))
        ).length
        const pct = fwControls.length > 0 ? Math.round((coveredControls / fwControls.length) * 100) : 0

        return (
          <div key={fw} className={`rounded-xl border p-5 space-y-4 ${FRAMEWORK_COLORS[fw] ?? "border-gray-800 bg-gray-900"}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">{fw}</h2>
                <p className="text-gray-400 text-xs mt-0.5">{coveredControls} / {fwControls.length} controls ter-cover</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-white">{pct}%</span>
                <p className="text-gray-500 text-xs">coverage</p>
              </div>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <div className="space-y-2">
              {fwControls.map((c: any) => {
                const mappedVulns = allVulns.filter((v: any) => (v.compliance_tags || []).includes(c.id))
                const covered = mappedVulns.length > 0
                return (
                  <div key={c.id} className={`p-3 rounded-lg border ${covered ? "border-green-800/40 bg-green-950/10" : "border-gray-800 bg-gray-900/50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1">
                        <span className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${covered ? "bg-green-600 text-white" : "bg-gray-700 text-gray-500"}`}>
                          {covered ? "v" : ""}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-medium ${TAG_COLORS[fw] ?? "bg-gray-800 text-gray-400"}`}>
                              {c.code}
                            </span>
                            <span className="text-white text-sm">{c.title}</span>
                          </div>
                          {mappedVulns.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {mappedVulns.map((v: any) => (
                                <Link key={v.id} href={`/projects/${id}/vulnerabilities/${v.id}`}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition">
                                  <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_COLORS[v.severity] ?? "bg-gray-500"}`} />
                                  {v.title}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-500 text-xs shrink-0">{mappedVulns.length} temuan</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}