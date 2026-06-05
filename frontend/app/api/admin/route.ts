import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const ADMIN_EMAIL = "muhammadidris9404@gmail.com"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { data: payments } = await supabase
    .from("payment_confirmations")
    .select("*")
    .order("created_at", { ascending: false })
  return NextResponse.json({ payments: payments || [] })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { userId, plan, paymentId } = await req.json()
  const { error } = await supabase
    .from("organizations")
    .update({ plan })
    .eq("id", (await supabase.from("profiles").select("organization_id").eq("id", userId).single()).data?.organization_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (paymentId) {
    await supabase.from("payment_confirmations").update({ status: "activated", activated_at: new Date().toISOString() }).eq("id", paymentId)
  }
  return NextResponse.json({ ok: true })
}
