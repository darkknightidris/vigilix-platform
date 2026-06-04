import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("*, organizations(*)")
    .eq("id", user.id).single()

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })

  const isAdmin = ["owner", "admin"].includes(profile?.role || "")

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 text-sm mt-1">{projects?.length || 0} project aktif</p>
        </div>
        {isAdmin && (
          <Link href="/projects/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
            + Buat Project
          </Link>
        )}
      </div>
      {!projects || projects.length === 0 ? (
        <div className="p-12 bg-gray-900 rounded-xl border border-gray-800 text-center">
          <p className="text-4xl mb-3">📁</p>
          <p className="text-white font-medium">Belum ada project</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">Buat project pertama untuk mulai kelola temuan keamanan</p>
          {isAdmin && (
            <Link href="/projects/new"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
              + Buat Project Pertama
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project: any) => (
            <Link key={project.id} href={`/projects/${project.id}`}
              className="block p-5 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-600 transition">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-white font-semibold">{project.name}</h2>
                  {project.description && (
                    <p className="text-gray-400 text-sm mt-1">{project.description}</p>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(project.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}