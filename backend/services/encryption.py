"""
Encryption Service
Token encryption/decryption for OAuth credentials + PII field encryption.

Two interfaces:
  1. encrypt_token / decrypt_token — for OAuth access/refresh tokens (base64 wrapped)
  2. encrypt_field / decrypt_field — for PII columns (personnummer, bank accounts)
     Uses "enc:" prefix so plaintext legacy data can coexist during migration.
"""

from __future__ import annotations

import base64
import logging
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from config.settings import settings

logger = logging.getLogger(__name__)

# ── Shared Fernet instance ──────────────────────────────────────────────

def _get_fernet() -> Fernet:
    """
    Get Fernet instance for encryption/decryption.
    Derives key from settings.encryption_key using PBKDF2.
    """
    if not settings.encryption_key:
        raise RuntimeError("encryption_key not configured in settings. Set ENCRYPTION_KEY in .env")

    # Use PBKDF2 to derive a proper key from the settings key
    salt = b"ciri-email-tokens"  # Fixed salt for consistent key derivation
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(settings.encryption_key.encode()))
    return Fernet(key)


# ── OAuth Token Encryption (base64-wrapped) ─────────────────────────────

def encrypt_token(token: str) -> str:
    """
    Encrypt a token (access_token or refresh_token).

    Args:
        token: The plaintext token to encrypt

    Returns:
        Base64-encoded encrypted token
    """
    if not token:
        return ""

    fernet = _get_fernet()
    encrypted = fernet.encrypt(token.encode())
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt a token.

    Args:
        encrypted_token: The encrypted token from database

    Returns:
        Plaintext token
    """
    if not encrypted_token:
        return ""

    fernet = _get_fernet()
    encrypted_bytes = base64.urlsafe_b64decode(encrypted_token.encode())
    decrypted = fernet.decrypt(encrypted_bytes)
    return decrypted.decode()


# ── PII Field Encryption (prefix-tagged) ────────────────────────────────
# Uses "enc:" prefix so legacy plaintext data still decrypts correctly.
# This allows gradual migration: old rows return plaintext, new rows are encrypted.

_ENC_PREFIX = "enc:"


def encrypt_field(value: str | None) -> str | None:
    """
    Encrypt a plaintext PII string for database storage.
    Returns None if input is None.  Idempotent — already-encrypted values pass through.
    """
    if value is None:
        return None
    if value.startswith(_ENC_PREFIX):
        return value  # already encrypted
    fernet = _get_fernet()
    token = fernet.encrypt(value.encode("utf-8"))
    return _ENC_PREFIX + token.decode("ascii")


def decrypt_field(value: str | None) -> str | None:
    """
    Decrypt an encrypted PII string from the database.
    Returns None if input is None.
    Plaintext values (without prefix) pass through for migration compatibility.
    """
    if value is None:
        return None
    if not value.startswith(_ENC_PREFIX):
        return value  # plaintext (legacy or PURGED sentinel)
    try:
        token_bytes = value[len(_ENC_PREFIX):].encode("ascii")
        fernet = _get_fernet()
        return fernet.decrypt(token_bytes).decode("utf-8")
    except (InvalidToken, Exception) as e:
        logger.error(f"PII field decryption failed: {e}")
        return None


def is_encrypted(value: str | None) -> bool:
    """Check if a value is already encrypted."""
    return value is not None and value.startswith(_ENC_PREFIX)
