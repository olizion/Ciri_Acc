"""
Ciri Backend API
AI-powered accounting system for Norwegian businesses
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config.settings import settings
from config.database import init_db
from config.redis import init_redis, close_redis
from api import auth, company, ciri, bilag, reports, ocr, employees, email_webhook, email_oauth, bank, invoices, notifications, amelding, mva, altinn
from middleware.audit import AuditMiddleware
from middleware.rate_limit import RateLimitMiddleware
from tasks.email_monitor_task import start_email_monitor, stop_email_monitor
from tasks.bank_sync import start_bank_sync_task, stop_bank_sync_task
from tasks.batch_reconciliation_task import start_batch_reconciliation_task, stop_batch_reconciliation_task
from tasks.weekly_summary_task import start_weekly_summary_task, stop_weekly_summary_task
from tasks.retention_cleanup_task import start_retention_cleanup_task, stop_retention_cleanup_task
from tasks.periodisering_scan_task import start_periodisering_scan_task, stop_periodisering_scan_task

# Import all models so Base.metadata knows about them
import models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("🚀 Starting Ciri API...")
    # Initialize database tables
    await init_db()
    print("✅ Database tables initialized")

    # Initialize Redis cache
    try:
        await init_redis()
        print("✅ Redis cache connected")
    except Exception as e:
        print(f"⚠️ Redis unavailable, caching disabled: {e}")

    # Seed test data (idempotent)
    from seed_data import seed_test_data
    await seed_test_data()

    # Background tasks disabled — enable individually as needed
    # Email monitor: polls inboxes every 5 min, calls Claude to parse attachments
    # if settings.google_client_id or settings.microsoft_client_id:
    #     print("📧 Starting email monitor...")
    #     start_email_monitor()
    print("📧 Email monitor disabled (enable in main.py when ready)")

    # Bank sync: polls bank APIs for new transactions
    # if settings.neonomics_client_id:
    #     print("🏦 Starting bank sync monitor...")
    #     start_bank_sync_task()
    print("🏦 Bank sync disabled (enable in main.py when ready)")

    # Batch reconciliation: calls Claude every 30 min to match transactions to bilags
    # if settings.anthropic_api_key:
    #     print("🤖 Starting batch reconciliation task...")
    #     start_batch_reconciliation_task()
    print("🤖 Batch reconciliation disabled (enable in main.py when ready)")

    # Weekly summary email task
    # print("📊 Starting weekly summary task...")
    # start_weekly_summary_task()
    print("📊 Weekly summary disabled (enable in main.py when ready)")

    # Retention cleanup: purges expired data daily at 02:00 (Bokforingsloven + GDPR)
    if settings.retention_cleanup_enabled:
        print("🗃️ Starting retention cleanup task...")
        start_retention_cleanup_task()
    else:
        print("🗃️ Retention cleanup disabled (set RETENTION_CLEANUP_ENABLED=true)")

    # Periodisering scan: weekly LLM assessment of manual bilags (Sunday 03:00)
    if settings.anthropic_api_key:
        print("📅 Starting weekly periodisering scan task...")
        start_periodisering_scan_task()
    else:
        print("📅 Periodisering scan disabled (ANTHROPIC_API_KEY required)")

    yield

    # Shutdown
    print("👋 Shutting down Ciri API...")
    await close_redis()
    stop_email_monitor()
    stop_bank_sync_task()
    stop_batch_reconciliation_task()
    stop_weekly_summary_task()
    stop_retention_cleanup_task()
    stop_periodisering_scan_task()


app = FastAPI(
    title="Ciri API",
    description="AI-powered accounting for Norwegian businesses",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting Middleware (outermost — runs first)
app.add_middleware(RateLimitMiddleware)

# Audit Logging Middleware
app.add_middleware(AuditMiddleware)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(company.router, prefix="/api/company", tags=["Company"])
app.include_router(ciri.router, prefix="/api/ciri", tags=["Ciri AI"])
app.include_router(bilag.router, prefix="/api/bilag", tags=["Bilag"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR"])
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])
app.include_router(email_webhook.router, prefix="/api/email", tags=["Email Monitoring"])
app.include_router(email_oauth.router, prefix="/api/email/oauth", tags=["Email OAuth"])
app.include_router(bank.router, prefix="/api/bank", tags=["Bank & Reconciliation"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(amelding.router, prefix="/api/amelding", tags=["A-melding"])
app.include_router(mva.router, prefix="/api/mva", tags=["MVA Reporting"])
app.include_router(altinn.router, prefix="/api/altinn", tags=["Altinn System User"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}


@app.get("/api/admin/retention/status")
async def retention_status():
    """Check retention cleanup configuration and last run status."""
    from tasks.retention_cleanup_task import _cleanup_task
    return {
        "enabled": settings.retention_cleanup_enabled,
        "scheduled_hour": settings.retention_cleanup_hour,
        "task_running": _cleanup_task is not None and not _cleanup_task.done(),
    }


@app.post("/api/admin/retention/run")
async def trigger_retention_purge(dry_run: bool = True):
    """
    Manually trigger a retention purge cycle.
    Use dry_run=true (default) to preview what would be purged.
    """
    from config.database import async_session_maker
    from services.retention_service import RetentionService

    async with async_session_maker() as session:
        service = RetentionService(session)
        if dry_run:
            summary = await service.preview_purge_cycle()
            return {"mode": "dry_run", "would_purge": summary}
        else:
            summary = await service.run_purge_cycle()
            await session.commit()
            return {"mode": "live", "result": summary}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler with Norwegian error messages."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": "Noe gikk galt. Prøv igjen senere.",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
