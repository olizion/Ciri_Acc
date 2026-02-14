"""
Notifications API Routes
In-app notification management
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from datetime import datetime
import uuid

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from models.notification import Notification

router = APIRouter()


async def _resolve_company_id(db: AsyncSession, raw_id: str | None) -> uuid.UUID:
    """Resolve company_id: use provided if valid, else fall back to first company."""
    from models.company import Company

    if raw_id:
        try:
            cid = uuid.UUID(raw_id)
        except ValueError:
            cid = None
        if cid:
            result = await db.execute(select(Company.id).where(Company.id == cid))
            if result.scalar_one_or_none():
                return cid

    result = await db.execute(select(Company.id).limit(1))
    company_id = result.scalar_one_or_none()
    if not company_id:
        raise HTTPException(status_code=400, detail="Ingen bedrift funnet")
    return company_id


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    reference_id: str | None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]


class UnreadCountResponse(BaseModel):
    count: int


def _to_response(n: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=str(n.id),
        title=n.title,
        message=n.message,
        type=n.type,
        reference_id=n.reference_id,
        is_read=n.is_read,
        created_at=n.created_at,
    )


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    company_id: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """List notifications."""
    resolved_id = await _resolve_company_id(db, company_id)
    query = (
        select(Notification)
        .where(Notification.company_id == resolved_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    if unread_only:
        query = query.where(Notification.is_read == False)

    result = await db.execute(query)
    notifications = result.scalars().all()
    return NotificationListResponse(
        items=[_to_response(n) for n in notifications],
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    company_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get unread notification count."""
    resolved_id = await _resolve_company_id(db, company_id)
    result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.company_id == resolved_id,
            Notification.is_read == False,
        )
    )
    return UnreadCountResponse(count=result.scalar_one())


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read."""
    company_id = await _resolve_company_id(db)
    result = await db.execute(
        select(Notification).where(
            Notification.id == uuid.UUID(notification_id),
            Notification.company_id == company_id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Varsel ikke funnet")

    notification.is_read = True
    await db.flush()
    await db.refresh(notification)
    return _to_response(notification)


@router.post("/read-all")
async def mark_all_read(
    company_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    resolved_id = await _resolve_company_id(db, company_id)
    await db.execute(
        update(Notification)
        .where(
            Notification.company_id == resolved_id,
            Notification.is_read == False,
        )
        .values(is_read=True)
    )
    return {"ok": True}
