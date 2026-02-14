"""
Email Inbox Service
Fetches emails from Gmail and Outlook using OAuth tokens
"""

import base64
import io
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
import logging
import httpx

from config.settings import settings
from services.encryption import decrypt_token, encrypt_token

logger = logging.getLogger(__name__)


# =============================================================================
# Data Models
# =============================================================================

class EmailAttachment(BaseModel):
    """Attachment from an email."""
    filename: str
    content_type: str
    content_base64: str
    size_bytes: int

    @property
    def is_invoice_candidate(self) -> bool:
        """Check if this attachment could be an invoice."""
        invoice_extensions = {'.pdf', '.csv', '.xlsx', '.xls', '.png', '.jpg', '.jpeg'}
        invoice_mimes = {
            'application/pdf',
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/png',
            'image/jpeg',
        }

        filename_lower = self.filename.lower()
        has_invoice_extension = any(filename_lower.endswith(ext) for ext in invoice_extensions)
        has_invoice_mime = self.content_type.lower() in invoice_mimes

        return has_invoice_extension or has_invoice_mime


class Email(BaseModel):
    """Parsed email from inbox."""
    message_id: str
    subject: str
    from_email: str
    from_name: str | None
    to_email: str
    received_at: datetime
    body_text: str | None
    body_html: str | None
    attachments: list[EmailAttachment]

    @property
    def invoice_attachments(self) -> list[EmailAttachment]:
        """Filter to only invoice-candidate attachments."""
        return [a for a in self.attachments if a.is_invoice_candidate]


class TokenRefreshResult(BaseModel):
    """Result of token refresh."""
    access_token: str
    refresh_token: str | None
    expires_at: datetime


# =============================================================================
# Gmail Service
# =============================================================================

