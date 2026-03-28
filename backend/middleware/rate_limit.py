"""
Rate Limiting Middleware
Redis-backed rate limiter for public and auth endpoints.

Protects against:
  - Brute-force login attempts
  - Public endpoint enumeration/DDoS
  - OCR endpoint abuse (expensive Claude API calls)
"""

import logging
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# Rate limit rules: path prefix → (max_requests, window_seconds)
_RATE_LIMITS: dict[str, tuple[int, int]] = {
    "/api/auth/login": (10, 60),          # 10 login attempts per minute
    "/api/auth/register": (5, 60),        # 5 registrations per minute
    "/api/auth/forgot-password": (3, 60), # 3 password resets per minute
    "/api/invoices/public/": (30, 60),    # 30 public invoice views per minute
    "/api/ocr/parse": (20, 60),           # 20 OCR parses per minute (expensive)
}


def _get_client_ip(request: Request) -> str:
    """Extract client IP, respecting X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis-backed sliding window rate limiter.
    Falls back to in-memory dict if Redis is unavailable.
    """

    def __init__(self, app):
        super().__init__(app)
        # In-memory fallback: {key: [(timestamp, ...),]}
        self._fallback: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next):
        # Find matching rate limit rule
        path = request.url.path
        rule = None
        for prefix, limits in _RATE_LIMITS.items():
            if path.startswith(prefix):
                rule = (prefix, limits[0], limits[1])
                break

        if rule is None:
            return await call_next(request)

        prefix, max_requests, window = rule
        client_ip = _get_client_ip(request)
        key = f"ratelimit:{prefix}:{client_ip}"

        # Try Redis first
        allowed = await self._check_redis(key, max_requests, window)
        if allowed is None:
            # Redis unavailable — use in-memory fallback
            allowed = self._check_memory(key, max_requests, window)

        if not allowed:
            logger.warning(f"Rate limit exceeded: {client_ip} on {path}")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "message": "For mange forespørsler. Prøv igjen om litt.",
                },
                headers={"Retry-After": str(window)},
            )

        return await call_next(request)

    async def _check_redis(self, key: str, max_requests: int, window: int) -> bool | None:
        """Check rate limit in Redis. Returns None if Redis unavailable."""
        try:
            from config.redis import get_redis
            redis = get_redis()
            if redis is None:
                return None

            now = time.time()
            pipe = redis.pipeline()
            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, now - window)
            # Count current entries
            pipe.zcard(key)
            # Add current request
            pipe.zadd(key, {str(now): now})
            # Set expiry on the key
            pipe.expire(key, window)
            results = await pipe.execute()

            current_count = results[1]
            return current_count < max_requests
        except Exception:
            return None

    def _check_memory(self, key: str, max_requests: int, window: int) -> bool:
        """In-memory fallback rate limiter."""
        now = time.time()
        timestamps = self._fallback.get(key, [])
        # Remove expired entries
        timestamps = [t for t in timestamps if now - t < window]
        if len(timestamps) >= max_requests:
            self._fallback[key] = timestamps
            return False
        timestamps.append(now)
        self._fallback[key] = timestamps
        return True
