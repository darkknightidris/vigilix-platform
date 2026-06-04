from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.dependencies import get_current_user, get_supabase

router = APIRouter(prefix="/api/vulnerabilities", tags=["remediation"])

class RemediationUpdate(BaseModel):
    remediation_status: Optional[str] = None
    sla_deadline: Optional[datetime] = None
    sla_note: Optional[str] = None

@router.patch("/{vuln_id}/remediation")
async def update_remediation(
    vuln_id: str,
    payload: RemediationUpdate,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    allowed = {"open", "in_progress", "resolved"}
    if payload.remediation_status and payload.remediation_status not in allowed:
        raise HTTPException(400, "Invalid remediation_status")

    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if payload.sla_deadline:
        update_data["sla_deadline"] = payload.sla_deadline.isoformat()

    res = supabase.table("vulnerabilities")\
        .update(update_data)\
        .eq("id", vuln_id)\
        .execute()

    if not res.data:
        raise HTTPException(404, "Vulnerability not found or access denied")

    return res.data[0]

@router.get("/{vuln_id}/remediation")
async def get_remediation(
    vuln_id: str,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    res = supabase.table("vulnerabilities")\
        .select("id, title, remediation_status, sla_deadline, sla_note, resolved_at")\
        .eq("id", vuln_id)\
        .single()\
        .execute()

    if not res.data:
        raise HTTPException(404, "Not found")

    return res.data
