from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime, date
import csv
import io
from app.dependencies import get_current_user, get_supabase

router = APIRouter(prefix="/api/audit-logs", tags=["audit-logs"])

ACTION_LABELS = {
    "finding.created": "Finding Created",
    "finding.updated": "Finding Updated",
    "finding.deleted": "Finding Deleted",
    "finding.status_changed": "Status Changed",
    "finding.assigned": "Finding Assigned",
    "project.created": "Project Created",
    "project.updated": "Project Updated",
    "project.deleted": "Project Deleted",
    "member.invited": "Member Invited",
    "member.removed": "Member Removed",
    "member.role_changed": "Role Changed",
    "report.shared": "Report Shared",
    "report.exported": "Report Exported",
    "api_key.created": "API Key Created",
    "api_key.revoked": "API Key Revoked",
    "2fa.enabled": "2FA Enabled",
    "2fa.disabled": "2FA Disabled",
    "webhook.created": "Webhook Created",
    "webhook.deleted": "Webhook Deleted",
    "org.logo_updated": "Logo Updated",
}


def get_org_id(supabase, user_id: str) -> str:
    result = supabase.table("profiles").select("role, organization_id").eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=403, detail="Profile not found")
    if result.data.get("role") not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Only Admin or Owner can access audit logs")
    return result.data.get("organization_id"), result.data.get("role")


@router.get("")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    project_id: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    org_id, _ = get_org_id(supabase, str(current_user.id))

    query = supabase.table("activity_logs") \
        .select("*", count="exact") \
        .eq("organization_id", org_id) \
        .order("created_at", desc=True)

    if project_id:
        query = query.eq("project_id", project_id)
    if user_id:
        query = query.eq("user_id", user_id)
    if action:
        query = query.eq("action", action)
    if resource_type:
        query = query.eq("resource_type", resource_type)
    if date_from:
        query = query.gte("created_at", date_from.isoformat())
    if date_to:
        query = query.lte("created_at", f"{date_to.isoformat()}T23:59:59")
    if search:
        query = query.or_(f"user_email.ilike.%{search}%,resource_name.ilike.%{search}%,user_name.ilike.%{search}%")

    offset = (page - 1) * limit
    result = query.range(offset, offset + limit - 1).execute()

    return {
        "data": result.data,
        "total": result.count,
        "page": page,
        "limit": limit,
        "pages": -(-result.count // limit) if result.count else 0,
    }


@router.get("/export")
async def export_audit_logs_csv(
    project_id: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    org_id, _ = get_org_id(supabase, str(current_user.id))

    query = supabase.table("activity_logs") \
        .select("*") \
        .eq("organization_id", org_id) \
        .order("created_at", desc=True) \
        .limit(5000)

    if project_id:
        query = query.eq("project_id", project_id)
    if user_id:
        query = query.eq("user_id", user_id)
    if action:
        query = query.eq("action", action)
    if date_from:
        query = query.gte("created_at", date_from.isoformat())
    if date_to:
        query = query.lte("created_at", f"{date_to.isoformat()}T23:59:59")

    result = query.execute()
    logs = result.data or []

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Timestamp", "User", "Email", "Action", "Resource Type",
        "Resource Name", "Project ID", "IP Address", "Details"
    ])
    for log in logs:
        writer.writerow([
            log.get("created_at", ""),
            log.get("user_name", ""),
            log.get("user_email", ""),
            ACTION_LABELS.get(log.get("action", ""), log.get("action", "")),
            log.get("resource_type", ""),
            log.get("resource_name", ""),
            log.get("project_id", ""),
            log.get("ip_address", ""),
            str(log.get("metadata", {})),
        ])

    output.seek(0)
    filename = f"vigilix-audit-log-{datetime.now().strftime('%Y%m%d-%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/filters")
async def get_audit_log_filters(
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    org_id, _ = get_org_id(supabase, str(current_user.id))

    logs = supabase.table("activity_logs") \
        .select("action, user_id, user_name, user_email") \
        .eq("organization_id", org_id) \
        .execute()

    actions = sorted({l["action"] for l in logs.data if l.get("action")})
    users = {l["user_id"]: {"id": l["user_id"], "name": l["user_name"], "email": l["user_email"]}
             for l in logs.data if l.get("user_id")}

    return {
        "actions": actions,
        "action_labels": ACTION_LABELS,
        "users": list(users.values()),
    }
