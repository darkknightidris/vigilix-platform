from datetime import datetime
from typing import Optional

def log_activity(
    supabase,
    organization_id: str,
    user_id: str,
    user_email: str,
    user_name: str,
    action: str,
    resource_type: str = None,
    resource_id: str = None,
    resource_name: str = None,
    project_id: str = None,
    metadata: dict = None,
    ip_address: str = None,
):
    try:
        supabase.table("activity_logs").insert({
            "organization_id": organization_id,
            "user_id": user_id,
            "user_email": user_email,
            "user_name": user_name,
            "action": action,
            "resource_type": resource_type,
            "resource_id": str(resource_id) if resource_id else None,
            "resource_name": resource_name,
            "project_id": str(project_id) if project_id else None,
            "metadata": metadata or {},
            "ip_address": ip_address,
            "created_at": datetime.utcnow().isoformat(),
        }).execute()
    except Exception as e:
        print(f"[audit_log] Failed to write log: {e}")
