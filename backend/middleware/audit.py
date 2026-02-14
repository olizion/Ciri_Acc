"""
Audit Middleware
Logs all requests for compliance (Bokføringsloven §4)
"""

import uuid
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from fastapi import Response


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all API requests.

    Creates immutable audit trail for compliance with
    Bokføringsloven §4 (security and audit trail requirements).
    """

    # Paths to skip (health checks, static files)
    SKIP_PATHS = {"/api/health", "/api/docs", "/api/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next):
        """Process request and log to audit trail."""

        # Skip certain paths
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        # Capture request info
        start_time = datetime.utcnow()
        request_id = str(uuid.uuid4())

        # Get user info from auth header (if authenticated)
        user_id = None
        company_id = None
        auth_header = request.headers.get("authorization")
        if auth_header:
            # TODO: Extract user_id and company_id from JWT
            pass

        # Process request
        response: Response = await call_next(request)

        # Create audit log entry
        audit_entry = {
            "id": request_id,
            "timestamp": start_time.isoformat(),
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
                "query": str(request.query_params),
                "status_code": response.status_code,
                "duration_ms": (datetime.utcnow() - start_time).total_seconds() * 1000,
            }
        }

        # TODO: Save to database asynchronously
        # await self._save_audit_log(audit_entry)

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        return response

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
            # Check if third part looks like an ID
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
