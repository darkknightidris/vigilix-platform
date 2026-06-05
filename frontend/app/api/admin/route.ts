import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: payments } = await supabase
    .from("payment_confirmations")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, plan, created_at, profiles(id, full_name, role, email:id)")
    .order("created_at", { ascending: false })

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, organization_id, role")
    .eq("role", "owner")

  const orgsWithOwner = (orgs || []).map((org: any) => {
    const owner = (profiles || []).find((p: any) => p.organization_id === org.id)
    return { ...org, owner_name: owner?.full_name || "-", owner_id: owner?.id || null }
  })

  return NextResponse.json({ payments: payments || [], orgs: orgsWithOwner })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { action, userId, orgId, plan, paymentId } = await req.json()

  if (action === "activate" || action === "set_plan") {
    const targetOrgId = orgId || (await supabase.from("profiles").select("organization_id").eq("id", userId).single()).data?.organization_id
    const { error } = await supabase.from("organizations").update({ plan }).eq("id", targetOrgId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (paymentId) {
      await supabase.from("payment_confirmations").update({ status: "activated", activated_at: new Date().toISOString() }).eq("id", paymentId)
    }
    return NextResponse.json({ ok: true })
  }

  if (action === "cancel_plan") {
    const { error } = await supabase.from("organizations").update({ plan: "free" }).eq("id", orgId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
