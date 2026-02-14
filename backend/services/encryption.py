"""
Encryption Service
Token encryption/decryption for OAuth credentials
"""

import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from config.settings import settings


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
