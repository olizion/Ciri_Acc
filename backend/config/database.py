"""
Database Configuration
PostgreSQL with SQLAlchemy async
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from config.settings import settings


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncSession:
    """Dependency for getting database session."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables and seed default data."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed default company if none exists
    await _seed_default_company()


async def _seed_default_company():
    """Create a default company for development if none exists."""
    import uuid as _uuid
    from sqlalchemy import select

    # Deterministic UUID matching frontend COMPANY_ID constant
    COMPANY_UUID = _uuid.UUID("00000000-0000-0000-0000-000000000001")

    async with async_session_maker() as session:
        from models.company import Company
        result = await session.execute(select(Company).limit(1))
        if result.scalar_one_or_none() is None:
            company = Company(
                id=COMPANY_UUID,
                org_number="999888777",
                name="Min Bedrift AS",
                street_address="Eksempelveien 1",
                postal_code="4000",
                city="Stavanger",
                industry_code="62.020",
                industry_description="Konsulentvirksomhet innen datateknikk",
                mva_registered=True,
            )
            session.add(company)
            await session.commit()
            print(f"🏢 Default company created: {company.name} ({company.org_number})")
