import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { project_id, expires_in_days } = await request.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const expiresAt = expires_in_days
    ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { data, error } = await supabase.from("shared_reports").insert({
    project_id,
    created_by: user.id,
    expires_at: expiresAt,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/report/${data.token}`
  return NextResponse.json({ url: shareUrl, token: data.token, expires_at: data.expires_at })
}