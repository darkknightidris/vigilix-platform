import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { Resend } from "resend"
import { rateLimit } from "@/lib/rateLimit"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const limited = rateLimit(request as any, 5, 60000)
  if (limited) return limited

  const { email, role } = await request.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role, organizations(name)")
    .eq("id", user.id).single()

  if (!profile || !["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Only admins can invite members" }, { status: 403 })
  }

  const { data: invitation, error } = await supabase
    .from("invitations").insert({
      organization_id: profile.organization_id,
      email, role: role || "member",
      invited_by: user.id,
    }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join?token=${invitation.token}`
  const orgName = (profile.organizations as any)?.name || "the team"

  await resend.emails.send({
    from: "Vigilix <onboarding@resend.dev>",
    to: email,
    subject: `You have been invited to join ${orgName} on Vigilix`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>You have been invited!</h2>
        <p>You have been invited to join <strong>${orgName}</strong> on Vigilix as <strong>${role}</strong>.</p>
        <a href="${inviteUrl}"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;margin:16px 0">
          Accept Invitation
        </a>
        <p style="color:#888;font-size:12px">This link expires in 7 days.</p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}