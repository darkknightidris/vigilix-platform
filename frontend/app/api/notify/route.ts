import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const { vuln_id, type } = await request.json()
  const supabase = await createClient()

  const { data: vuln } = await supabase
    .from("vulnerabilities")
    .select("*, profiles!assigned_to(full_name), projects(name)")
    .eq("id", vuln_id).single()

  if (!vuln || !vuln.assigned_to) return NextResponse.json({ skipped: true })

  const { data: assignee } = await supabase
    .from("profiles").select("id").eq("id", vuln.assigned_to).single()

  if (!assignee) return NextResponse.json({ skipped: true })

  const { data: authUser } = await supabase.auth.admin.getUserById(assignee.id)
  const email = authUser?.user?.email
  if (!email) return NextResponse.json({ skipped: true })

  const projectName = (vuln.projects as any)?.name || "Unknown Project"
  const assigneeName = (vuln.profiles as any)?.full_name || "Team Member"
  const dueDate = vuln.due_date
    ? new Date(vuln.due_date).toLocaleDateString("en-US", { dateStyle: "long" })
    : null

  let subject = ""
  let html = ""

  if (type === "assigned") {
    subject = `[Vigilix] You have been assigned: ${vuln.title}`
    html = `<div style="font-family:sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#2563eb">Vigilix</h2>
      <p>Hi ${assigneeName},</p>
      <p>You have been assigned a finding in <strong>${projectName}</strong>:</p>
      <div style="padding:16px;background:#f9fafb;border-left:4px solid #2563eb;border-radius:4px;margin:16px 0">
        <p style="margin:0;font-weight:bold">${vuln.title}</p>
        <p style="margin:4px 0 0;color:#6b7280;font-size:13px">Severity: ${vuln.severity?.toUpperCase()}</p>
        ${dueDate ? `<p style="margin:4px 0 0;color:#ef4444;font-size:13px">Deadline: ${dueDate}</p>` : ""}
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
         style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;border-radius:8px;text-decoration:none">
        View in Vigilix
      </a>
    </div>`
  } else if (type === "deadline") {
    subject = `[Vigilix] Deadline approaching: ${vuln.title}`
    html = `<div style="font-family:sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#ef4444">Deadline Reminder</h2>
      <p>Hi ${assigneeName},</p>
      <p>Finding deadline is approaching:</p>
      <div style="padding:16px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;margin:16px 0">
        <p style="margin:0;font-weight:bold">${vuln.title}</p>
        <p style="margin:4px 0 0;color:#6b7280;font-size:13px">Project: ${projectName}</p>
        <p style="margin:4px 0 0;color:#ef4444;font-size:13px;font-weight:bold">Deadline: ${dueDate}</p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
         style="display:inline-block;padding:10px 20px;background:#ef4444;color:white;border-radius:8px;text-decoration:none">
        View in Vigilix
      </a>
    </div>`
  }

  await resend.emails.send({ from: "Vigilix <noreply@vigilix.id>", to: email, subject, html })
  return NextResponse.json({ sent: true })
}