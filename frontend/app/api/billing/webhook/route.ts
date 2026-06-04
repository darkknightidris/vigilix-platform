import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json()
  const supabase = await createClient()
  if (body.status !== "PAID") return NextResponse.json({ received: true })
  const parts = (body.external_id || "").split("-")
  const orgId = parts[1]
  const plan = parts[2]
  if (!orgId || !plan) return NextResponse.json({ error: "Invalid" }, { status: 400 })
  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + 1)
  await supabase.from("organizations").update({ plan }).eq("id", orgId)
  await supabase.from("subscriptions").upsert({
    organization_id: orgId,
    xendit_subscription_id: body.id,
    plan, status: "active",
    current_period_end: periodEnd.toISOString(),
  }, { onConflict: "organization_id" })
  return NextResponse.json({ received: true })
}