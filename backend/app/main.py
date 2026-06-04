from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import report

app = FastAPI(title="Vigilix API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(report.router, prefix="/api")

@app.get("/")
def root():
    return {"status": "ok", "service": "Vigilix API"}
