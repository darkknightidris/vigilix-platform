"""
api_keys.py - Vigilix Backend
===============================
Router untuk manage REST API public keys.
"""
import hashlib
import secrets
import string
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from app.dependencies import get_current_user, get_supabase

router = APIRouter(prefix="/api/apikeys", tags=["API Keys"])
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# ── Models ────────────────────────────────────────────────────────────────────
class ApiKeyCreate(BaseModel):
    name: str
    scopes: List[str] = ["read"]
    expires_at: Optional[str] = None

class ApiKeyUpdate(BaseModel):
    name: Optional[str] = None
    enabled: Optional[bool] = None

# ── Helper ────────────────────────────────────────────────────────────────────
def generate_api_key() -> tuple[str, str, str]:
    """Return (full_key, prefix, hash)"""
    raw = "vgx_" + secrets.token_urlsafe(32)
    prefix = raw[:12]
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    return raw, prefix, key_hash

def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()

# ── Auth via API Key (untuk endpoint publik) ──────────────────────────────────
async def get_org_from_api_key(
    api_key: Optional[str] = Security(api_key_header),
    supabase=Depends(get_supabase),
) -> dict:
    if not api_key:
        raise HTTPException(401, "API key diperlukan. Sertakan header: X-API-Key")

    key_hash = hash_key(api_key)
    res = supabase.table("api_keys").select("*, organizations(id, name)").eq("key_hash", key_hash).eq("enabled", True).single().execute()

    if not res.data:
        raise HTTPException(401, "API key tidak valid atau sudah dinonaktifkan")

    key_data = res.data
    if key_data.get("expires_at"):
        exp = datetime.fromisoformat(key_data["expires_at"].replace("Z", "+00:00"))
        if exp < datetime.now(timezone.utc):
            raise HTTPException(401, "API key sudah expired")

    supabase.table("api_keys").update({"last_used_at": datetime.now(timezone.utc).isoformat()}).eq("id", key_data["id"]).execute()

    return {
        "org_id": key_data["organization_id"],
        "org_name": key_data.get("organizations", {}).get("name", ""),
        "scopes": key_data.get("scopes", ["read"]),
        "key_id": key_data["id"],
    }

# ── CRUD API Keys (butuh JWT auth) ────────────────────────────────────────────
@router.get("")
async def list_api_keys(current_user=Depends(get_current_user), supabase=Depends(get_supabase)):
    profile = supabase.table("profiles").select("organization_id, role").eq("id", current_user.id).single().execute()
    if not profile.data or profile.data["role"] not in ("owner", "admin"):
        raise HTTPException(403, "Hanya owner/admin yang bisa lihat API keys")
    res = supabase.table("api_keys").select("id,name,key_prefix,scopes,enabled,last_used_at,expires_at,created_at").eq("organization_id", profile.data["organization_id"]).order("created_at", desc=True).execute()
    return res.data or []

@router.post("")
async def create_api_key(body: ApiKeyCreate, current_user=Depends(get_current_user), supabase=Depends(get_supabase)):
    profile = supabase.table("profiles").select("organization_id, role").eq("id", current_user.id).single().execute()
    if not profile.data or profile.data["role"] not in ("owner", "admin"):
        raise HTTPException(403, "Hanya owner/admin yang bisa buat API key")

    valid_scopes = {"read", "write", "findings:read", "findings:write", "projects:read", "projects:write"}
    for s in body.scopes:
        if s not in valid_scopes:
            raise HTTPException(400, f"Scope tidak valid: {s}. Pilihan: {valid_scopes}")

    full_key, prefix, key_hash = generate_api_key()
    data = {
        "organization_id": profile.data["organization_id"],
        "name": body.name,
        "key_hash": key_hash,
        "key_prefix": prefix,
        "scopes": body.scopes,
        "enabled": True,
        "created_by": current_user.id,
    }
    if body.expires_at:
        data["expires_at"] = body.expires_at

    res = supabase.table("api_keys").insert(data).execute()
    result = res.data[0].copy()
    result["full_key"] = full_key
    result["warning"] = "Simpan key ini sekarang! Key tidak bisa dilihat lagi setelah ini."
    return result

