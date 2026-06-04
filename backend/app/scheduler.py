from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta, timezone
import httpx
import os

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")

scheduler = AsyncIOScheduler()

async def send_email(to: str, subject: str, html: str):
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={
                "from": "noreply@vigilix.id",
                "to": to,
                "subject": subject,
                "html": html,
            }
        )

async def check_deadlines():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return

    now = datetime.now(timezone.utc)
    tomorrow = now + timedelta(days=1)

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }

    async with httpx.AsyncClient() as client:
        # Ambil findings yang deadline-nya besok (H-1) dan belum resolved
        res = await client.get(
            f"{SUPABASE_URL}/rest/v1/vulnerabilities",
            headers=headers,
            params=[
                ("select", "id,title,deadline,status,assigned_to,projects(name),profiles(full_name,email)"),
                ("deadline", f"gte.{now.date().isoformat()}"),
                ("deadline", f"lte.{tomorrow.date().isoformat()}"),
                ("status", "neq.resolved"),
                ("assigned_to", "not.is.null"),
            ]
        )

        if res.status_code != 200:
            return

        findings = res.json()

        for finding in findings:
            assignee = finding.get("profiles")
            if not assignee or not assignee.get("email"):
                continue

            project_name = finding.get("projects", {}).get("name", "Unknown Project")
            deadline_str = finding.get("deadline", "")
            title = finding.get("title", "Untitled")

            html = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ef4444;">⚠️ Deadline Reminder - Vigilix</h2>
                <p>Hi <strong>{assignee.get('full_name', 'there')}</strong>,</p>
                <p>Finding berikut akan mencapai deadline <strong>besok</strong>:</p>
                <div style="background: #f9fafb; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0;">
                    <p style="margin: 0;"><strong>Finding:</strong> {title}</p>
                    <p style="margin: 8px 0 0;"><strong>Project:</strong> {project_name}</p>
                    <p style="margin: 8px 0 0;"><strong>Deadline:</strong> {deadline_str}</p>
                </div>
                <p>Segera selesaikan atau update status finding ini di Vigilix.</p>
                <a href="https://www.vigilix.id/projects" 
                   style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 8px;">
                    Buka Vigilix
                </a>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
                    Email ini dikirim otomatis oleh Vigilix. Jangan reply email ini.
                </p>
            </div>
            """

            await send_email(
                to=assignee["email"],
                subject=f"[Vigilix] Deadline besok: {title}",
                html=html,
            )

        # Findings yang sudah overdue (deadline sudah lewat)
        res_overdue = await client.get(
            f"{SUPABASE_URL}/rest/v1/vulnerabilities",
            headers=headers,
            params={
                "select": "id,title,deadline,status,assigned_to,projects(name),profiles(full_name,email)",
                "deadline": f"lt.{now.date().isoformat()}",
                "status": "neq.resolved",
                "assigned_to": "not.is.null",
            }
        )

        if res_overdue.status_code != 200:
            return

        overdue = res_overdue.json()

        for finding in overdue:
            assignee = finding.get("profiles")
            if not assignee or not assignee.get("email"):
                continue

            project_name = finding.get("projects", {}).get("name", "Unknown Project")
            deadline_str = finding.get("deadline", "")
            title = finding.get("title", "Untitled")

            html = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">🔴 OVERDUE - Vigilix</h2>
                <p>Hi <strong>{assignee.get('full_name', 'there')}</strong>,</p>
                <p>Finding berikut sudah <strong>melewati deadline</strong> dan belum diselesaikan:</p>
                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
                    <p style="margin: 0;"><strong>Finding:</strong> {title}</p>
                    <p style="margin: 8px 0 0;"><strong>Project:</strong> {project_name}</p>
                    <p style="margin: 8px 0 0;"><strong>Deadline:</strong> {deadline_str} (OVERDUE)</p>
                </div>
                <p>Segera update status atau hubungi project manager kamu.</p>
                <a href="https://www.vigilix.id/projects"
                   style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 8px;">
                    Buka Vigilix
                </a>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
                    Email ini dikirim otomatis oleh Vigilix. Jangan reply email ini.
                </p>
            </div>
            """

            await send_email(
                to=assignee["email"],
                subject=f"[Vigilix] OVERDUE: {title}",
                html=html,
            )

def start_scheduler():
    # Jalankan setiap hari jam 08:00 WIB (01:00 UTC)
    scheduler.add_job(
        check_deadlines,
        CronTrigger(hour=1, minute=0),
        id="deadline_checker",
        replace_existing=True,
    )
    scheduler.start()

def stop_scheduler():
    scheduler.shutdown()
