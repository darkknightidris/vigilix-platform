import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { orgId, name, logoUrl } = await req.json()
    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 })
    const { error } = await supabase
      .from("organizations")
      .update({ name, logo_url: logoUrl })
      .eq("id", orgId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
