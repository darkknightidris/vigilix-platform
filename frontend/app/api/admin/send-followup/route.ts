import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { admin_key } = await request.json()

  if (admin_key !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: trialUsers } = await supabase
    .from("organizations")
    .select(`
      id, name, plan, trial_ends_at,
      profiles!inner(id, full_name, role)
    `)
    .eq("plan", "trial")
    .eq("profiles.role", "owner")

  if (!trialUsers || trialUsers.length === 0) {
    return NextResponse.json({ message: "No trial users found" })
  }

  const results = []
  for (const org of trialUsers) {
    const profile = (org.profiles as any[])[0]
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
    const email = authUser?.user?.email
    if (!email) continue

    const daysLeft = org.trial_ends_at
      ? Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / 86400000)
      : 0

    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const { Resend } = await import("resend")
      const resend = new Resend(resendKey)
      await resend.emails.send({
        from: "Idris from Vigilix <noreply@vigilix.id>",
        to: email,
        subject: `How is Vigilix working for you, ${profile.full_name?.split(" ")[0] || "there"}?`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#111">
            <p>Hi ${profile.full_name?.split(" ")[0] || "there"},</p>
            <p>I noticed you signed up for Vigilix${daysLeft > 0 ? ` and have ${daysLeft} days left on your trial` : " recently"}. I wanted to personally check in — how has it been going?</p>
            <p>A few things I'd love to know:</p>
            <ul>
              <li>Is there anything that's not working the way you expected?</li>
              <li>What feature would make Vigilix more useful for your workflow?</li>
              <li>Is there anything stopping you from upgrading to a paid plan?</li>
            </ul>
            <p>Just reply to this email — I read every response personally.</p>
            <p>If you're ready to upgrade, you can do it here:<br>
            <a href="https://www.vigilix.id/billing" style="color:#2563eb">https://www.vigilix.id/billing</a></p>
            <br>
            <p>Best,<br>
            <strong>Idris</strong><br>
            Founder, Vigilix<br>
            <a href="https://www.vigilix.id" style="color:#2563eb">vigilix.id</a></p>
          </div>
        `
      })
      results.push({ email, org: org.name, days_left: daysLeft })
    }
  }

  return NextResponse.json({ sent: results.length, results })
}