"""
Maskinporten Authentication Service
Handles machine-to-machine authentication with Norwegian government APIs

Documentation: https://docs.digdir.no/docs/Maskinporten/
"""

import base64
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import httpx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import jwt

from config.settings import settings


class MaskinportenError(Exception):
    """Custom exception for Maskinporten errors."""
    pass


class MaskinportenService:
    """
    Service for authenticating with Maskinporten and obtaining access tokens.

    Maskinporten is Norway's OAuth2 solution for machine-to-machine communication
    between businesses and government APIs.

    Setup instructions:
    1. Register at https://samarbeid.digdir.no
    2. Create a new integration (integrasjon)
    3. Request the scopes you need (e.g., skatteetaten:skattekort)
    4. Upload your virksomhetssertifikat public key
    5. Configure the settings below with your client_id and private key
    """

    # Maskinporten endpoints
    ENDPOINTS = {
        "test": {
            "token": "https://test.maskinporten.no/token",
            "issuer": "https://test.maskinporten.no/",
            "jwks": "https://test.maskinporten.no/jwk",
        },
        "prod": {
            "token": "https://maskinporten.no/token",
            "issuer": "https://maskinporten.no/",
            "jwks": "https://maskinporten.no/jwk",
        },
    }

    def __init__(self):
        self.env = settings.maskinporten_env
        self.client_id = settings.maskinporten_client_id
        self.issuer = settings.maskinporten_issuer
        self.kid = settings.maskinporten_kid
        self._private_key = None
        self._token_cache: dict = {}

    @property
    def endpoints(self) -> dict:
        """Get endpoints for current environment."""
        return self.ENDPOINTS.get(self.env, self.ENDPOINTS["test"])

    def _load_private_key(self):
        """Load the private key from file or environment variable."""
        if self._private_key:
            return self._private_key

        # Try loading from base64 encoded string first
        if settings.maskinporten_private_key_base64:
            try:
                key_bytes = base64.b64decode(settings.maskinporten_private_key_base64)
                self._private_key = serialization.load_pem_private_key(
                    key_bytes, password=None, backend=default_backend()
                )
                return self._private_key
            except Exception as e:
                raise MaskinportenError(f"Failed to load private key from base64: {e}")

        # Try loading from file
        key_path = Path(settings.maskinporten_private_key_path)
        if key_path.exists():
            try:
                with open(key_path, "rb") as f:
                    self._private_key = serialization.load_pem_private_key(
                        f.read(), password=None, backend=default_backend()
                    )
                return self._private_key
            except Exception as e:
                raise MaskinportenError(f"Failed to load private key from file: {e}")

        raise MaskinportenError(
            "No private key configured. Set either:\n"
            "  - maskinporten_private_key_path: Path to PEM file\n"
            "  - maskinporten_private_key_base64: Base64 encoded PEM key"
        )

    def _create_jwt_assertion(self, scope: str) -> str:
        """
        Create a signed JWT assertion for the token request.

        The JWT must be signed with your virksomhetssertifikat private key.
        If Altinn system user credentials are configured, includes
        authorization_details for system user authentication (required by
        Skatteetaten APIs).
        """
        if not self.client_id:
            raise MaskinportenError(
                "maskinporten_client_id not configured. "
                "Get this from Samarbeidsportalen after creating an integration."
            )

        now = int(time.time())

        payload = {
            "aud": self.endpoints["issuer"],
            "iss": self.client_id,
            "scope": scope,
            "iat": now,
            "exp": now + 120,  # 2 minute expiry
            "jti": str(uuid.uuid4()),  # Unique ID to prevent replay
        }

        # If we have an organization number, include it
        if self.issuer:
            payload["consumer_org"] = self.issuer

        # Include Altinn system user authorization_details if configured
        # Required by Skatteetaten APIs for system user authentication
        # Note: only type, systemuser_org, and externalRef go in the request JWT.
        # Maskinporten returns systemuser_id and system_id in the response token.
        if settings.altinn_systemuser_id and settings.altinn_system_id:
            auth_detail = {
                "type": "urn:altinn:systemuser",
                "systemuser_org": {
                    "authority": "iso6523-actorid-upis",
                    "ID": f"0192:{self.issuer}",
                },
            }
            if settings.altinn_external_ref:
                auth_detail["externalRef"] = settings.altinn_external_ref
            payload["authorization_details"] = [auth_detail]

        private_key = self._load_private_key()

        # Convert to PEM format for jwt library
        private_key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )

        headers = {}
        if self.kid:
            headers["kid"] = self.kid

        return jwt.encode(payload, private_key_pem, algorithm="RS256", headers=headers)

    async def get_token(self, scope: str) -> str:
        """
        Get an access token for the specified scope.

        Tokens are cached until they expire.

        Args:
            scope: The scope to request (e.g., "skatteetaten:skattekort")

        Returns:
            Access token string
        """
        # Check cache
        cached = self._token_cache.get(scope)
        if cached and cached["expires_at"] > datetime.now():
            return cached["access_token"]

        # Create JWT assertion
        assertion = self._create_jwt_assertion(scope)

        # Exchange for token
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.endpoints["token"],
                    data={
                        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                        "assertion": assertion,
                    },
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                )

                if response.status_code != 200:
                    error_detail = response.text
                    raise MaskinportenError(
                        f"Token request failed ({response.status_code}): {error_detail}"
                    )

                data = response.json()

                # Cache the token
                expires_in = data.get("expires_in", 3600)
                self._token_cache[scope] = {
                    "access_token": data["access_token"],
                    "expires_at": datetime.now() + timedelta(seconds=expires_in - 60),
                }

                return data["access_token"]

            except httpx.RequestError as e:
                raise MaskinportenError(f"Network error during token request: {e}")

    def is_configured(self) -> bool:
        """Check if Maskinporten credentials are configured."""
        has_key = (
            settings.maskinporten_private_key_base64 or
            Path(settings.maskinporten_private_key_path).exists()
        )
        return bool(self.client_id) and bool(self.kid) and has_key

    def get_configuration_status(self) -> dict:
        """Get the current configuration status for debugging."""
        key_path = Path(settings.maskinporten_private_key_path)

        return {
            "environment": self.env,
            "client_id_set": bool(self.client_id),
            "kid_set": bool(self.kid),
            "issuer_set": bool(self.issuer),
            "private_key_file_exists": key_path.exists(),
            "private_key_base64_set": bool(settings.maskinporten_private_key_base64),
            "is_configured": self.is_configured(),
            "token_endpoint": self.endpoints["token"],
        }


# Singleton instance
maskinporten = MaskinportenService()
