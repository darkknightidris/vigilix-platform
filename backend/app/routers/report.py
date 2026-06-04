from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import io
from app.pdf_generator import generate_pdf

router = APIRouter()

class VulnItem(BaseModel):
    title: str
    severity: str
    status: str
    cvss_score: Optional[float] = None
    description: Optional[str] = None
    steps_to_reproduce: Optional[str] = None

class ReportRequest(BaseModel):
    project_name: str
    org_name: str
    logo_url: Optional[str] = None
    vulnerabilities: List[VulnItem]
    prepared_by: Optional[str] = None

@router.post("/report/generate")
async def generate_report(data: ReportRequest):
    try:
        pdf_bytes = generate_pdf(data)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=report-{data.project_name}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
