"""
totp.py - Vigilix Backend
==========================
Router untuk 2FA TOTP: setup, verify, enable, disable.
"""
import pyotp
import qrcode
import qrcode.image.svg
import io
import base64
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.dependencies import get_current_user, get_supabase

router = APIRouter(prefix="/api/totp", tags=["2FA TOTP"])

# ── Models ──────────────────────────────────────────────────────────────────
class VerifyTOTPRequest(BaseModel):
    code: str

class DisableTOTPRequest(BaseModel):
    code: str

# ── GET /api/totp/setup ──────────────────────────────────────────────────────
@router.get("/setup")
async def setup_totp(
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Generate TOTP secret baru dan return QR code (base64 PNG)."""
    user_id = current_user.id
    user_email = current_user.email

    # Cek apakah 2FA sudah aktif
    profile = supabase.table("profiles").select("totp_enabled, totp_secret").eq("id", user_id).single().execute()
    if profile.data and profile.data.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="2FA sudah aktif. Nonaktifkan dulu sebelum setup ulang.")

    # Generate secret baru
    secret = pyotp.random_base32()

    # Simpan secret (belum diaktifkan)
    supabase.table("profiles").update({
        "totp_secret": secret,
        "totp_enabled": False
    }).eq("id", user_id).execute()

    # Buat TOTP URI untuk QR code
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user_email, issuer_name="Vigilix")

    # Generate QR code sebagai base64 PNG
    qr = qrcode.QRCode(version=1, box_size=8, border=4)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "secret": secret,
        "qr_code": f"data:image/png;base64,{qr_base64}",
        "uri": uri
    }

# ── POST /api/totp/verify-and-enable ────────────────────────────────────────
@router.post("/verify-and-enable")
async def verify_and_enable_totp(
    body: VerifyTOTPRequest,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Verifikasi kode TOTP dari authenticator app, lalu aktifkan 2FA."""
    user_id = current_user.id

    profile = supabase.table("profiles").select("totp_secret, totp_enabled").eq("id", user_id).single().execute()
    if not profile.data or not profile.data.get("totp_secret"):
        raise HTTPException(status_code=400, detail="Setup TOTP dulu sebelum verifikasi.")

    secret = profile.data["totp_secret"]
    totp = pyotp.TOTP(secret)

    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Kode TOTP tidak valid atau sudah expired.")

    # Aktifkan 2FA
    supabase.table("profiles").update({"totp_enabled": True}).eq("id", user_id).execute()

    return {"success": True, "message": "2FA berhasil diaktifkan."}

# ── POST /api/totp/verify-login ──────────────────────────────────────────────
@router.post("/verify-login")
async def verify_login_totp(
    body: VerifyTOTPRequest,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Verifikasi kode TOTP saat login (setelah password benar)."""
    user_id = current_user.id

    profile = supabase.table("profiles").select("totp_secret, totp_enabled").eq("id", user_id).single().execute()
    if not profile.data or not profile.data.get("totp_enabled"):
        return {"success": True, "required": False}

    secret = profile.data["totp_secret"]
    totp = pyotp.TOTP(secret)

    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Kode TOTP tidak valid.")

    return {"success": True, "required": True}

# ── POST /api/totp/disable ───────────────────────────────────────────────────
@router.post("/disable")
async def disable_totp(
    body: DisableTOTPRequest,
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Nonaktifkan 2FA dengan verifikasi kode terakhir."""
    user_id = current_user.id

    profile = supabase.table("profiles").select("totp_secret, totp_enabled").eq("id", user_id).single().execute()
    if not profile.data or not profile.data.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="2FA tidak aktif.")

    secret = profile.data["totp_secret"]
    totp = pyotp.TOTP(secret)

    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Kode TOTP tidak valid.")

    supabase.table("profiles").update({
        "totp_secret": None,
        "totp_enabled": False
    }).eq("id", user_id).execute()

    return {"success": True, "message": "2FA berhasil dinonaktifkan."}

# ── GET /api/totp/status ─────────────────────────────────────────────────────
@router.get("/status")
async def get_totp_status(
    current_user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    """Cek status 2FA user saat ini."""
    user_id = current_user.id
    profile = supabase.table("profiles").select("totp_enabled").eq("id", user_id).single().execute()
    enabled = profile.data.get("totp_enabled", False) if profile.data else False
    return {"totp_enabled": enabled}
