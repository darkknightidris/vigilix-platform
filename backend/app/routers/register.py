"""
register.py - Vigilix Backend
Handle register user + buat organization dengan service role key.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.dependencies import get_supabase
import re, time

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class RegisterRequest(BaseModel):
    full_name: str
    org_name: str
    email: str
    password: str

@router.post("/register")
async def register(body: RegisterRequest):
    supabase = get_supabase()

    # 1. Buat user via admin API (service role)
    try:
        user_res = supabase.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
            "user_metadata": {"full_name": body.full_name}
        })
    except Exception as e:
        raise HTTPException(400, f"Gagal buat akun: {str(e)}")

    user = user_res.user
    if not user:
        raise HTTPException(400, "Gagal membuat user")

    # 2. Buat organization (service role bypass RLS)
    slug = re.sub(r"[^a-z0-9-]", "", body.org_name.lower().replace(" ", "-"))
    slug = f"{slug}-{int(time.time())}"

    try:
        org_res = supabase.table("organizations").insert({
            "name": body.org_name,
            "slug": slug,
            "plan": "trial",
        }).execute()
        org = org_res.data[0]
    except Exception as e:
        # Rollback: hapus user yang sudah dibuat
        supabase.auth.admin.delete_user(user.id)
        raise HTTPException(400, f"Gagal buat organisasi: {str(e)}")

    # 3. Update profile dengan organization_id + role owner
    try:
        supabase.table("profiles").update({
            "organization_id": org["id"],
            "role": "owner",
            "full_name": body.full_name,
        }).eq("id", user.id).execute()
    except Exception as e:
        raise HTTPException(500, f"Gagal setup profile: {str(e)}")

    return {"success": True, "message": "Akun berhasil dibuat. Silakan login."}
