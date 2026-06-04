import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import report, remediation, totp, webhooks, api_keys, audit_log, register, audit_log
from app.scheduler import start_scheduler, stop_scheduler
import os

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN", ""),
    integrations=[StarletteIntegration(), FastApiIntegration()],
    traces_sample_rate=0.1,
    environment=os.getenv("ENVIRONMENT", "production"),
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()

app = FastAPI(title="Vigilix API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app", "https://www.vigilix.id", "https://vigilix.id"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(report.router, prefix="/api")
app.include_router(remediation.router)
app.include_router(totp.router)
app.include_router(webhooks.router)
app.include_router(api_keys.router)
app.include_router(audit_log.router)
app.include_router(register.router)
app.include_router(audit_log.router)
app.include_router(register.router)

@app.get("/")
def root():
    return {"status": "ok", "service": "Vigilix API"}







