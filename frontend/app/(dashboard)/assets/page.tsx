import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AssetsClient from "./AssetsClient"

export default async function AssetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles").select("*, organizations(*)")
    .eq("id", user.id).single()

  if (!profile?.organization_id) redirect("/dashboard")

  const { data: assets } = await supabase
    .from("assets").select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })

  const { data: projects } = await supabase
    .from("projects").select("id, name")
    .eq("organization_id", profile.organization_id)

  const isAdmin = ["owner", "admin"].includes(profile?.role || "")

  return (
    <AssetsClient
      initialAssets={assets || []}
      projects={projects || []}
      organizationId={profile.organization_id}
      isAdmin={isAdmin}
    />
  )
}