import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import ImportCSV from "@/components/ImportCSV"

export default async function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("organization_id").eq("id", user.id).single()

  const { data: project } = await supabase
    .from("projects").select("*").eq("id", id).single()

  if (!project || project.organization_id !== profile?.organization_id) notFound()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${id}`} className="text-gray-400 hover:text-white transition text-xl">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Import Temuan</h1>
          <p className="text-gray-400 text-sm mt-1">{project.name}</p>
        </div>
      </div>

      <div className="p-5 bg-blue-900/20 border border-blue-800 rounded-xl text-sm text-blue-300">
        <p className="font-medium mb-1">Format CSV yang didukung:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-400 text-xs">
          <li>Burp Suite Scanner Export: kolom <code>Issue name</code>, <code>Severity</code>, <code>Issue detail</code></li>
          <li>CSV custom: kolom <code>title</code>, <code>severity</code>, <code>description</code></li>
          <li>Nessus: kolom <code>Name</code>, <code>Risk</code>, <code>Description</code></li>
        </ul>
      </div>

      <ImportCSV projectId={id} />
    </div>
  )
}