class GmailService:
    """Service for reading Gmail via API."""

    BASE_URL = "https://gmail.googleapis.com/gmail/v1"

    def __init__(self, access_token: str, refresh_token: str | None = None):
        self.access_token = access_token
        self.refresh_token = refresh_token

    async def refresh_access_token(self) -> TokenRefreshResult:
        """Refresh the access token using refresh token."""
        if not self.refresh_token:
            raise ValueError("No refresh token available")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "refresh_token": self.refresh_token,
                    "grant_type": "refresh_token",
                },
            )

            if response.status_code != 200:
                raise Exception(f"Token refresh failed: {response.text}")

            data = response.json()
            expires_in = data.get("expires_in", 3600)

            self.access_token = data["access_token"]

            return TokenRefreshResult(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token"),  # May not be returned
                expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
            )

    async def list_messages(
        self,
        query: str = "",
        max_results: int = 50,
        after_message_id: str | None = None,
    ) -> list[str]:
        """
        List message IDs from inbox.

        Args:
            query: Gmail search query (e.g., "has:attachment")
            max_results: Maximum number of messages to return
            after_message_id: Only return messages newer than this ID
        """
        # Build query for invoice-like emails
        base_query = "has:attachment (pdf OR xlsx OR csv OR invoice OR faktura OR receipt OR kvittering)"
        if query:
            full_query = f"{base_query} {query}"
        else:
            full_query = base_query

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/users/me/messages",
                params={
                    "q": full_query,
                    "maxResults": max_results,
                },
                headers={"Authorization": f"Bearer {self.access_token}"},
            )

            if response.status_code == 401:
                # Token expired, try refresh
                await self.refresh_access_token()
                return await self.list_messages(query, max_results, after_message_id)

            if response.status_code != 200:
                raise Exception(f"Failed to list messages: {response.text}")

            data = response.json()
            messages = data.get("messages", [])

            message_ids = [m["id"] for m in messages]

            # Filter to only new messages if after_message_id specified
            if after_message_id and after_message_id in message_ids:
                idx = message_ids.index(after_message_id)
                message_ids = message_ids[:idx]

            return message_ids

    async def get_message(self, message_id: str) -> Email:
        """
        Get full message with attachments.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/users/me/messages/{message_id}",
                params={"format": "full"},
                headers={"Authorization": f"Bearer {self.access_token}"},
            )

            if response.status_code == 401:
                await self.refresh_access_token()
                return await self.get_message(message_id)

            if response.status_code != 200:
                raise Exception(f"Failed to get message: {response.text}")

            data = response.json()
            return self._parse_message(data)

    async def get_attachment(self, message_id: str, attachment_id: str) -> bytes:
        """Get attachment content."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/users/me/messages/{message_id}/attachments/{attachment_id}",
                headers={"Authorization": f"Bearer {self.access_token}"},
            )

            if response.status_code == 401:
                await self.refresh_access_token()
                return await self.get_attachment(message_id, attachment_id)

            if response.status_code != 200:
                raise Exception(f"Failed to get attachment: {response.text}")

            data = response.json()
            # Gmail returns URL-safe base64
            content = data.get("data", "")
            # Convert URL-safe base64 to standard base64
            content = content.replace("-", "+").replace("_", "/")
            return base64.b64decode(content)

    def _parse_message(self, data: dict) -> Email:
        """Parse Gmail message format into Email model."""
        headers = {h["name"].lower(): h["value"] for h in data.get("payload", {}).get("headers", [])}

        # Parse from
        from_header = headers.get("from", "")
        if "<" in from_header:
            from_name = from_header.split("<")[0].strip().strip('"')
            from_email = from_header.split("<")[1].rstrip(">")
        else:
            from_name = None
            from_email = from_header

        # Parse date
        internal_date = int(data.get("internalDate", 0))
        received_at = datetime.fromtimestamp(internal_date / 1000)

        # Parse body and attachments
        body_text = None
        body_html = None
        attachments = []

        def parse_parts(parts: list):
            nonlocal body_text, body_html, attachments

            for part in parts:
                mime_type = part.get("mimeType", "")
                body = part.get("body", {})

                if mime_type == "text/plain" and not body_text:
                    if "data" in body:
                        body_text = base64.urlsafe_b64decode(body["data"]).decode("utf-8", errors="ignore")

                elif mime_type == "text/html" and not body_html:
                    if "data" in body:
                        body_html = base64.urlsafe_b64decode(body["data"]).decode("utf-8", errors="ignore")

                elif body.get("attachmentId"):
                    filename = part.get("filename", "attachment")
                    attachments.append({
                        "attachment_id": body["attachmentId"],
                        "filename": filename,
                        "content_type": mime_type,
                        "size": body.get("size", 0),
                    })

                if "parts" in part:
                    parse_parts(part["parts"])

        payload = data.get("payload", {})
        if "parts" in payload:
            parse_parts(payload["parts"])
        elif payload.get("body", {}).get("attachmentId"):
            # Single-part message with attachment
            attachments.append({
                "attachment_id": payload["body"]["attachmentId"],
                "filename": payload.get("filename", "attachment"),
                "content_type": payload.get("mimeType", "application/octet-stream"),
                "size": payload["body"].get("size", 0),
            })

        return Email(
            message_id=data["id"],
            subject=headers.get("subject", "(no subject)"),
            from_email=from_email,
            from_name=from_name,
            to_email=headers.get("to", ""),
            received_at=received_at,
            body_text=body_text,
            body_html=body_html,
            attachments=[],  # Will be populated with full content later
        ), attachments  # Return attachments separately for lazy loading

    async def fetch_emails_with_attachments(
        self,
        max_emails: int = 20,
        after_message_id: str | None = None,
    ) -> list[Email]:
        """
        Fetch emails with their attachments loaded.
        """
        message_ids = await self.list_messages(max_results=max_emails, after_message_id=after_message_id)
        logger.info(f"Gmail: {len(message_ids)} messages found")
        emails = []

        for msg_id in message_ids:
            try:
                email, attachment_refs = await self.get_message(msg_id)

                # Load invoice-candidate attachments
                loaded_attachments = []
                for ref in attachment_refs:
                    temp_attachment = EmailAttachment(
                        filename=ref["filename"],
                        content_type=ref["content_type"],
                        content_base64="",
                        size_bytes=ref["size"],
                    )
                    if temp_attachment.is_invoice_candidate:
                        content = await self.get_attachment(msg_id, ref["attachment_id"])
                        loaded_attachments.append(EmailAttachment(
                            filename=ref["filename"],
                            content_type=ref["content_type"],
                            content_base64=base64.b64encode(content).decode(),
                            size_bytes=len(content),
                        ))

                email.attachments = loaded_attachments
                if email.attachments:
                    emails.append(email)

            except Exception as e:
                logger.warning(f"Error fetching message {msg_id}: {e}", exc_info=True)
                continue

        logger.info(f"Gmail: {len(emails)} emails with invoice attachments")
        return emails


# =============================================================================
# Outlook/Microsoft Graph Service
# =============================================================================

