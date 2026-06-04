import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import ProjectActions from "./ProjectActions"

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("organization_id, role").eq("id", user.id).single()

  const { data: project } = await supabase
    .from("projects").select("*").eq("id", params.id).single()

  if (!project || project.organization_id !== profile?.organization_id) notFound()

  const isAdmin = ["owner", "admin"].includes(profile?.role || "")

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
        {isAdmin && <ProjectActions project={project} />}
      </div>
      <div className="p-8 bg-gray-900 rounded-xl border border-gray-800 text-center">
        <p className="text-4xl mb-3">🛡️</p>
        <p className="text-white font-medium">Belum ada temuan</p>
        <p className="text-gray-400 text-sm mt-1">Minggu 4 akan tambah form temuan di sini</p>
      </div>
    </div>
  )
}