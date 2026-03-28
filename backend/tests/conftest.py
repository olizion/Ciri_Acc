"""
Shared test fixtures for Ciri backend regression tests.
Uses a real test database — no mocks for financial data.
"""

import asyncio
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from config.database import Base, get_db
from config.settings import settings
from main import app

# ---------------------------------------------------------------------------
# Event loop
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

# ---------------------------------------------------------------------------
# Database — isolated transaction per test
# ---------------------------------------------------------------------------

TEST_DB_URL = settings.database_url.replace("/ciri", "/ciri_test") if hasattr(settings, "database_url") else "postgresql+asyncpg://ciri:ciri@localhost:5432/ciri_test"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """Create all tables once per test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional DB session that rolls back after each test."""
    async with test_engine.connect() as conn:
        txn = await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        yield session
        await session.close()
        await txn.rollback()


# ---------------------------------------------------------------------------
# HTTP client
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient wired to the FastAPI app with DB override."""

    async def _override_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Seed fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def seed_company(db_session: AsyncSession):
    """Create a default test company."""
    from models.company import Company

    company = Company(
        id=uuid.uuid4(),
        name="Test Bedrift AS",
        org_number="999999999",
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(company)
    await db_session.flush()
    return company


@pytest_asyncio.fixture
async def auth_headers(seed_company) -> dict:
    """Auth headers scoped to the test company."""
    return {
        "X-Company-ID": str(seed_company.id),
        "Content-Type": "application/json",
    }


@pytest_asyncio.fixture
async def seed_bilag(db_session: AsyncSession, seed_company):
    """Create a bilag with linked posteringer."""
    from models.bilag import Bilag, BilagStatus
    from models.postering import Postering

    bilag = Bilag(
        id=uuid.uuid4(),
        company_id=seed_company.id,
        bilag_number="TEST-001",
        document_date=date(2026, 1, 15),
        description="Test bilag",
        status=BilagStatus.GODKJENT,
        total_amount=Decimal("1000.00"),
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(bilag)
    await db_session.flush()

    postering = Postering(
        id=uuid.uuid4(),
        bilag_id=bilag.id,
        company_id=seed_company.id,
        account_number="1920",
        description="Test postering",
        debit_amount=Decimal("1000.00"),
        credit_amount=Decimal("0.00"),
        date=date(2026, 1, 15),
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(postering)
    await db_session.flush()

    return bilag
