import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import LogoutButton from "./LogoutButton"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("*, organizations(*)")
    .eq("id", user.id).single()

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {profile?.organizations?.name || "Dashboard"}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Selamat datang, {profile?.full_name || user.email}
            </p>
          </div>
          <LogoutButton />
        </div>
        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 text-gray-400">
          Auth berhasil! Minggu 3 akan tambah fitur project di sini.
        </div>
      </div>
    </div>
  )
}
