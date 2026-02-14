"""
Email Monitoring Service for Ciri
Monitors incoming emails for invoices and receipts, processes them automatically.

Supports multiple providers:
- Postmark Inbound (recommended)
- SendGrid Inbound Parse
- Generic IMAP polling (fallback)
"""

import asyncio
import base64
import hashlib
import re
from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr
import httpx

from config.settings import settings


class EmailProvider(str, Enum):
    POSTMARK = "postmark"
    SENDGRID = "sendgrid"
    IMAP = "imap"


class EmailAttachment(BaseModel):
    """Parsed email attachment."""
    filename: str
    content_type: str
    content_base64: str
    size_bytes: int

    @property
    def content(self) -> bytes:
        return base64.b64decode(self.content_base64)

    @property
    def is_invoice_candidate(self) -> bool:
        """Check if attachment might be an invoice/receipt."""
        invoice_extensions = {'.pdf', '.png', '.jpg', '.jpeg', '.gif', '.tiff'}
        ext = '.' + self.filename.lower().split('.')[-1] if '.' in self.filename else ''
        return ext in invoice_extensions or self.content_type.startswith(('image/', 'application/pdf'))


class InboundEmail(BaseModel):
    """Parsed inbound email."""
    message_id: str
    from_email: str
    from_name: Optional[str] = None
    to_email: str
    subject: str
    text_body: Optional[str] = None
    html_body: Optional[str] = None
    attachments: list[EmailAttachment] = []
    received_at: datetime
    raw_headers: dict = {}

    @property
    def has_attachments(self) -> bool:
        return len(self.attachments) > 0

    @property
    def invoice_attachments(self) -> list[EmailAttachment]:
        return [a for a in self.attachments if a.is_invoice_candidate]


class ProcessedBilag(BaseModel):
    """Result of processing an email into a bilag."""
    id: str
    source_email_id: str
    filename: str
    supplier_name: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    category: Optional[str] = None
    ocr_confidence: float = 0.0
    status: str = "pending_review"
    created_at: datetime


class CiriActivity(BaseModel):
    """Activity log entry for Ciri's actions."""
    id: str
    type: str  # email_received, bilag_processed, bilag_matched, etc.
    title: str
    description: str
    metadata: dict = {}
    created_at: datetime