class OutlookService:
    """Service for reading Outlook via Microsoft Graph API."""

    BASE_URL = "https://graph.microsoft.com/v1.0"

    def __init__(self, access_token: str, refresh_token: str | None = None):
        self.access_token = access_token
        self.refresh_token = refresh_token

    async def refresh_access_token(self) -> TokenRefreshResult:
        """Refresh the access token using refresh token."""
        if not self.refresh_token:
            raise ValueError("No refresh token available")

        tenant = settings.microsoft_tenant_id or "common"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
                data={
                    "client_id": settings.microsoft_client_id,
                    "client_secret": settings.microsoft_client_secret,
                    "refresh_token": self.refresh_token,
                    "grant_type": "refresh_token",
                    "scope": "Mail.Read User.Read offline_access",
                },
            )

            if response.status_code != 200:
                raise Exception(f"Token refresh failed: {response.text}")

            data = response.json()
            expires_in = data.get("expires_in", 3600)

            self.access_token = data["access_token"]

            return TokenRefreshResult(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token"),
                expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
            )

    async def list_messages(
        self,
        max_results: int = 50,
        after_datetime: datetime | None = None,
    ) -> list[dict]:
        """
        List messages with attachments from inbox.
        """
        # Filter for messages with attachments
        filter_query = "hasAttachments eq true"
        if after_datetime:
            filter_query += f" and receivedDateTime gt {after_datetime.isoformat()}Z"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/me/messages",
                params={
                    "$filter": filter_query,
                    "$top": max_results,
                    "$select": "id,subject,from,toRecipients,receivedDateTime,body,hasAttachments",
                    "$orderby": "receivedDateTime desc",
                },
                headers={"Authorization": f"Bearer {self.access_token}"},
            )

            if response.status_code == 401:
                await self.refresh_access_token()
                return await self.list_messages(max_results, after_datetime)

            if response.status_code != 200:
                raise Exception(f"Failed to list messages: {response.text}")

            data = response.json()
            return data.get("value", [])

    async def get_attachments(self, message_id: str) -> list[dict]:
        """Get attachments for a message."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/me/messages/{message_id}/attachments",
                headers={"Authorization": f"Bearer {self.access_token}"},
            )

            if response.status_code == 401:
                await self.refresh_access_token()
                return await self.get_attachments(message_id)

            if response.status_code != 200:
                raise Exception(f"Failed to get attachments: {response.text}")

            data = response.json()
            return data.get("value", [])

    async def fetch_emails_with_attachments(
        self,
        max_emails: int = 20,
        after_datetime: datetime | None = None,
    ) -> list[Email]:
        """
        Fetch emails with their attachments loaded.
        """
        messages = await self.list_messages(max_results=max_emails, after_datetime=after_datetime)
        emails = []

        for msg in messages:
            try:
                # Get attachments
                attachments_data = await self.get_attachments(msg["id"])

                # Filter and load invoice-candidate attachments
                loaded_attachments = []
                for att in attachments_data:
                    if att.get("@odata.type") != "#microsoft.graph.fileAttachment":
                        continue

                    temp = EmailAttachment(
                        filename=att.get("name", "attachment"),
                        content_type=att.get("contentType", "application/octet-stream"),
                        content_base64="",
                        size_bytes=att.get("size", 0),
                    )

                    if temp.is_invoice_candidate:
                        loaded_attachments.append(EmailAttachment(
                            filename=att.get("name", "attachment"),
                            content_type=att.get("contentType", "application/octet-stream"),
                            content_base64=att.get("contentBytes", ""),
                            size_bytes=att.get("size", 0),
                        ))

                if not loaded_attachments:
                    continue

                # Parse from
                from_data = msg.get("from", {}).get("emailAddress", {})
                from_email = from_data.get("address", "")
                from_name = from_data.get("name")

                # Parse to
                to_recipients = msg.get("toRecipients", [])
                to_email = to_recipients[0].get("emailAddress", {}).get("address", "") if to_recipients else ""

                # Parse received time
                received_str = msg.get("receivedDateTime", "")
                received_at = datetime.fromisoformat(received_str.replace("Z", "+00:00"))

                emails.append(Email(
                    message_id=msg["id"],
                    subject=msg.get("subject", "(no subject)"),
                    from_email=from_email,
                    from_name=from_name,
                    to_email=to_email,
                    received_at=received_at,
                    body_text=msg.get("body", {}).get("content") if msg.get("body", {}).get("contentType") == "text" else None,
                    body_html=msg.get("body", {}).get("content") if msg.get("body", {}).get("contentType") == "html" else None,
                    attachments=loaded_attachments,
                ))

            except Exception as e:
                logger.warning(f"Error fetching Outlook message {msg.get('id')}: {e}")
                continue

        return emails


# =============================================================================
# Unified Email Service
# =============================================================================

async def fetch_emails_for_connection(
    provider: str,
    access_token: str,
    refresh_token: str | None,
    max_emails: int = 20,
    after_message_id: str | None = None,
    after_datetime: datetime | None = None,
) -> tuple[list[Email], TokenRefreshResult | None]:
    """
    Fetch emails for a connection, handling token refresh.

    Returns:
        Tuple of (emails, token_refresh_result or None)
    """
    token_refresh = None

    if provider == "google":
        service = GmailService(access_token, refresh_token)
        try:
            emails = await service.fetch_emails_with_attachments(max_emails, after_message_id)
        except Exception as e:
            if "401" in str(e) and refresh_token:
                token_refresh = await service.refresh_access_token()
                emails = await service.fetch_emails_with_attachments(max_emails, after_message_id)
            else:
                raise

        # Check if token was refreshed during requests
        if service.access_token != access_token:
            token_refresh = TokenRefreshResult(
                access_token=service.access_token,
                refresh_token=refresh_token,
                expires_at=datetime.utcnow() + timedelta(hours=1),
            )

    elif provider == "microsoft":
        service = OutlookService(access_token, refresh_token)
        try:
            emails = await service.fetch_emails_with_attachments(max_emails, after_datetime)
        except Exception as e:
            if "401" in str(e) and refresh_token:
                token_refresh = await service.refresh_access_token()
                emails = await service.fetch_emails_with_attachments(max_emails, after_datetime)
            else:
                raise

        if service.access_token != access_token:
            token_refresh = TokenRefreshResult(
                access_token=service.access_token,
                refresh_token=refresh_token,
                expires_at=datetime.utcnow() + timedelta(hours=1),
            )

    else:
        raise ValueError(f"Unknown provider: {provider}")

    return emails, token_refresh
