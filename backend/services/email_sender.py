"""
Async Email Sender
Sends outbound emails via Resend API (preferred) or SMTP fallback.
"""

import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import httpx
import aiosmtplib

from config.settings import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html_body: str) -> bool:
    """
    Send an HTML email.

    Tries Resend API first (if configured), falls back to SMTP.

    Args:
        to: Recipient email address
        subject: Email subject line
        html_body: HTML content

    Returns:
        True if sent successfully, False otherwise
    """
    if settings.resend_key:
        return await _send_via_resend(to, subject, html_body)

    if settings.smtp_host:
        return await _send_via_smtp(to, subject, html_body)

    logger.warning("No email provider configured (set RESEND_KEY or SMTP_HOST)")
    return False


async def _send_via_resend(to: str, subject: str, html_body: str) -> bool:
    """Send email via Resend API."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": f"{settings.smtp_from_name} <{settings.smtp_from_email}>",
                    "to": [to],
                    "subject": subject,
                    "html": html_body,
                },
                timeout=30.0,
            )

        if response.status_code in (200, 201):
            email_id = response.json().get("id", "unknown")
            logger.info(f"Email sent via Resend to {to}: {subject} (id={email_id})")
            return True
        else:
            logger.error(f"Resend API error {response.status_code}: {response.text}")
            return False

    except Exception as e:
        logger.error(f"Failed to send email via Resend to {to}: {e}")
        return False


async def _send_via_smtp(to: str, subject: str, html_body: str) -> bool:
    """Send email via SMTP (fallback)."""
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            start_tls=True,
        )
        logger.info(f"Email sent via SMTP to {to}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email via SMTP to {to}: {e}")
        return False
