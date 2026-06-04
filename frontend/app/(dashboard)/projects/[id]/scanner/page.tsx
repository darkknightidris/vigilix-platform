import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import ScannerImport from "@/components/ScannerImport"

export default async function ScannerPage({ params }: { params: Promise<{ id: string }> }) {
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
        <Link href={`/projects/${id}`} className="text-gray-400 hover:text-white transition">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Import Scanner</h1>
          <p className="text-gray-400 text-sm mt-1">{project.name}</p>
        </div>
      </div>
      <ScannerImport projectId={id} />
    </div>
  )
}