import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { plan } = await request.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles").select("organization_id")
    .eq("id", user.id).single()

  const PLANS: Record<string, number> = { pro: 499000, team: 1200000 }
  if (!PLANS[plan]) return NextResponse.json({ error: "Plan tidak valid" }, { status: 400 })

  const xenditKey = process.env.XENDIT_SECRET_KEY
  if (!xenditKey || xenditKey.includes("xxxxxxxx")) {
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + 1)
    await supabase.from("organizations").update({ plan }).eq("id", profile?.organization_id)
    await supabase.from("subscriptions").upsert({
      organization_id: profile?.organization_id,
      plan, status: "active",
      current_period_end: periodEnd.toISOString(),
    }, { onConflict: "organization_id" })
    return NextResponse.json({ demo_mode: true, redirect: "/billing?status=success" })
  }

  const externalId = `vigilix-${profile?.organization_id}-${plan}-${Date.now()}`
  const xenditRes = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${Buffer.from(xenditKey + ":").toString("base64")}`,
    },
    body: JSON.stringify({
      external_id: externalId,
      amount: PLANS[plan],
      description: `Vigilix ${plan} - 1 bulan`,
      invoice_duration: 86400,
      customer: { email: user.email },
      currency: "IDR",
      success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?status=success`,
      failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?status=failed`,
    }),
  })
  const invoice = await xenditRes.json()
  if (!xenditRes.ok) return NextResponse.json({ error: invoice.message }, { status: 500 })
  return NextResponse.json({ invoice_url: invoice.invoice_url })
}