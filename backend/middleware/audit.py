"""
Audit Middleware
Logs all requests for compliance (Bokforingsloven §4)
"""

import uuid
import logging
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from fastapi import Response

from utils.jwt_utils import decode_access_token

logger = logging.getLogger(__name__)


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all API requests.

    Creates immutable audit trail for compliance with
    Bokforingsloven §4 (security and audit trail requirements).
    """

    # Paths to skip (health checks, static files, docs)
    SKIP_PATHS = {"/api/health", "/api/docs", "/api/redoc", "/openapi.json"}

    # Skip GET requests to reduce noise (configurable)
    SKIP_GET = True

    async def dispatch(self, request: Request, call_next):
        """Process request and log to audit trail."""

        # Skip certain paths
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        # Skip GET requests if configured (they don't mutate data)
        if self.SKIP_GET and request.method == "GET":
            return await call_next(request)

        # Capture request info
        start_time = datetime.utcnow()
        request_id = str(uuid.uuid4())

        # Extract user info from JWT
        user_id = None
        company_id = None
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
            payload = decode_access_token(token)
            if payload:
                user_id = payload.get("sub")
                company_id = payload.get("company_id")

        # Process request
        response: Response = await call_next(request)

        # Build audit entry
        duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        audit_entry = {
            "id": request_id,
            "timestamp": start_time,
            "user_id": user_id,
            "company_id": company_id,
            "action": self._get_action(request.method),
            "resource_type": self._get_resource_type(request.url.path),
            "resource_id": self._get_resource_id(request.url.path),
            "ip_address": self._get_client_ip(request),
            "user_agent": request.headers.get("user-agent"),
            "details": {
                "method": request.method,
                "path": request.url.path,
                "query": str(request.query_params) if request.query_params else None,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 1),
            },
        }

        # Save to database asynchronously (fire-and-forget)
        try:
            await self._save_audit_log(audit_entry)
        except Exception as e:
            # Audit save failures must NEVER crash the request
            logger.warning(f"Audit log save failed: {e}")

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        return response

    async def _save_audit_log(self, entry: dict) -> None:
        """Persist audit log entry to the database."""
        from config.database import async_session_maker
        from models.audit_log import AuditLog

        async with async_session_maker() as session:
            log = AuditLog(
                id=uuid.UUID(entry["id"]),
                timestamp=entry["timestamp"],
                user_id=uuid.UUID(entry["user_id"]) if entry["user_id"] else None,
                company_id=uuid.UUID(entry["company_id"]) if entry["company_id"] else None,
                action=entry["action"],
                resource_type=entry["resource_type"],
                resource_id=entry["resource_id"],
                ip_address=entry["ip_address"],
                user_agent=entry["user_agent"],
                details=entry["details"],
            )
            session.add(log)
            await session.commit()

    def _get_action(self, method: str) -> str:
        """Map HTTP method to action."""
        return {
            "GET": "view",
            "POST": "create",
            "PUT": "update",
            "PATCH": "update",
            "DELETE": "delete",
        }.get(method, "unknown")

    def _get_resource_type(self, path: str) -> str:
        """Extract resource type from path."""
        parts = path.strip("/").split("/")
        if len(parts) >= 2:
            return parts[1]  # e.g., /api/bilag -> bilag
        return "unknown"

    def _get_resource_id(self, path: str) -> str | None:
        """Extract resource ID from path if present."""
        parts = path.strip("/").split("/")
        if len(parts) >= 3:
            potential_id = parts[2]
            if potential_id and not potential_id.startswith("_"):
                return potential_id
        return None

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP, handling proxies."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