class EmailMonitorService:
    """
    Service for monitoring and processing incoming emails.

    Flow:
    1. Email arrives at bilag@yourcompany.ciri.no (or similar)
    2. Email provider sends webhook to our API
    3. We parse the email and extract attachments
    4. Each attachment is sent through OCR
    5. Bilag is created and added to the system
    6. Activity is logged to Ciri's timeline
    """

    def __init__(self):
        self.provider = settings.email_provider
        self.company_name = settings.company_name
        self.activities: list[CiriActivity] = []

    async def process_postmark_webhook(self, payload: dict) -> InboundEmail:
        """Parse Postmark inbound webhook payload."""
        attachments = []
        for att in payload.get("Attachments", []):
            attachments.append(EmailAttachment(
                filename=att["Name"],
                content_type=att["ContentType"],
                content_base64=att["Content"],
                size_bytes=att.get("ContentLength", len(att["Content"]))
            ))

        return InboundEmail(
            message_id=payload.get("MessageID", ""),
            from_email=payload.get("FromFull", {}).get("Email", payload.get("From", "")),
            from_name=payload.get("FromFull", {}).get("Name"),
            to_email=payload.get("ToFull", [{}])[0].get("Email", payload.get("To", "")),
            subject=payload.get("Subject", ""),
            text_body=payload.get("TextBody"),
            html_body=payload.get("HtmlBody"),
            attachments=attachments,
            received_at=datetime.fromisoformat(payload.get("Date", datetime.now().isoformat()).replace("Z", "+00:00")),
            raw_headers={h["Name"]: h["Value"] for h in payload.get("Headers", [])}
        )

    async def process_sendgrid_webhook(self, payload: dict) -> InboundEmail:
        """Parse SendGrid inbound parse webhook payload."""
        attachments = []

        # SendGrid sends attachments differently
        attachment_info = payload.get("attachment-info", {})
        for key, info in attachment_info.items():
            if key in payload:
                attachments.append(EmailAttachment(
                    filename=info.get("filename", "attachment"),
                    content_type=info.get("type", "application/octet-stream"),
                    content_base64=base64.b64encode(payload[key].encode() if isinstance(payload[key], str) else payload[key]).decode(),
                    size_bytes=len(payload[key])
                ))

        return InboundEmail(
            message_id=payload.get("headers", {}).get("Message-ID", ""),
            from_email=payload.get("from", ""),
            from_name=None,
            to_email=payload.get("to", ""),
            subject=payload.get("subject", ""),
            text_body=payload.get("text"),
            html_body=payload.get("html"),
            attachments=attachments,
            received_at=datetime.now(),
            raw_headers=payload.get("headers", {})
        )

    def _extract_sender_company(self, email: InboundEmail) -> Optional[str]:
        """Try to extract company name from sender."""
        # Common patterns for company emails
        patterns = [
            r"faktura@(.+?)\.no",
            r"invoice@(.+?)\.com",
            r"noreply@(.+?)\.",
            r"@(.+?)\.(no|com|org)",
        ]

        for pattern in patterns:
            match = re.search(pattern, email.from_email.lower())
            if match:
                company = match.group(1).replace("-", " ").replace("_", " ").title()
                return company

        # Use from_name if available
        if email.from_name:
            return email.from_name

        return None

    def _is_relevant_email(self, email: InboundEmail) -> bool:
        """
        Check if email is relevant (invoice/receipt for this company).

        Criteria:
        - Has attachments that look like invoices
        - Subject contains invoice-related keywords
        - OR sender is known supplier
        """
        invoice_keywords = [
            "faktura", "invoice", "kvittering", "receipt",
            "betaling", "payment", "ordre", "order",
            "bekreftelse", "confirmation"
        ]

        subject_lower = email.subject.lower()
        has_invoice_keyword = any(kw in subject_lower for kw in invoice_keywords)
        has_invoice_attachments = len(email.invoice_attachments) > 0

        return has_invoice_keyword or has_invoice_attachments

    async def process_incoming_email(self, email: InboundEmail) -> list[ProcessedBilag]:
        """
        Process an incoming email and extract bilags.

        Returns list of processed bilags.
        """
        processed = []

        if not self._is_relevant_email(email):
            # Log that we received but ignored the email
            self._log_activity(
                type="email_ignored",
                title="E-post ignorert",
                description=f"E-post fra {email.from_email} ble ignorert (ikke faktura/kvittering)",
                metadata={"subject": email.subject, "from": email.from_email}
            )
            return processed

        sender_company = self._extract_sender_company(email)

        # Log email received
        self._log_activity(
            type="email_received",
            title="E-post mottatt",
            description=f"Mottok e-post fra {sender_company or email.from_email} med {len(email.invoice_attachments)} vedlegg",
            metadata={
                "subject": email.subject,
                "from": email.from_email,
                "attachments": len(email.invoice_attachments)
            }
        )

        # Process each invoice attachment
        for attachment in email.invoice_attachments:
            bilag = await self._process_attachment(
                attachment=attachment,
                email=email,
                sender_company=sender_company
            )
            if bilag:
                processed.append(bilag)

                # Log bilag processed
                self._log_activity(
                    type="bilag_processed",
                    title="Bilag behandlet",
                    description=f"Behandlet {attachment.filename} fra {sender_company or 'ukjent'}",
                    metadata={
                        "bilag_id": bilag.id,
                        "amount": bilag.amount,
                        "supplier": bilag.supplier_name
                    }
                )

        return processed

    async def _process_attachment(
        self,
        attachment: EmailAttachment,
        email: InboundEmail,
        sender_company: Optional[str]
    ) -> Optional[ProcessedBilag]:
        """Process a single attachment through OCR and create bilag."""
        try:
            # Generate unique ID
            content_hash = hashlib.md5(attachment.content).hexdigest()[:8]
            bilag_id = f"EM-{datetime.now().strftime('%Y%m%d')}-{content_hash}"

            # TODO: Send to OCR service for processing
            # For now, create a pending bilag
            # ocr_result = await ocr_service.process_image(attachment.content)

            return ProcessedBilag(
                id=bilag_id,
                source_email_id=email.message_id,
                filename=attachment.filename,
                supplier_name=sender_company,
                amount=None,  # Will be filled by OCR
                date=None,    # Will be filled by OCR
                category=None,
                ocr_confidence=0.0,
                status="pending_ocr",
                created_at=datetime.now()
            )

        except Exception as e:
            self._log_activity(
                type="bilag_error",
                title="Feil ved behandling",
                description=f"Kunne ikke behandle {attachment.filename}: {str(e)}",
                metadata={"error": str(e), "filename": attachment.filename}
            )
            return None

    def _log_activity(self, type: str, title: str, description: str, metadata: dict = {}):
        """Log an activity to Ciri's timeline."""
        activity = CiriActivity(
            id=f"ACT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{len(self.activities)}",
            type=type,
            title=title,
            description=description,
            metadata=metadata,
            created_at=datetime.now()
        )
        self.activities.insert(0, activity)  # Most recent first

        # Keep only last 100 activities in memory
        if len(self.activities) > 100:
            self.activities = self.activities[:100]

    def get_recent_activities(self, limit: int = 20) -> list[CiriActivity]:
        """Get recent Ciri activities."""
        return self.activities[:limit]


# Singleton instance
email_monitor = EmailMonitorService()
