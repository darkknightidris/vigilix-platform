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

async def send_webhook_to_orgs(supabase_url: str, service_key: str, org_id: str, event: str, payload: dict):
    """Kirim notifikasi ke semua webhook aktif milik org untuk event tertentu."""
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            f"{supabase_url}/rest/v1/webhook_integrations",
            headers=headers,
            params={
                "organization_id": f"eq.{org_id}",
                "enabled": "eq.true",
                "select": "id,name,type,url,events",
            }
        )
        if res.status_code != 200:
            return
        webhooks = res.json()
        for wh in webhooks:
            if event not in (wh.get("events") or []):
                continue
            try:
                wh_type = wh["type"]
                url = wh["url"]
                if wh_type == "slack":
                    body = {"text": payload.get("text", ""), "blocks": [{"type": "section", "text": {"type": "mrkdwn", "text": payload.get("text", "")}}]}
                elif wh_type == "discord":
                    body = {"username": "Vigilix", "embeds": [{"title": payload.get("title", "Vigilix"), "description": payload.get("text", ""), "color": payload.get("color", 15158332), "footer": {"text": "Vigilix Security Platform"}}]}
                elif wh_type == "teams":
                    body = {"@type": "MessageCard", "@context": "http://schema.org/extensions", "themeColor": payload.get("theme_color", "FF0000"), "summary": payload.get("title", "Vigilix"), "sections": [{"activityTitle": payload.get("title", "Vigilix"), "activityText": payload.get("text", ""), "markdown": True}]}
                else:
                    body = payload
                await client.post(url, json=body, timeout=8.0)
            except Exception:
                pass

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
                <h2 style="color: #ef4444;">âš ï¸ Deadline Reminder - Vigilix</h2>
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

            # Kirim webhook notifikasi
            project = finding.get("projects", {}) or {}
            org_id = project.get("organization_id", "")
            if org_id:
                await send_webhook_to_orgs(
                    supabase_url=SUPABASE_URL,
                    service_key=SUPABASE_SERVICE_KEY,
                    org_id=org_id,
                    event="deadline_reminder",
                    payload={
                        "title": f"⚠️ Deadline Besok: {title}",
                        "text": f"*⚠️ Deadline Besok*\n*Finding:* {title}\n*Project:* {project.get(\"name\", \"-\")}\n*Deadline:* {deadline_str}\n*Assignee:* {assignee.get(\"full_name\", \"-\")}\n\n<https://www.vigilix.id/projects|Buka Vigilix>",
                        "color": 16776960,
                        "theme_color": "FFA500",
                    }
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
                <h2 style="color: #dc2626;">ðŸ”´ OVERDUE - Vigilix</h2>
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

            # Kirim webhook notifikasi overdue
            project = finding.get("projects", {}) or {}
            org_id = project.get("organization_id", "")
            if org_id:
                await send_webhook_to_orgs(
                    supabase_url=SUPABASE_URL,
                    service_key=SUPABASE_SERVICE_KEY,
                    org_id=org_id,
                    event="overdue",
                    payload={
                        "title": f"🔴 OVERDUE: {title}",
                        "text": f"*🔴 OVERDUE - Belum Diselesaikan*\n*Finding:* {title}\n*Project:* {project.get(\"name\", \"-\")}\n*Deadline:* {deadline_str} *(OVERDUE)*\n*Assignee:* {assignee.get(\"full_name\", \"-\")}\n\n<https://www.vigilix.id/projects|Buka Vigilix>",
                        "color": 15158332,
                        "theme_color": "FF0000",
                    }
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
