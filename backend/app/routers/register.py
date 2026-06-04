import os
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

        # Kirim email welcome ke user
    try:
        import httpx
        resend_key = os.environ.get("RESEND_API_KEY", "")
        if resend_key:
            async with httpx.AsyncClient() as client:
                # Email welcome ke user
                await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
                    json={
                        "from": "Vigilix <noreply@vigilix.id>",
                        "to": [body.email],
                        "subject": "Selamat datang di Vigilix! 🛡️",
                        "html": f"""
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                            <h2 style="color:#534AB7">Selamat datang di Vigilix, {body.full_name}! 🛡️</h2>
                            <p>Akun kamu sudah berhasil dibuat. Kamu mendapat <strong>30 hari free trial</strong> untuk explore semua fitur.</p>
                            <p><strong>Yang bisa kamu lakukan sekarang:</strong></p>
                            <ul>
                                <li>Buat project pertama kamu</li>
                                <li>Tambah temuan keamanan</li>
                                <li>Invite anggota tim</li>
                                <li>Export PDF report</li>
                            </ul>
                            <a href="https://www.vigilix.id/dashboard" style="background:#534AB7;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:16px 0">Mulai Sekarang →</a>
                            <p style="color:#666;font-size:14px">Ada pertanyaan? Balas email ini atau hubungi idris092004@vigilix.id</p>
                            <p style="color:#666;font-size:14px">— Idris, Founder Vigilix</p>
                        </div>
                        """
                    }
                )
                # Notifikasi ke founder
                await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
                    json={
                        "from": "Vigilix System <noreply@vigilix.id>",
                        "to": ["idris092004@vigilix.id"],
                        "subject": f"🎉 User baru daftar: {body.full_name}",
                        "html": f"""
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                            <h2 style="color:#534AB7">Ada user baru di Vigilix! 🎉</h2>
                            <table style="width:100%;border-collapse:collapse">
                                <tr><td style="padding:8px;border:1px solid #eee"><strong>Nama</strong></td><td style="padding:8px;border:1px solid #eee">{body.full_name}</td></tr>
                                <tr><td style="padding:8px;border:1px solid #eee"><strong>Email</strong></td><td style="padding:8px;border:1px solid #eee">{body.email}</td></tr>
                                <tr><td style="padding:8px;border:1px solid #eee"><strong>Organisasi</strong></td><td style="padding:8px;border:1px solid #eee">{body.org_name}</td></tr>
                            </table>
                            <p style="color:#666;font-size:14px;margin-top:16px">Cek Supabase dashboard untuk detail lengkap.</p>
                        </div>
                        """
                    }
                )
    except Exception:
        pass  # Email gagal tidak boleh block register

    return {"success": True, "message": "Akun berhasil dibuat. Silakan login."}


