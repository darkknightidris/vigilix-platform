import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import BillingClient from "./BillingClient"

export default async function BillingPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase
    .from("profiles").select("*, organizations(*)")
    .eq("id", user.id).single()
  const org = profile?.organizations as any
  const trialEndsAt = org?.trial_ends_at ? new Date(org.trial_ends_at) : null
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000*60*60*24))) : 0
  const isExpired = trialEndsAt ? trialEndsAt < new Date() : false
  return (
    <BillingClient
      plan={org?.plan || "trial"}
      daysLeft={daysLeft}
      isExpired={isExpired}
      orgName={org?.name || ""}
      status={searchParams.status}
    />
  )
}