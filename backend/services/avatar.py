"""
Avatar Storage Service
Handles upload, retrieval, and deletion of employee profile pictures via S3.

Bucket: getciriinthebucket
Prefix: Avatars/
"""

import logging
import uuid
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from config.settings import settings

logger = logging.getLogger(__name__)

S3_BUCKET = settings.s3_bucket_name or "getciriinthebucket"
S3_PREFIX = "Avatars"
PRESIGNED_URL_EXPIRY = 3600  # 1 hour


def _get_s3_client():
    """Get a configured S3 client with regional endpoint for correct presigned URLs."""
    from botocore.config import Config

    region = settings.aws_region or "eu-north-1"
    kwargs: dict = {
        "region_name": region,
        "endpoint_url": f"https://s3.{region}.amazonaws.com",
        "config": Config(signature_version="s3v4"),
    }
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.client("s3", **kwargs)


async def upload_avatar(employee_id: str, content: bytes, content_type: str) -> str:
    """
    Upload an avatar image to S3.

    Returns the S3 key for storage in the database.
    """
    ext = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }.get(content_type, "jpg")

    # Use a unique filename to bust caches on re-upload
    filename = f"{employee_id}_{uuid.uuid4().hex[:8]}.{ext}"
    s3_key = f"{S3_PREFIX}/{filename}"

    client = _get_s3_client()
    try:
        client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=content,
            ContentType=content_type,
        )
        logger.info(f"Avatar uploaded: s3://{S3_BUCKET}/{s3_key}")
        return s3_key
    except ClientError as e:
        logger.error(f"S3 upload failed: {e}")
        raise RuntimeError(f"Kunne ikke laste opp bilde: {e}")


async def delete_avatar(s3_key: str) -> None:
    """Delete an avatar from S3."""
    client = _get_s3_client()
    try:
        client.delete_object(Bucket=S3_BUCKET, Key=s3_key)
        logger.info(f"Avatar deleted: s3://{S3_BUCKET}/{s3_key}")
    except ClientError as e:
        logger.warning(f"S3 delete failed for {s3_key}: {e}")


def get_avatar_url(s3_key: Optional[str]) -> Optional[str]:
    """
    Get a presigned URL for an avatar.

    Returns None if no key provided or S3 is not configured.
    """
    if not s3_key:
        return None

    if not settings.aws_access_key_id:
        # S3 not configured — return None gracefully
        return None

    client = _get_s3_client()
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET, "Key": s3_key},
            ExpiresIn=PRESIGNED_URL_EXPIRY,
        )
        return url
    except ClientError as e:
        logger.warning(f"Failed to generate presigned URL for {s3_key}: {e}")
        return None
