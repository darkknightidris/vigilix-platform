"""
audit_log.py - Vigilix Backend
================================
Router untuk audit log per organisasi + export CSV.
"""
import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.dependencies import get_current_user, get_supabase

router = APIRouter(prefix="/api/audit", tags=["Audit Log"])

@router.get("")
async def get_audit_logs(
    page: int = 1,
    limit: int = 50,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    profile = supabase.table("profiles").select("organization_id, role").eq("id", current_user.id).single().execute()
    if not profile.data:
        raise HTTPException(404, "Profile tidak ditemukan")
    if profile.data["role"] not in ("owner", "admin"):
        raise HTTPException(403, "Hanya owner/admin yang bisa akses audit log")

    org_id = profile.data["organization_id"]
    offset = (page - 1) * limit

    query = supabase.table("activity_logs").select(
        "id, action, detail, created_at, user_id, user_name, user_email, resource_type, resource_id, resource_name, project_id, metadata, ip_address, profiles(full_name)"
    ).eq("organization_id", org_id)

    if action:
        query = query.eq("action", action)
    if resource_type:
        query = query.eq("resource_type", resource_type)
    if user_id:
        query = query.eq("user_id", user_id)
    if project_id:
        query = query.eq("project_id", project_id)

    res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()

    count_res = supabase.table("activity_logs").select("id", count="exact").eq("organization_id", org_id).execute()
    total = count_res.count or 0

    return {
        "data": res.data or [],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/export")
async def export_audit_logs(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    profile = supabase.table("profiles").select("organization_id, role").eq("id", current_user.id).single().execute()
    if not profile.data or profile.data["role"] not in ("owner", "admin"):
        raise HTTPException(403, "Hanya owner/admin yang bisa export audit log")

    org_id = profile.data["organization_id"]
    query = supabase.table("activity_logs").select(
        "id, action, detail, created_at, user_name, user_email, resource_type, resource_name, project_id, ip_address"
    ).eq("organization_id", org_id)

    if action:
        query = query.eq("action", action)
    if resource_type:
        query = query.eq("resource_type", resource_type)

    res = query.order("created_at", desc=True).limit(5000).execute()
    logs = res.data or []

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "id", "created_at", "action", "detail", "user_name", "user_email",
        "resource_type", "resource_name", "project_id", "ip_address"
    ])
    writer.writeheader()
    for log in logs:
        writer.writerow({
            "id": log.get("id", ""),
            "created_at": log.get("created_at", ""),
            "action": log.get("action", ""),
            "detail": log.get("detail", ""),
            "user_name": log.get("user_name", ""),
            "user_email": log.get("user_email", ""),
            "resource_type": log.get("resource_type", ""),
            "resource_name": log.get("resource_name", ""),
            "project_id": log.get("project_id", ""),
            "ip_address": log.get("ip_address", ""),
        })

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vigilix-audit-log.csv"}
    )

@router.get("/summary")
async def get_audit_summary(
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    profile = supabase.table("profiles").select("organization_id, role").eq("id", current_user.id).single().execute()
    if not profile.data or profile.data["role"] not in ("owner", "admin"):
        raise HTTPException(403, "Akses ditolak")

    org_id = profile.data["organization_id"]
    res = supabase.table("activity_logs").select("action").eq("organization_id", org_id).execute()
    logs = res.data or []

    summary = {}
    for log in logs:
        a = log.get("action", "unknown")
        summary[a] = summary.get(a, 0) + 1

    return {"summary": summary, "total": len(logs)}
