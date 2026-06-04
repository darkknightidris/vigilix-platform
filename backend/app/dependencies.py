"""
dependencies.py — Vigilix Backend
===================================
FastAPI dependency injection untuk auth dan Supabase client.
Digunakan oleh router yang butuh autentikasi (misal: remediation.py).
"""

import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client

# ── Supabase config ───────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

bearer_scheme = HTTPBearer()


def get_supabase() -> Client:
    """
    Return Supabase client dengan service role key.
    Digunakan untuk operasi server-side (bypass RLS jika perlu).
    """
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    supabase: Client = Depends(get_supabase),
) -> dict:
    """
    Validasi JWT token dari header Authorization: Bearer <token>.
    Return user dict jika valid, raise 401 jika tidak.
    """
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token tidak valid atau sudah expired",
            )
        return response.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Autentikasi gagal: {str(e)}",
        )
