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
from api import auth, company, ciri, bilag, reports, ocr, employees, email_webhook, email_oauth, bank, invoices, notifications
from middleware.audit import AuditMiddleware
from tasks.email_monitor_task import start_email_monitor, stop_email_monitor
from tasks.bank_sync import start_bank_sync_task, stop_bank_sync_task
from tasks.batch_reconciliation_task import start_batch_reconciliation_task, stop_batch_reconciliation_task
from tasks.weekly_summary_task import start_weekly_summary_task, stop_weekly_summary_task

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

    # Seed test data (idempotent)
    from seed_data import seed_test_data
    await seed_test_data()

    # Start email monitor background task
    if settings.google_client_id or settings.microsoft_client_id:
        print("📧 Starting email monitor...")
        start_email_monitor()
    else:
        print("📧 Email OAuth not configured, skipping email monitor")

    # Start bank sync background task
    if settings.neonomics_client_id:
        print("🏦 Starting bank sync monitor...")
        start_bank_sync_task()
    else:
        print("🏦 Neonomics not configured, skipping bank sync")

    # Start batch reconciliation (Claude AI matching)
    if settings.anthropic_api_key:
        print("🤖 Starting batch reconciliation task...")
        start_batch_reconciliation_task()
    else:
        print("🤖 Anthropic API key not configured, skipping batch reconciliation")

    # Start weekly summary email task
    print("📊 Starting weekly summary task...")
    start_weekly_summary_task()

    yield

    # Shutdown
    print("👋 Shutting down Ciri API...")
    stop_email_monitor()
    stop_bank_sync_task()
    stop_batch_reconciliation_task()
    stop_weekly_summary_task()


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


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}


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