@router.patch("/{key_id}")
async def update_api_key(key_id: str, body: ApiKeyUpdate, current_user=Depends(get_current_user), supabase=Depends(get_supabase)):
    profile = supabase.table("profiles").select("organization_id, role").eq("id", current_user.id).single().execute()
    if not profile.data or profile.data["role"] not in ("owner", "admin"):
        raise HTTPException(403, "Hanya owner/admin yang bisa update API key")
    update_data = {k: v for k, v in body.dict().items() if v is not None}
    res = supabase.table("api_keys").update(update_data).eq("id", key_id).eq("organization_id", profile.data["organization_id"]).execute()
    if not res.data:
        raise HTTPException(404, "API key tidak ditemukan")
    return res.data[0]

@router.delete("/{key_id}")
async def delete_api_key(key_id: str, current_user=Depends(get_current_user), supabase=Depends(get_supabase)):
    profile = supabase.table("profiles").select("organization_id, role").eq("id", current_user.id).single().execute()
    if not profile.data or profile.data["role"] not in ("owner", "admin"):
        raise HTTPException(403, "Hanya owner/admin yang bisa hapus API key")
    supabase.table("api_keys").delete().eq("id", key_id).eq("organization_id", profile.data["organization_id"]).execute()
    return {"success": True}

# ── Public REST API endpoints (pakai X-API-Key) ───────────────────────────────
@router.get("/v1/projects", tags=["Public API"])
async def public_list_projects(org=Depends(get_org_from_api_key), supabase=Depends(get_supabase)):
    res = supabase.table("projects").select("id,name,description,created_at").eq("organization_id", org["org_id"]).order("created_at", desc=True).execute()
    return {"data": res.data or [], "org": org["org_name"]}

@router.get("/v1/findings", tags=["Public API"])
async def public_list_findings(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    org=Depends(get_org_from_api_key),
    supabase=Depends(get_supabase),
):
    query = supabase.table("vulnerabilities").select(
        "id,title,severity,status,cvss_score,assigned_to,deadline,created_at,projects(name)"
    )
    if project_id:
        query = query.eq("project_id", project_id)
    else:
        project_ids = [p["id"] for p in (supabase.table("projects").select("id").eq("organization_id", org["org_id"]).execute().data or [])]
        if project_ids:
            query = query.in_("project_id", project_ids)
    if status:
        query = query.eq("status", status)
    if severity:
        query = query.eq("severity", severity)
    res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {"data": res.data or [], "limit": limit, "offset": offset, "org": org["org_name"]}

@router.get("/v1/findings/{finding_id}", tags=["Public API"])
async def public_get_finding(finding_id: str, org=Depends(get_org_from_api_key), supabase=Depends(get_supabase)):
    res = supabase.table("vulnerabilities").select("*, projects(name, organization_id)").eq("id", finding_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Finding tidak ditemukan")
    if res.data.get("projects", {}).get("organization_id") != org["org_id"]:
        raise HTTPException(403, "Akses ditolak")
    return res.data

@router.post("/v1/findings/{finding_id}/status", tags=["Public API"])
async def public_update_finding_status(
    finding_id: str,
    status: str,
    org=Depends(get_org_from_api_key),
    supabase=Depends(get_supabase),
):
    if "write" not in org["scopes"] and "findings:write" not in org["scopes"]:
        raise HTTPException(403, "API key tidak punya scope write")
    allowed = {"open", "in_progress", "resolved", "closed"}
    if status not in allowed:
        raise HTTPException(400, f"Status harus salah satu dari: {allowed}")
    check = supabase.table("vulnerabilities").select("id, projects(organization_id)").eq("id", finding_id).single().execute()
    if not check.data or check.data.get("projects", {}).get("organization_id") != org["org_id"]:
        raise HTTPException(403, "Akses ditolak")
    res = supabase.table("vulnerabilities").update({"status": status}).eq("id", finding_id).execute()
    return res.data[0]
