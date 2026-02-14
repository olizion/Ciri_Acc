"""
Email Webhook API Routes
Receives inbound emails from email providers (Postmark, SendGrid)
"""

from fastapi import APIRouter, Request, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from config.settings import settings
from services.email_monitor import email_monitor, InboundEmail, CiriActivity

router = APIRouter()


class WebhookResponse(BaseModel):
    """Response for webhook endpoints."""
    success: bool
    message: str
    processed_count: int = 0


class ActivityResponse(BaseModel):
    """Response for activity feed."""
    activities: list[dict]
    total: int


# =============================================================================
# POSTMARK INBOUND WEBHOOK
# =============================================================================

@router.post("/postmark", response_model=WebhookResponse)
async def postmark_inbound_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Receive inbound emails from Postmark.

    Setup in Postmark:
    1. Go to Servers → Your Server → Settings → Inbound
    2. Set webhook URL to: https://your-api.com/api/email/postmark
    3. Configure inbound address: bilag@inbound.yourdomain.com
    """
    try:
        payload = await request.json()

        # Parse the email
        email = await email_monitor.process_postmark_webhook(payload)

        # Process in background to respond quickly
        background_tasks.add_task(process_email_async, email)

        return WebhookResponse(
            success=True,
            message=f"E-post mottatt fra {email.from_email}",
            processed_count=len(email.invoice_attachments)
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Kunne ikke behandle webhook: {str(e)}")


# =============================================================================
# SENDGRID INBOUND PARSE WEBHOOK
# =============================================================================

@router.post("/sendgrid", response_model=WebhookResponse)
async def sendgrid_inbound_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Receive inbound emails from SendGrid Inbound Parse.

    Setup in SendGrid:
    1. Go to Settings → Inbound Parse
    2. Add host/domain and point to: https://your-api.com/api/email/sendgrid
    3. Configure MX records for your domain
    """
    try:
        # SendGrid sends form data, not JSON
        form_data = await request.form()
        payload = dict(form_data)

        # Handle file uploads (attachments)
        for key in form_data:
            if hasattr(form_data[key], 'read'):
                payload[key] = await form_data[key].read()

        email = await email_monitor.process_sendgrid_webhook(payload)

        background_tasks.add_task(process_email_async, email)

        return WebhookResponse(
            success=True,
            message=f"E-post mottatt fra {email.from_email}",
            processed_count=len(email.invoice_attachments)
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Kunne ikke behandle webhook: {str(e)}")


# =============================================================================
# MANUAL EMAIL SUBMISSION
# =============================================================================

class ManualEmailSubmission(BaseModel):
    """Manual email/bilag submission."""
    from_email: str
    subject: str
    body: Optional[str] = None
    attachments: list[dict] = []  # [{filename, content_base64, content_type}]


@router.post("/submit", response_model=WebhookResponse)
async def submit_email_manually(
    submission: ManualEmailSubmission,
    background_tasks: BackgroundTasks
):
    """
    Manually submit an email/bilag to Ciri.

    Users can forward emails to a specific address, or use this endpoint
    to manually upload documents that came via email.
    """
    from services.email_monitor import EmailAttachment

    attachments = [
        EmailAttachment(
            filename=att["filename"],
            content_type=att.get("content_type", "application/octet-stream"),
            content_base64=att["content_base64"],
            size_bytes=len(att["content_base64"])
        )
        for att in submission.attachments
    ]

    email = InboundEmail(
        message_id=f"MANUAL-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        from_email=submission.from_email,
        to_email="bilag@ciri.no",
        subject=submission.subject,
        text_body=submission.body,
        attachments=attachments,
        received_at=datetime.now()
    )

    background_tasks.add_task(process_email_async, email)

    return WebhookResponse(
        success=True,
        message="Bilag sendt til behandling",
        processed_count=len(attachments)
    )


# =============================================================================
# CIRI ACTIVITY FEED
# =============================================================================

@router.get("/activities", response_model=ActivityResponse)
async def get_ciri_activities(limit: int = 20):
    """
    Get Ciri's recent activity feed.

    Shows what Ciri has been doing:
    - Emails received and processed
    - Bilags extracted and OCR'd
    - Automatic categorizations
    - Matches found
    """
    activities = email_monitor.get_recent_activities(limit)

    return ActivityResponse(
        activities=[
            {
                "id": a.id,
                "type": a.type,
                "title": a.title,
                "description": a.description,
                "metadata": a.metadata,
                "created_at": a.created_at.isoformat()
            }
            for a in activities
        ],
        total=len(activities)
    )


@router.get("/activities/stats")
async def get_activity_stats():
    """
    Get statistics about Ciri's email processing.
    """
    activities = email_monitor.activities

    # Count by type
    type_counts = {}
    for a in activities:
        type_counts[a.type] = type_counts.get(a.type, 0) + 1

    # Today's activities
    today = datetime.now().date()
    today_count = sum(1 for a in activities if a.created_at.date() == today)

    return {
        "total_activities": len(activities),
        "today_count": today_count,
        "by_type": type_counts,
        "last_activity": activities[0].created_at.isoformat() if activities else None
    }


# =============================================================================
# CONFIGURATION STATUS
# =============================================================================

@router.get("/config/status")
async def get_email_config_status():
    """
    Check email monitoring configuration status.
    """
    return {
        "provider": settings.email_provider,
        "inbound_address": settings.email_inbound_address,
        "is_configured": bool(settings.email_inbound_address),
        "webhook_urls": {
            "postmark": "/api/email/postmark",
            "sendgrid": "/api/email/sendgrid",
            "manual": "/api/email/submit"
        },
        "setup_instructions": {
            "postmark": "Set POSTMARK_INBOUND_TOKEN and configure webhook URL in Postmark dashboard",
            "sendgrid": "Configure Inbound Parse in SendGrid and point to webhook URL"
        }
    }


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

async def process_email_async(email: InboundEmail):
    """
    Process email in background.
    """
    try:
        processed_bilags = await email_monitor.process_incoming_email(email)

        # Here you would:
        # 1. Save bilags to database
        # 2. Queue them for OCR processing
        # 3. Attempt auto-matching with bank transactions

        for bilag in processed_bilags:
            # TODO: Save to database
            # TODO: Queue for OCR
            pass

    except Exception as e:
        # Log error but don't crash
        email_monitor._log_activity(
            type="processing_error",
            title="Behandlingsfeil",
            description=f"Feil ved behandling av e-post: {str(e)}",
            metadata={"error": str(e), "email_id": email.message_id}
        )
