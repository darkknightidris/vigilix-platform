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
            json={"from": "noreply@vigilix.id", "to": to, "subject": subject, "html": html}
        )

async def send_webhook_to_orgs(org_id: str, event: str, title: str, text: str, color: int = 15158332, theme_color: str = "FF0000"):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return
    headers = {"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            f"{SUPABASE_URL}/rest/v1/webhook_integrations",
            headers=headers,
            params={"organization_id": f"eq.{org_id}", "enabled": "eq.true", "select": "id,name,type,url,events"}
        )
        if res.status_code != 200:
            return
        for wh in res.json():
            if event not in (wh.get("events") or []):
                continue
            try:
                wh_type = wh["type"]
                url = wh["url"]
                if wh_type == "slack":
                    body = {"text": text, "blocks": [{"type": "section", "text": {"type": "mrkdwn", "text": text}}]}
                elif wh_type == "discord":
                    body = {"username": "Vigilix", "embeds": [{"title": title, "description": text, "color": color, "footer": {"text": "Vigilix"}}]}
                elif wh_type == "teams":
                    body = {"@type": "MessageCard", "@context": "http://schema.org/extensions", "themeColor": theme_color, "summary": title, "sections": [{"activityTitle": title, "activityText": text, "markdown": True}]}
                else:
                    body = {"title": title, "text": text}
                await client.post(url, json=body, timeout=8.0)
            except Exception:
                pass

async def check_deadlines():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return

    now = datetime.now(timezone.utc)
    tomorrow = now + timedelta(days=1)
    headers = {"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{SUPABASE_URL}/rest/v1/vulnerabilities",
            headers=headers,
            params=[
                ("select", "id,title,deadline,status,assigned_to,projects(name,organization_id),profiles(full_name,email)"),
                ("deadline", f"gte.{now.date().isoformat()}"),
                ("deadline", f"lte.{tomorrow.date().isoformat()}"),
                ("status", "neq.resolved"),
                ("assigned_to", "not.is.null"),
            ]
        )
        if res.status_code != 200:
            return

        for finding in res.json():
            assignee = finding.get("profiles")
            if not assignee or not assignee.get("email"):
                continue
            project = finding.get("projects") or {}
            project_name = project.get("name", "Unknown")
            org_id = project.get("organization_id", "")
            deadline_str = finding.get("deadline", "")
            title = finding.get("title", "Untitled")
            full_name = assignee.get("full_name", "there")

            html = f"""
            <div style="font-family: sans-serif; max-width: 600px;">
                <h2 style="color: #ef4444;">Deadline Reminder - Vigilix</h2>
                <p>Hi <strong>{full_name}</strong>,</p>
                <p>Finding berikut akan mencapai deadline <strong>besok</strong>:</p>
                <div style="background: #f9fafb; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0;">
                    <p><strong>Finding:</strong> {title}</p>
                    <p><strong>Project:</strong> {project_name}</p>
                    <p><strong>Deadline:</strong> {deadline_str}</p>
                </div>
                <a href="https://www.vigilix.id/projects" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Buka Vigilix</a>
            </div>
            """
            await send_email(to=assignee["email"], subject=f"[Vigilix] Deadline besok: {title}", html=html)

            if org_id:
                wh_text = f"*Deadline Besok*\n*Finding:* {title}\n*Project:* {project_name}\n*Deadline:* {deadline_str}\n*Assignee:* {full_name}"
                await send_webhook_to_orgs(org_id=org_id, event="deadline_reminder", title=f"Deadline Besok: {title}", text=wh_text, color=16776960, theme_color="FFA500")

        res2 = await client.get(
            f"{SUPABASE_URL}/rest/v1/vulnerabilities",
            headers=headers,
            params={"select": "id,title,deadline,status,assigned_to,projects(name,organization_id),profiles(full_name,email)", "deadline": f"lt.{now.date().isoformat()}", "status": "neq.resolved", "assigned_to": "not.is.null"}
        )
        if res2.status_code != 200:
            return

        for finding in res2.json():
            assignee = finding.get("profiles")
            if not assignee or not assignee.get("email"):
                continue
            project = finding.get("projects") or {}
            project_name = project.get("name", "Unknown")
            org_id = project.get("organization_id", "")
            deadline_str = finding.get("deadline", "")
            title = finding.get("title", "Untitled")
            full_name = assignee.get("full_name", "there")

            html = f"""
            <div style="font-family: sans-serif; max-width: 600px;">
                <h2 style="color: #dc2626;">OVERDUE - Vigilix</h2>
                <p>Hi <strong>{full_name}</strong>,</p>
                <p>Finding berikut sudah <strong>melewati deadline</strong>:</p>
                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
                    <p><strong>Finding:</strong> {title}</p>
                    <p><strong>Project:</strong> {project_name}</p>
                    <p><strong>Deadline:</strong> {deadline_str} (OVERDUE)</p>
                </div>
                <a href="https://www.vigilix.id/projects" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Buka Vigilix</a>
            </div>
            """
            await send_email(to=assignee["email"], subject=f"[Vigilix] OVERDUE: {title}", html=html)

            if org_id:
                wh_text = f"*OVERDUE*\n*Finding:* {title}\n*Project:* {project_name}\n*Deadline:* {deadline_str} (OVERDUE)\n*Assignee:* {full_name}"
                await send_webhook_to_orgs(org_id=org_id, event="overdue", title=f"OVERDUE: {title}", text=wh_text, color=15158332, theme_color="FF0000")

def start_scheduler():
    scheduler.add_job(check_deadlines, CronTrigger(hour=1, minute=0), id="deadline_checker", replace_existing=True)
    scheduler.start()

def stop_scheduler():
    scheduler.shutdown()
