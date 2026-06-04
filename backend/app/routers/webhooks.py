"""
webhooks.py - Vigilix Backend
==============================
Router untuk CRUD webhook integrations (Slack, Discord, Teams, Custom).
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from app.dependencies import get_current_user, get_supabase

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

# ── Models ───────────────────────────────────────────────────────────────────
class WebhookCreate(BaseModel):
    name: str
    type: str  # slack | discord | teams | custom
    url: str
    enabled: bool = True
    events: List[str] = ["deadline_reminder", "overdue", "finding_created", "finding_resolved"]

class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    enabled: Optional[bool] = None
    events: Optional[List[str]] = None

class WebhookTest(BaseModel):
    webhook_id: str

# ── Helper: kirim webhook ─────────────────────────────────────────────────────
async def send_webhook_message(url: str, webhook_type: str, payload: dict):
    """Kirim pesan ke Slack/Discord/Teams/Custom webhook URL."""
    if webhook_type == "slack":
        body = {
            "text": payload.get("text", ""),
            "blocks": [
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": payload.get("text", "")}
                },
                {
                    "type": "context",
                    "elements": [{"type": "mrkdwn", "text": "Sent by *Vigilix*"}]
                }
            ]
        }
    elif webhook_type == "discord":
        body = {
            "username": "Vigilix",
            "avatar_url": "https://www.vigilix.id/favicon.ico",
            "embeds": [{
                "title": payload.get("title", "Vigilix Notification"),
                "description": payload.get("text", ""),
                "color": payload.get("color", 3447003),
                "footer": {"text": "Vigilix Security Platform"},
                "timestamp": payload.get("timestamp", "")
            }]
        }
    elif webhook_type == "teams":
        body = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": payload.get("theme_color", "0076D7"),
            "summary": payload.get("title", "Vigilix Notification"),
            "sections": [{
                "activityTitle": payload.get("title", "Vigilix"),
                "activityText": payload.get("text", ""),
                "markdown": True
            }]
        }
    else:
        # Custom: kirim raw JSON
        body = payload

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=body)
        response.raise_for_status()
    return True

# ── GET /api/webhooks ─────────────────────────────────────────────────────────
@router.get("")
async def list_webhooks(
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    profile = supabase.table("profiles").select("organization_id").eq("id", current_user.id).single().execute()
    if not profile.data:
        raise HTTPException(404, "Profile not found")
    
    org_id = profile.data["organization_id"]
    res = supabase.table("webhook_integrations").select("*").eq("organization_id", org_id).order("created_at").execute()
    return res.data or []

# ── POST /api/webhooks ────────────────────────────────────────────────────────
@router.post("")
async def create_webhook(
    body: WebhookCreate,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    profile = supabase.table("profiles").select("organization_id, role").eq("id", current_user.id).single().execute()
    if not profile.data or profile.data["role"] not in ("owner", "admin"):
        raise HTTPException(403, "Hanya owner/admin yang bisa tambah webhook")

    valid_types = {"slack", "discord", "teams", "custom"}
    if body.type not in valid_types:
        raise HTTPException(400, f"Type harus salah satu dari: {valid_types}")

    res = supabase.table("webhook_integrations").insert({
        "organization_id": profile.data["organization_id"],
        "name": body.name,
        "type": body.type,
        "url": body.url,
        "enabled": body.enabled,
        "events": body.events,
        "created_by": current_user.id,
    }).execute()

    return res.data[0]

# ── PATCH /api/webhooks/{id} ──────────────────────────────────────────────────
@router.patch("/{webhook_id}")
async def update_webhook(
    webhook_id: str,
    body: WebhookUpdate,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    profile = supabase.table("profiles").select("organization_id, role").eq("id", current_user.id).single().execute()
    if not profile.data or profile.data["role"] not in ("owner", "admin"):
        raise HTTPException(403, "Hanya owner/admin yang bisa update webhook")

    update_data = {k: v for k, v in body.dict().items() if v is not None}
    res = supabase.table("webhook_integrations").update(update_data).eq("id", webhook_id).eq("organization_id", profile.data["organization_id"]).execute()

    if not res.data:
        raise HTTPException(404, "Webhook tidak ditemukan")
    return res.data[0]

# ── DELETE /api/webhooks/{id} ─────────────────────────────────────────────────
@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    profile = supabase.table("profiles").select("organization_id, role").eq("id", current_user.id).single().execute()
    if not profile.data or profile.data["role"] not in ("owner", "admin"):
        raise HTTPException(403, "Hanya owner/admin yang bisa hapus webhook")

    supabase.table("webhook_integrations").delete().eq("id", webhook_id).eq("organization_id", profile.data["organization_id"]).execute()
    return {"success": True}

# ── POST /api/webhooks/test ───────────────────────────────────────────────────
@router.post("/test")
async def test_webhook(
    body: WebhookTest,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    profile = supabase.table("profiles").select("organization_id, role").eq("id", current_user.id).single().execute()
    if not profile.data or profile.data["role"] not in ("owner", "admin"):
        raise HTTPException(403, "Hanya owner/admin yang bisa test webhook")

    webhook = supabase.table("webhook_integrations").select("*").eq("id", body.webhook_id).eq("organization_id", profile.data["organization_id"]).single().execute()
    if not webhook.data:
        raise HTTPException(404, "Webhook tidak ditemukan")

    w = webhook.data
    try:
        await send_webhook_message(
            url=w["url"],
            webhook_type=w["type"],
            payload={
                "title": "✅ Test Webhook - Vigilix",
                "text": f"*Test berhasil!* Webhook `{w['name']}` sudah terhubung ke Vigilix.\nNotifikasi deadline dan temuan baru akan dikirim ke sini.",
                "color": 3066993,
                "theme_color": "00B894",
                "timestamp": "2026-01-01T00:00:00Z"
            }
        )
        return {"success": True, "message": "Test webhook berhasil dikirim!"}
    except Exception as e:
        raise HTTPException(400, f"Gagal kirim webhook: {str(e)}")
