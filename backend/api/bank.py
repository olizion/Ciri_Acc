"""
Bank API Endpoints
Norwegian bank integration via GoCardless (FREE) or direct PSD2

Integration Options:
1. GOCARDLESS (Recommended - FREE)
   - No eIDAS certificate required
   - Covers 2,500+ European banks including all Norwegian banks
   - Free tier: 50 connections/month, 4 syncs/day

2. DIRECT (Requires eIDAS certificate ~NOK 50,000)
   - DNB (54% market share)
   - Nordea (10% market share)
   - SpareBank 1 (15% combined market share)

All integrations return data in Berlin Group NextGenPSD2 format.
"""

import logging
import uuid
from datetime import datetime, date, timedelta, timezone

logger = logging.getLogger(__name__)
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc

from config.database import get_db
from config.settings import settings
from models import (
    BankAccount, BankAccountStatus, BankAggregator,
    BankTransaction, TransactionDirection, ReconciliationStatus, TransactionCategory,
    ReconciliationMatch, MatchType, MatchConfidence, MatchStatus,
    ReconciliationRule, RuleType, RulePriority,
    Company, AutonomyLevel,
    Bilag,
    Konto,
)
from services.rule_cascade import cascade_ignore_rule
# Bank integrations
from services.bank_integration import (
    bank_manager,
    BankError,
    BankAccountInfo as BankAccountData,
    BankTransactionInfo as BankTransactionData,
    KontoutskriftExport,
    # Roaring.io (Sandbox-friendly - Mock ASPSP)
    RoaringClient,
    RoaringAdapter,
    get_roaring_client,
    get_norwegian_banks_roaring,
    # GoCardless (FREE)
    GoCardlessClient,
    GoCardlessAdapter,
    get_gocardless_client,
    get_norwegian_banks as get_gocardless_norwegian_banks,
    create_gocardless_adapter,
    # Tink (by Visa) - Recommended for Norwegian banks
    TinkClient,
    TinkAdapter,
    get_tink_client,
    get_norwegian_banks_tink,
    create_tink_adapter,
)
# Legacy aggregator (kept for backward compatibility)
try:
    from services.bank_aggregator import neonomics_client, NORWEGIAN_BANKS, NeonomicsError
except ImportError:
    neonomics_client = None
    NORWEGIAN_BANKS = []
    class NeonomicsError(Exception):
        pass
from services.reconciliation_matcher import create_matcher, ReconciliationMatcher
from services.cluster_service import record_data_point, mark_data_point_overridden
from models.cluster_data_point import DataPointSource
from tasks.bank_sync import sync_single_account

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class BankInfo(BaseModel):
    """Bank information for UI selection."""

    id: str
    name: str
    bic: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    market_share: Optional[float] = None
    description: Optional[str] = None
    is_popular: bool = False


class BankAccountResponse(BaseModel):
    """Bank account response model."""

    id: uuid.UUID
    bank_name: str
    account_number: str
    iban: Optional[str] = None
    account_name: str
    currency: str = "NOK"
    konto_number: str
    current_balance: Decimal
    available_balance: Optional[Decimal] = None
    balance_updated_at: Optional[datetime] = None
    status: str
    last_sync_at: Optional[datetime] = None
    last_sync_error: Optional[str] = None
    transaction_count: int = 0
    is_primary: bool = False
    needs_reauth: bool = False

    class Config:
        from_attributes = True


class ConnectBankRequest(BaseModel):
    """Request to connect a bank account."""

    bank_id: str = Field(..., description="Bank ID from available banks list")
    account_name: str = Field("Driftskonto", description="User-friendly name for account")
    konto_number: str = Field("1920", description="NS 4102 account number")


class ConnectBankResponse(BaseModel):
    """Response with bank authorization URL."""

    session_id: str
    authorization_url: str


class CompleteConnectionRequest(BaseModel):
    """Request to complete bank connection after OAuth."""

    session_id: str
    authorization_code: str
    state: Optional[str] = None


class BankTransactionResponse(BaseModel):
    """Bank transaction response model."""

    id: uuid.UUID
    bank_account_id: uuid.UUID
    booking_date: date
    value_date: Optional[date] = None
    amount: Decimal
    currency: str = "NOK"
    direction: str
    raw_description: str
    cleaned_description: Optional[str] = None
    merchant_name: Optional[str] = None
    reference: Optional[str] = None
    category: str
    suggested_account: Optional[str] = None
    ciri_confidence: Optional[float] = None
    reconciliation_status: str
    is_private: bool = False
    match: Optional["MatchSuggestionResponse"] = None

    class Config:
        from_attributes = True


class MatchSuggestionResponse(BaseModel):
    """Match suggestion for a transaction."""

    id: uuid.UUID
    bilag_id: Optional[uuid.UUID] = None
    bilag_number: Optional[str] = None
    bilag_description: Optional[str] = None
    confidence: str
    confidence_score: float
    ciri_explanation: str
    status: str

    # Enriched fields for the reconciliation page
    transaction_id: Optional[uuid.UUID] = None
    transaction_date: Optional[str] = None
    transaction_description: Optional[str] = None
    transaction_merchant_name: Optional[str] = None
    transaction_amount: Optional[float] = None
    bilag_amount: Optional[float] = None
    bilag_date: Optional[str] = None
    bilag_supplier: Optional[str] = None
    bilag_suggested_account: Optional[str] = None
    bilag_category: Optional[str] = None
    match_factors: Optional[dict] = None


# Rebuild model to resolve forward reference
BankTransactionResponse.model_rebuild()


class ReconciliationStatusResponse(BaseModel):
    """Overall reconciliation status for a period."""

    period: str  # "2025-01"
    bank_balance: Decimal
    booked_balance: Decimal
    difference: Decimal
    total_transactions: int
    matched_transactions: int
    unmatched_transactions: int
    pending_suggestions: int
    auto_match_rate: float  # Percentage


class CategorizeRequest(BaseModel):
    """Request to categorize a transaction."""

    category: TransactionCategory
    account_number: Optional[str] = None
    create_rule: bool = False


class MarkPrivateRequest(BaseModel):
    """Request to mark a transaction as private."""

    reason: Optional[str] = None
    create_rule: bool = False


class ConfirmMatchRequest(BaseModel):
    """Request to confirm a match."""

    feedback: Optional[str] = None


class RejectReason(str, PyEnum):
    """Structured reasons for rejecting a match."""
    PRIVATE_EXPENSE = "private_expense"       # Privat utgift, ikke forretning
    WRONG_MATCH = "wrong_match"               # Feil bilag, men transaksjonen er bedriftsrelatert
    WRONG_AMOUNT = "wrong_amount"             # Beløpet stemmer ikke
    DUPLICATE = "duplicate"                    # Duplikat/allerede bokført
    OTHER = "other"                            # Annet (med fritekst)


class RejectMatchRequest(BaseModel):
    """Request to reject a match with feedback."""

    feedback: Optional[str] = None
    correct_bilag_id: Optional[uuid.UUID] = None
    reject_reason: Optional[RejectReason] = None


class ManualMatchRequest(BaseModel):
    """Request to create a manual match."""

    transaction_id: uuid.UUID
    bilag_id: uuid.UUID


class RuleCriteriaRequest(BaseModel):
    """Criteria for a reconciliation rule."""

    description_contains: Optional[str] = None
    amount_min: Optional[Decimal] = None
    amount_max: Optional[Decimal] = None
    amount_exact: Optional[Decimal] = None
    direction: Optional[str] = None
    merchant_name: Optional[str] = None


class RuleActionRequest(BaseModel):
    """Action for a reconciliation rule."""

    category: Optional[str] = None
    account: Optional[str] = None
    mva_code: Optional[str] = None
    mark_private: Optional[bool] = None


class CreateRuleRequest(BaseModel):
    """Request to create a reconciliation rule."""

    name: str
    rule_type: RuleType
    priority: RulePriority = RulePriority.MEDIUM
    criteria: RuleCriteriaRequest
    action: RuleActionRequest


class CascadeResultResponse(BaseModel):
    """Result of cascading cleanup when an IGNORE rule is applied retroactively."""

    transactions_marked_private: int = 0
    bilags_rejected: int = 0
    matches_rejected: int = 0
    total_affected: int = 0


class RuleResponse(BaseModel):
    """Reconciliation rule response."""

    id: uuid.UUID
    name: str
    description: Optional[str] = None
    rule_type: str
    priority: str
    criteria: dict
    action: dict
    is_active: bool = True
    times_applied: int = 0
    times_overridden: int = 0
    last_applied_at: Optional[datetime] = None
    learned_from_user: bool = False
    confidence_threshold: Optional[float] = None
    created_at: Optional[datetime] = None
    cascade: Optional[CascadeResultResponse] = None

    class Config:
        from_attributes = True


# ============================================================================
# Helper Functions
# ============================================================================

async def get_company_id(db: AsyncSession) -> uuid.UUID:
    """Get current company ID (placeholder for auth integration)."""
    # In production, get from authenticated user's company
    query = select(Company).limit(1)
    result = await db.execute(query)
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=400, detail="Ingen bedrift funnet")
    return company.id


async def get_company(db: AsyncSession) -> Company:
    """Get current company (placeholder for auth integration)."""
    query = select(Company).limit(1)
    result = await db.execute(query)
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=400, detail="Ingen bedrift funnet")
    return company


# ============================================================================
# Bank Account Endpoints
# ============================================================================

@router.get("/banks", response_model=list[BankInfo])
async def list_available_banks(popular_only: bool = False):
    """
    Get list of Norwegian banks available for connection.

    Priority order:
    1. Roaring.io - Sandbox-friendly with Mock ASPSP
    2. Tink (by Visa) - Recommended for production
    3. GoCardless - FREE, covers 2,500+ European banks
    4. Direct bank integrations - Fallback (requires eIDAS certificates)
    """
    # Try Roaring.io first (sandbox-friendly)
    try:
        roaring_client = get_roaring_client()
        if roaring_client and settings.roaring_client_id and settings.roaring_client_secret:
            norwegian_banks = await get_norwegian_banks_roaring()
            banks = []
            for bank in norwegian_banks:
                is_popular = any(name in bank.name.lower() for name in ["mock", "dnb", "nordea", "sparebank", "sbanken"])
                if popular_only and not is_popular:
                    continue
                banks.append(BankInfo(
                    id=bank.id,
                    name=bank.name,
                    bic=bank.bic,
                    logo_url=bank.logo,
                    is_popular=is_popular,
                ))
            return banks
    except Exception as e:
        logger.warning(f"Roaring bank listing failed: {e}")

    # Try Tink (recommended for production)
    try:
        tink_client = get_tink_client()
        if tink_client and settings.tink_client_id and settings.tink_client_secret:
            norwegian_banks = await get_norwegian_banks_tink()
            banks = []
            for bank in norwegian_banks:
                is_popular = any(name in bank.name.lower() for name in ["dnb", "nordea", "sparebank", "sbanken"])
                if popular_only and not is_popular:
                    continue
                banks.append(BankInfo(
                    id=bank.id,
                    name=bank.name,
                    bic=bank.bic,
                    logo_url=bank.logo,
                    is_popular=is_popular,
                ))
            return banks
    except Exception as e:
        logger.warning(f"Tink bank listing failed: {e}")

    # Try GoCardless (FREE)
    try:
        gc_client = get_gocardless_client()
        if gc_client and settings.gocardless_secret_id and settings.gocardless_secret_key:
            norwegian_banks = await get_gocardless_norwegian_banks()
            banks = []
            for bank in norwegian_banks:
                is_popular = any(name in bank.name.lower() for name in ["dnb", "nordea", "sparebank", "sbanken"])
                if popular_only and not is_popular:
                    continue
                banks.append(BankInfo(
                    id=bank.id,
                    name=bank.name,
                    bic=bank.bic,
                    logo_url=bank.logo,
                    is_popular=is_popular,
                ))
            return banks
    except Exception as e:
        logger.warning(f"GoCardless bank listing failed: {e}")

    # Fallback: Use direct bank manager (requires eIDAS certificates)
    supported_banks = bank_manager.get_supported_banks(popular_only=popular_only)
    return [
        BankInfo(
            id=bank.id,
            name=bank.name,
            logo_url=bank.logo_url,
            primary_color=bank.primary_color,
            market_share=bank.market_share,
            description=bank.description,
            is_popular=bank.is_popular,
        )
        for bank in supported_banks
    ]


@router.get("/accounts", response_model=list[BankAccountResponse])
async def list_bank_accounts(db: AsyncSession = Depends(get_db)):
    """Get all connected bank accounts for the company."""
    company_id = await get_company_id(db)

    query = select(BankAccount).where(
        and_(
            BankAccount.company_id == company_id,
            BankAccount.status != BankAccountStatus.DISCONNECTED,
        )
    ).order_by(desc(BankAccount.is_primary), BankAccount.account_name)

    result = await db.execute(query)
    accounts = result.scalars().all()

    return [
        BankAccountResponse(
            id=acc.id,
            bank_name=acc.bank_name,
            account_number=acc.account_number,
            iban=acc.iban,
            account_name=acc.account_name,
            currency=acc.currency,
            konto_number=acc.konto_number,
            current_balance=acc.current_balance,
            available_balance=acc.available_balance,
            balance_updated_at=acc.balance_updated_at,
            status=acc.status.value,
            last_sync_at=acc.last_sync_at,
            last_sync_error=acc.last_sync_error,
            transaction_count=acc.transaction_count,
            is_primary=acc.is_primary,
            needs_reauth=acc.needs_reauth,
        )
        for acc in accounts
    ]


@router.post("/accounts/connect", response_model=ConnectBankResponse)
async def start_bank_connection(
    request: ConnectBankRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Start bank connection via Roaring, Tink, GoCardless, or direct integration.

    Priority order:
    1. Roaring.io - Sandbox-friendly with Mock ASPSP
    2. Tink (by Visa) - Recommended for production
    3. GoCardless - FREE, covers 2,500+ European banks
    4. Direct bank integration - Fallback (requires eIDAS certificates)

    Redirects user to the bank's authentication page where they will
    log in with BankID and grant consent.
    """
    try:
        company = await get_company(db)
        reference_id = str(uuid.uuid4())

        # Try Roaring.io first (sandbox-friendly)
        roaring_client = get_roaring_client()
        if roaring_client and settings.roaring_client_id and settings.roaring_client_secret:
            # Roaring requires pre-whitelisted redirect URLs
            redirect_uri = "https://localhost:3000/select-account"

            # Start authorization with the selected bank (or Mock ASPSP)
            bank_name = request.bank_id  # e.g. "Mock ASPSP"
            auth_data = await roaring_client.start_authorization(
                country="NO",
                bank_name=bank_name,
                redirect_url=redirect_uri,
                psu_type="business",
            )

            authorization_id = auth_data.get("authorizationId", "")
            state = auth_data.get("state", "")
            auth_url = auth_data.get("url", "")

            return ConnectBankResponse(
                session_id=f"roaring:{authorization_id}:{state}",
                authorization_url=auth_url,
            )

        # Try Tink (recommended for production)
        tink_client = get_tink_client()
        if tink_client and settings.tink_client_id and settings.tink_client_secret:
            redirect_uri = settings.tink_redirect_uri or f"{settings.frontend_url}/callback"

            # Create user for this company if not exists
            external_user_id = f"company_{company.id}"

            # Get Tink Link URL for user authentication
            # Note: Market must be enabled in Tink Console (console.tink.com)
            tink_link_url = await tink_client.get_connect_link(
                external_user_id=external_user_id,
                redirect_uri=redirect_uri,
                market="NO",
                locale="en_US",
            )

            return ConnectBankResponse(
                session_id=f"tink:{reference_id}:{external_user_id}",
                authorization_url=tink_link_url,
            )

        # Try GoCardless (FREE)
        gc_client = get_gocardless_client()
        if gc_client and settings.gocardless_secret_id and settings.gocardless_secret_key:
            redirect_uri = settings.gocardless_redirect_uri or f"{settings.backend_url}/api/bank/callback"

            # Generate token
            await gc_client.generate_token()

            # Create requisition (bank connection session)
            requisition = await gc_client.initialize_session(
                redirect_uri=redirect_uri,
                institution_id=request.bank_id,
                reference_id=reference_id,
                max_historical_days=90,
                access_valid_for_days=90,
            )

            return ConnectBankResponse(
                session_id=f"gc:{requisition.requisition_id}",
                authorization_url=requisition.link,
            )

        # Fallback to direct bank integration (requires eIDAS)
        bank_info = bank_manager.get_bank_info(request.bank_id)
        if not bank_info:
            raise HTTPException(
                status_code=400,
                detail="Ugyldig bank. Konfigurer Tink eller GoCardless credentials for full bankstøtte."
            )

        state = str(uuid.uuid4())
        redirect_uri = settings.bank_redirect_uri or f"{settings.backend_url}/api/bank/callback"

        authorization_url = await bank_manager.get_authorization_url(
            bank_id=request.bank_id,
            redirect_uri=redirect_uri,
            state=state,
        )

        return ConnectBankResponse(
            session_id=f"direct:{request.bank_id}:{state}",
            authorization_url=authorization_url,
        )

    except BankError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Kunne ikke starte banktilkobling: {e.message}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Feil ved banktilkobling: {str(e)}",
        )


@router.post("/accounts/complete", response_model=BankAccountResponse)
async def complete_bank_connection(
    request: CompleteConnectionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Complete bank connection after OAuth authorization.

    This is called after the user returns from the bank's authentication page.
    Supports both GoCardless (FREE) and direct bank integrations.
    """
    company_id = await get_company_id(db)

    try:
        # Parse session ID to determine integration type
        # Format: "roaring:authorizationId:state" for Roaring.io
        #         "gc:requisition_id" for GoCardless
        #         "direct:bank_id:state" for direct integration
        if request.session_id.startswith("roaring:"):
            # Roaring.io integration
            parts = request.session_id[8:].split(":", 1)  # Remove "roaring:" prefix
            if len(parts) != 2:
                raise HTTPException(status_code=400, detail="Ugyldig session ID")
            authorization_id, state = parts
            return await _complete_roaring_connection(
                authorization_code=request.authorization_code,
                company_id=company_id,
                db=db,
            )
        elif request.session_id.startswith("gc:"):
            # GoCardless integration (FREE)
            requisition_id = request.session_id[3:]  # Remove "gc:" prefix
            return await _complete_gocardless_connection(
                requisition_id=requisition_id,
                company_id=company_id,
                db=db,
            )
        elif request.session_id.startswith("direct:"):
            # Direct bank integration
            parts = request.session_id[7:].split(":", 1)  # Remove "direct:" prefix
            if len(parts) != 2:
                raise HTTPException(status_code=400, detail="Ugyldig session ID")
            bank_id, state = parts
            return await _complete_direct_connection(
                bank_id=bank_id,
                state=state,
                authorization_code=request.authorization_code,
                request_state=request.state,
                company_id=company_id,
                db=db,
            )
        else:
            # Legacy format: "bank_id:state"
            parts = request.session_id.split(":", 1)
            if len(parts) != 2:
                raise HTTPException(status_code=400, detail="Ugyldig session ID")
            bank_id, state = parts
            return await _complete_direct_connection(
                bank_id=bank_id,
                state=state,
                authorization_code=request.authorization_code,
                request_state=request.state,
                company_id=company_id,
                db=db,
            )

    except BankError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Kunne ikke fullføre banktilkobling: {e.message}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Feil ved banktilkobling: {str(e)}",
        )


async def _complete_roaring_connection(
    authorization_code: str,
    company_id: uuid.UUID,
    db: AsyncSession,
) -> BankAccountResponse:
    """Complete Roaring.io bank connection using authCode from redirect.

    Roaring session response format:
    {
      "session_id": "...",
      "aspsp": {"name": "Mock ASPSP", "country": "NO"},
      "accounts": [
        {
          "uid": "uuid",
          "account_id": {"iban": "...", "account_number": "...", "bic": "..."},
          "name": "...",
          "currency": "NOK",
          "cash_account_type": "CACC",
          "balances": [...]
        }
      ]
    }
    """
    client = get_roaring_client()
    if not client:
        raise HTTPException(
            status_code=500,
            detail="Roaring.io er ikke konfigurert. Legg til credentials i .env"
        )

    # Exchange authCode for session with account data
    session_data = await client.get_session(authorization_code)

    accounts = session_data.get("accounts", [])
    session_id = session_data.get("session_id", "")

    if not accounts:
        raise HTTPException(
            status_code=400,
            detail="Ingen kontoer funnet. Vennligst fullfør autorisasjonen hos banken."
        )

    # Use the first account from session (data is inline, no separate fetch needed)
    acc = accounts[0]
    account_uid = acc.get("uid", "")
    acc_id_data = acc.get("account_id", {})

    iban = acc_id_data.get("iban")
    account_number = acc_id_data.get("account_number", "")
    # Format Norwegian account number (XXXX.XX.XXXXX)
    if len(account_number.replace(".", "").replace(" ", "")) == 11:
        num = account_number.replace(".", "").replace(" ", "")
        formatted_number = f"{num[:4]}.{num[4:6]}.{num[6:]}"
    else:
        formatted_number = account_number

    # Extract balance from inline data
    current_balance = Decimal("0")
    available_balance = None
    for bal in acc.get("balances", []):
        bal_amount = bal.get("balance_amount", {})
        amount = Decimal(str(bal_amount.get("amount", "0")))
        bal_type = bal.get("balance_type", "")
        if bal_type in ("CLBD", "closingBooked", "expected"):
            current_balance = amount
        elif bal_type in ("ITAV", "interimAvailable"):
            available_balance = amount

    # Bank name from aspsp
    aspsp = session_data.get("aspsp", {})
    bank_name = aspsp.get("name", "Roaring Bank")

    # Parse consent expiry
    access = session_data.get("access", {})
    valid_until_str = access.get("valid_until")
    if valid_until_str:
        try:
            consent_expires = datetime.fromisoformat(valid_until_str.replace("Z", "+00:00"))
        except ValueError:
            consent_expires = datetime.now(timezone.utc) + timedelta(days=90)
    else:
        consent_expires = datetime.now(timezone.utc) + timedelta(days=90)

    # Create bank account record
    bank_account = BankAccount(
        company_id=company_id,
        bank_name=bank_name,
        account_number=formatted_number,
        iban=iban,
        account_name=acc.get("name") or acc.get("details") or "Konto",
        currency=acc.get("currency", "NOK"),
        konto_number="1920",  # Default to driftskonto
        aggregator=BankAggregator.ROARING,
        external_account_id=account_uid,
        consent_id=session_id,
        consent_expires_at=consent_expires,
        current_balance=current_balance,
        available_balance=available_balance,
        balance_updated_at=datetime.now(timezone.utc),
        status=BankAccountStatus.ACTIVE,
    )

    db.add(bank_account)
    await db.commit()
    await db.refresh(bank_account)

    return BankAccountResponse(
        id=bank_account.id,
        bank_name=bank_account.bank_name,
        account_number=bank_account.account_number,
        iban=bank_account.iban,
        account_name=bank_account.account_name,
        currency=bank_account.currency,
        konto_number=bank_account.konto_number,
        current_balance=bank_account.current_balance,
        available_balance=bank_account.available_balance,
        balance_updated_at=bank_account.balance_updated_at,
        status=bank_account.status.value,
        last_sync_at=bank_account.last_sync_at,
        transaction_count=bank_account.transaction_count,
        is_primary=bank_account.is_primary,
        needs_reauth=False,
    )


async def _complete_gocardless_connection(
    requisition_id: str,
    company_id: uuid.UUID,
    db: AsyncSession,
) -> BankAccountResponse:
    """Complete GoCardless bank connection (FREE - no eIDAS required)."""
    client = get_gocardless_client()
    if not client:
        raise HTTPException(
            status_code=500,
            detail="GoCardless er ikke konfigurert. Legg til credentials i .env"
        )

    # Generate token
    await client.generate_token()

    # Get requisition status
    requisition = await client.requisition.get_requisition_by_id(requisition_id)

    if not requisition.get("accounts"):
        raise HTTPException(
            status_code=400,
            detail="Ingen kontoer funnet. Vennligst fullfør autorisasjonen hos banken."
        )

    # Get bank/institution info
    institution_id = requisition.get("institution_id")
    institution = await client.institution.get_institution_by_id(institution_id)
    bank_name = institution.get("name", institution_id)

    # Get the first account (could expand to let user choose)
    account_id = requisition["accounts"][0]
    account_api = client.account_api(account_id)

    # Fetch account details
    details = await account_api.get_details()
    account_info = details.get("account", {})

    # Fetch balances
    balances_data = await account_api.get_balances()
    balances = balances_data.get("balances", [])
    current_balance = Decimal("0")
    available_balance = None
    for bal in balances:
        bal_amount = bal.get("balanceAmount", {})
        if bal.get("balanceType") == "interimAvailable":
            available_balance = Decimal(str(bal_amount.get("amount", 0)))
        elif bal.get("balanceType") in ("closingBooked", "expected"):
            current_balance = Decimal(str(bal_amount.get("amount", 0)))

    # Create bank account record
    bank_account = BankAccount(
        company_id=company_id,
        bank_name=bank_name,
        account_number=account_info.get("bban", account_info.get("iban", "")),
        iban=account_info.get("iban"),
        account_name=account_info.get("ownerName", "Konto"),
        currency=account_info.get("currency", "NOK"),
        konto_number="1920",  # Default to driftskonto
        aggregator=BankAggregator.GOCARDLESS,  # FREE integration!
        external_account_id=account_id,
        consent_id=requisition_id,
        consent_expires_at=datetime.now(timezone.utc) + timedelta(days=90),
        current_balance=current_balance,
        available_balance=available_balance,
        balance_updated_at=datetime.now(timezone.utc),
        status=BankAccountStatus.ACTIVE,
    )

    db.add(bank_account)
    await db.commit()
    await db.refresh(bank_account)

    return BankAccountResponse(
        id=bank_account.id,
        bank_name=bank_account.bank_name,
        account_number=bank_account.account_number,
        iban=bank_account.iban,
        account_name=bank_account.account_name,
        currency=bank_account.currency,
        konto_number=bank_account.konto_number,
        current_balance=bank_account.current_balance,
        available_balance=bank_account.available_balance,
        balance_updated_at=bank_account.balance_updated_at,
        status=bank_account.status.value,
        last_sync_at=bank_account.last_sync_at,
        transaction_count=bank_account.transaction_count,
        is_primary=bank_account.is_primary,
        needs_reauth=False,
    )


async def _complete_direct_connection(
    bank_id: str,
    state: str,
    authorization_code: str,
    request_state: Optional[str],
    company_id: uuid.UUID,
    db: AsyncSession,
) -> BankAccountResponse:
    """Complete direct bank connection (requires eIDAS certificate)."""
    # Verify state matches (CSRF protection)
    if request_state and request_state != state:
        raise HTTPException(status_code=400, detail="Ugyldig state parameter")

    # Get redirect URI
    redirect_uri = settings.bank_redirect_uri or f"{settings.backend_url}/api/bank/callback"

    # Exchange code for tokens using direct bank integration
    auth_result = await bank_manager.complete_authorization(
        bank_id=bank_id,
        code=authorization_code,
        redirect_uri=redirect_uri,
    )

    # Fetch accounts from the bank
    accounts = await bank_manager.get_accounts(
        bank_id=bank_id,
        access_token=auth_result.access_token,
    )

    if not accounts:
        raise HTTPException(status_code=400, detail="Ingen kontoer funnet hos banken")

    # Get bank info
    bank_info = bank_manager.get_bank_info(bank_id)
    bank_name = bank_info.name if bank_info else bank_id.upper()

    # For now, connect the first account
    acc_data = accounts[0]

    # Create bank account record
    bank_account = BankAccount(
        company_id=company_id,
        bank_name=bank_name,
        account_number=acc_data.formatted_account_number,
        iban=acc_data.iban,
        account_name=acc_data.name or acc_data.display_name or "Konto",
        currency=acc_data.currency,
        konto_number="1920",  # Default to driftskonto
        aggregator=BankAggregator.DIRECT,  # Direct integration
        external_account_id=acc_data.resource_id,
        consent_id=auth_result.consent_id,
        consent_expires_at=auth_result.consent_expires_at,
        access_token_encrypted=auth_result.access_token,  # TODO: Encrypt
        refresh_token_encrypted=auth_result.refresh_token,  # TODO: Encrypt
        current_balance=acc_data.current_balance or Decimal("0"),
        available_balance=acc_data.available_balance,
        balance_updated_at=datetime.now(timezone.utc),
        status=BankAccountStatus.ACTIVE,
    )

    db.add(bank_account)
    await db.commit()
    await db.refresh(bank_account)

    return BankAccountResponse(
        id=bank_account.id,
        bank_name=bank_account.bank_name,
        account_number=bank_account.account_number,
        iban=bank_account.iban,
        account_name=bank_account.account_name,
        currency=bank_account.currency,
        konto_number=bank_account.konto_number,
        current_balance=bank_account.current_balance,
        available_balance=bank_account.available_balance,
        balance_updated_at=bank_account.balance_updated_at,
        status=bank_account.status.value,
        last_sync_at=bank_account.last_sync_at,
        transaction_count=bank_account.transaction_count,
        is_primary=bank_account.is_primary,
        needs_reauth=False,
    )


@router.post("/accounts/{account_id}/sync")
async def trigger_sync(
    account_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Trigger manual sync for a bank account."""
    company_id = await get_company_id(db)

    # Verify account belongs to company
    query = select(BankAccount).where(
        and_(
            BankAccount.id == account_id,
            BankAccount.company_id == company_id,
        )
    )
    result = await db.execute(query)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Konto ikke funnet")

    # Run sync in background — pass only account_id, task creates its own session
    background_tasks.add_task(sync_single_account, account_id)

    return {"message": "Synkronisering startet", "account_id": str(account_id)}


@router.delete("/accounts/{account_id}")
async def disconnect_bank_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Disconnect a bank account."""
    company_id = await get_company_id(db)

    query = select(BankAccount).where(
        and_(
            BankAccount.id == account_id,
            BankAccount.company_id == company_id,
        )
    )
    result = await db.execute(query)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Konto ikke funnet")

    # Mark as disconnected (don't delete for audit trail)
    account.status = BankAccountStatus.DISCONNECTED
    account.access_token_encrypted = None
    account.refresh_token_encrypted = None

    await db.commit()

    return {"message": "Konto frakoblet"}


# ============================================================================
# Transaction Endpoints
# ============================================================================

@router.get("/transactions", response_model=list[BankTransactionResponse])
async def list_transactions(
    account_id: Optional[uuid.UUID] = None,
    status: Optional[ReconciliationStatus] = None,
    category: Optional[TransactionCategory] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    include_private: bool = False,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Get transactions with filtering."""
    company_id = await get_company_id(db)

    # Base query
    query = select(BankTransaction).where(BankTransaction.company_id == company_id)

    # Apply filters
    if account_id:
        query = query.where(BankTransaction.bank_account_id == account_id)
    if status:
        query = query.where(BankTransaction.reconciliation_status == status)
    if category:
        query = query.where(BankTransaction.category == category)
    if from_date:
        query = query.where(BankTransaction.booking_date >= from_date)
    if to_date:
        query = query.where(BankTransaction.booking_date <= to_date)
    if not include_private:
        query = query.where(BankTransaction.is_private == False)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                BankTransaction.raw_description.ilike(search_pattern),
                BankTransaction.merchant_name.ilike(search_pattern),
                BankTransaction.reference.ilike(search_pattern),
            )
        )

    # Order and paginate
    query = query.order_by(desc(BankTransaction.booking_date)).offset(offset).limit(limit)

    result = await db.execute(query)
    transactions = result.scalars().all()

    # Get pending matches for these transactions
    tx_ids = [t.id for t in transactions]
    matches_query = select(ReconciliationMatch).where(
        and_(
            ReconciliationMatch.bank_transaction_id.in_(tx_ids),
            ReconciliationMatch.status == MatchStatus.SUGGESTED,
        )
    )
    matches_result = await db.execute(matches_query)
    matches = {m.bank_transaction_id: m for m in matches_result.scalars().all()}

    # Get bilag info for matches
    bilag_ids = [m.bilag_id for m in matches.values() if m.bilag_id]
    bilags = {}
    if bilag_ids:
        bilag_query = select(Bilag).where(Bilag.id.in_(bilag_ids))
        bilag_result = await db.execute(bilag_query)
        bilags = {b.id: b for b in bilag_result.scalars().all()}

    # Build response
    response = []
    for tx in transactions:
        tx_response = BankTransactionResponse(
            id=tx.id,
            bank_account_id=tx.bank_account_id,
            booking_date=tx.booking_date,
            value_date=tx.value_date,
            amount=tx.amount,
            currency=tx.currency,
            direction=tx.direction.value,
            raw_description=tx.raw_description,
            cleaned_description=tx.cleaned_description,
            merchant_name=tx.merchant_name,
            reference=tx.reference,
            category=tx.category.value,
            suggested_account=tx.suggested_account,
            ciri_confidence=float(tx.ciri_confidence) if tx.ciri_confidence else None,
            reconciliation_status=tx.reconciliation_status.value,
            is_private=tx.is_private,
        )

        # Add match if exists
        match = matches.get(tx.id)
        if match:
            bilag = bilags.get(match.bilag_id)
            tx_response.match = MatchSuggestionResponse(
                id=match.id,
                bilag_id=match.bilag_id,
                bilag_number=bilag.bilag_number if bilag else None,
                bilag_description=bilag.description if bilag else None,
                confidence=match.confidence.value,
                confidence_score=float(match.confidence_score),
                ciri_explanation=match.ciri_explanation or "",
                status=match.status.value,
                bilag_suggested_account=bilag.suggested_account if bilag else None,
                bilag_category=bilag.category if bilag else None,
            )

        response.append(tx_response)

    return response


@router.get("/transactions/search-unmatched")
async def search_unmatched_transactions(
    search: Optional[str] = None,
    amount_min: Optional[Decimal] = None,
    amount_max: Optional[Decimal] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Search unmatched, non-private transactions for manual bilag linking."""
    company_id = await get_company_id(db)

    query = select(BankTransaction).where(
        and_(
            BankTransaction.company_id == company_id,
            BankTransaction.reconciliation_status == ReconciliationStatus.UNMATCHED,
            BankTransaction.is_private == False,
        )
    )

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                BankTransaction.raw_description.ilike(search_pattern),
                BankTransaction.merchant_name.ilike(search_pattern),
                BankTransaction.reference.ilike(search_pattern),
            )
        )
    if amount_min is not None:
        query = query.where(func.abs(BankTransaction.amount) >= amount_min)
    if amount_max is not None:
        query = query.where(func.abs(BankTransaction.amount) <= amount_max)
    if from_date:
        query = query.where(BankTransaction.booking_date >= from_date)
    if to_date:
        query = query.where(BankTransaction.booking_date <= to_date)

    query = query.order_by(desc(BankTransaction.booking_date)).limit(limit)

    result = await db.execute(query)
    transactions = result.scalars().all()

    return [
        {
            "id": str(tx.id),
            "booking_date": tx.booking_date.isoformat(),
            "amount": float(tx.amount),
            "description": tx.cleaned_description or tx.raw_description,
            "merchant_name": tx.merchant_name,
            "reference": tx.reference,
        }
        for tx in transactions
    ]


@router.get("/transactions/{transaction_id}", response_model=BankTransactionResponse)
async def get_transaction(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single transaction with match suggestions."""
    company_id = await get_company_id(db)

    query = select(BankTransaction).where(
        and_(
            BankTransaction.id == transaction_id,
            BankTransaction.company_id == company_id,
        )
    )
    result = await db.execute(query)
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaksjon ikke funnet")

    # Get all matches
    matches_query = select(ReconciliationMatch).where(
        ReconciliationMatch.bank_transaction_id == transaction_id
    ).order_by(desc(ReconciliationMatch.confidence_score))
    matches_result = await db.execute(matches_query)
    matches = matches_result.scalars().all()

    # Get best pending match
    pending_match = next((m for m in matches if m.status == MatchStatus.SUGGESTED), None)

    response = BankTransactionResponse(
        id=transaction.id,
        bank_account_id=transaction.bank_account_id,
        booking_date=transaction.booking_date,
        value_date=transaction.value_date,
        amount=transaction.amount,
        currency=transaction.currency,
        direction=transaction.direction.value,
        raw_description=transaction.raw_description,
        cleaned_description=transaction.cleaned_description,
        merchant_name=transaction.merchant_name,
        reference=transaction.reference,
        category=transaction.category.value,
        suggested_account=transaction.suggested_account,
        ciri_confidence=float(transaction.ciri_confidence) if transaction.ciri_confidence else None,
        reconciliation_status=transaction.reconciliation_status.value,
        is_private=transaction.is_private,
    )

    if pending_match:
        # Get bilag info
        bilag = None
        if pending_match.bilag_id:
            bilag_query = select(Bilag).where(Bilag.id == pending_match.bilag_id)
            bilag_result = await db.execute(bilag_query)
            bilag = bilag_result.scalar_one_or_none()

        response.match = MatchSuggestionResponse(
            id=pending_match.id,
            bilag_id=pending_match.bilag_id,
            bilag_number=bilag.bilag_number if bilag else None,
            bilag_description=bilag.description if bilag else None,
            confidence=pending_match.confidence.value,
            confidence_score=float(pending_match.confidence_score),
            ciri_explanation=pending_match.ciri_explanation or "",
            status=pending_match.status.value,
            bilag_suggested_account=bilag.suggested_account if bilag else None,
            bilag_category=bilag.category if bilag else None,
        )

    return response


@router.post("/transactions/{transaction_id}/categorize")
async def categorize_transaction(
    transaction_id: uuid.UUID,
    request: CategorizeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Manually categorize a transaction."""
    company_id = await get_company_id(db)

    query = select(BankTransaction).where(
        and_(
            BankTransaction.id == transaction_id,
            BankTransaction.company_id == company_id,
        )
    )
    result = await db.execute(query)
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaksjon ikke funnet")

    # Update category
    transaction.category = request.category
    if request.account_number:
        transaction.suggested_account = request.account_number

    # Create rule if requested
    if request.create_rule:
        rule = ReconciliationRule(
            company_id=company_id,
            name=f"Kategoriser: {transaction.merchant_name or transaction.raw_description[:30]}",
            rule_type=RuleType.AUTO_CATEGORY,
            criteria={
                "description_contains": transaction.merchant_name or transaction.raw_description[:30],
            },
            action={
                "category": request.category.value,
                "account": request.account_number,
            },
        )
        db.add(rule)

    await db.commit()

    return {"message": "Kategori oppdatert"}


@router.post("/transactions/{transaction_id}/mark-private")
async def mark_transaction_private(
    transaction_id: uuid.UUID,
    request: MarkPrivateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Mark a transaction as private (not business-related)."""
    company_id = await get_company_id(db)

    query = select(BankTransaction).where(
        and_(
            BankTransaction.id == transaction_id,
            BankTransaction.company_id == company_id,
        )
    )
    result = await db.execute(query)
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaksjon ikke funnet")

    # Mark as private
    transaction.is_private = True
    transaction.private_marked_at = datetime.now(timezone.utc)
    transaction.category = TransactionCategory.PRIVAT
    transaction.reconciliation_status = ReconciliationStatus.IGNORED

    # Create rule if requested + cascade to other matching items
    cascade_data = None
    if request.create_rule:
        pattern = transaction.merchant_name or transaction.raw_description[:30]
        rule_name = f"Ignorer: {pattern}"
        rule_criteria = {
            "description_contains": pattern,
        }
        rule = ReconciliationRule(
            company_id=company_id,
            name=rule_name,
            rule_type=RuleType.IGNORE,
            criteria=rule_criteria,
            action={
                "mark_private": True,
                "reason": request.reason,
            },
        )
        db.add(rule)

        # Cascade to other existing transactions/bilags with same pattern
        cascade_result = await cascade_ignore_rule(
            db=db,
            company_id=company_id,
            criteria=rule_criteria,
            rule_name=rule_name,
        )
        if cascade_result.total_affected > 0:
            cascade_data = cascade_result.to_dict()

    await db.commit()

    response = {"message": "Transaksjon markert som privat"}
    if cascade_data:
        response["cascade"] = cascade_data
    return response


# ============================================================================
# Reconciliation Endpoints
# ============================================================================

@router.post("/reconciliation/run")
async def run_reconciliation(
    db: AsyncSession = Depends(get_db),
):
    """Trigger algorithmic reconciliation for all unmatched transactions."""
    company_id = await get_company_id(db)

    # Get company autonomy level
    company = (await db.execute(select(Company).where(Company.id == company_id))).scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Bedrift ikke funnet")

    # Get unmatched transactions
    tx_result = await db.execute(
        select(BankTransaction).where(
            and_(
                BankTransaction.company_id == company_id,
                BankTransaction.reconciliation_status == ReconciliationStatus.UNMATCHED,
                BankTransaction.is_private == False,
            )
        )
    )
    unmatched_txs = tx_result.scalars().all()

    if not unmatched_txs:
        return {"message": "Ingen uavstemte transaksjoner", "matched": 0, "total": 0}

    matcher = create_matcher(db)
    matched_count = 0

    for tx in unmatched_txs:
        try:
            match = await matcher.auto_reconcile(tx, company.autonomy_level)
            if match:
                matched_count += 1
        except Exception as e:
            logger.warning(f"Reconciliation failed for tx {tx.id}: {e}")

    await db.commit()
    return {
        "message": f"Avstemming fullført: {matched_count} av {len(unmatched_txs)} matchet",
        "matched": matched_count,
        "total": len(unmatched_txs),
    }


@router.get("/reconciliation/status", response_model=ReconciliationStatusResponse)
async def get_reconciliation_status(
    period: Optional[str] = None,  # Format: "2025-01"
    account_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get overall reconciliation status for a period."""
    company_id = await get_company_id(db)

    # Default to current month
    if not period:
        period = datetime.now(timezone.utc).strftime("%Y-%m")

    # Parse period
    parts = period.split("-")
    if len(parts) != 2 or not all(p.isdigit() for p in parts):
        raise HTTPException(status_code=400, detail="Ugyldig periodeformat. Bruk YYYY-MM")
    year, month = int(parts[0]), int(parts[1])
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Ugyldig måned i periode")
    period_start = date(year, month, 1)
    if month == 12:
        period_end = date(year + 1, 1, 1)
    else:
        period_end = date(year, month + 1, 1)

    # Base query for transactions in period
    base_query = select(BankTransaction).where(
        and_(
            BankTransaction.company_id == company_id,
            BankTransaction.booking_date >= period_start,
            BankTransaction.booking_date < period_end,
            BankTransaction.is_private == False,
        )
    )
    if account_id:
        base_query = base_query.where(BankTransaction.bank_account_id == account_id)

    # Count totals
    result = await db.execute(base_query)
    transactions = result.scalars().all()

    total = len(transactions)
    matched = sum(1 for t in transactions if t.reconciliation_status == ReconciliationStatus.MATCHED)
    unmatched = sum(1 for t in transactions if t.reconciliation_status == ReconciliationStatus.UNMATCHED)
    suggested = sum(1 for t in transactions if t.reconciliation_status == ReconciliationStatus.SUGGESTED)

    # Calculate balances
    bank_balance = sum(t.amount for t in transactions)

    # Get booked balance from posterings (simplified - would need actual postering query)
    booked_balance = sum(t.amount for t in transactions if t.reconciliation_status == ReconciliationStatus.MATCHED)

    auto_match_rate = (matched / total * 100) if total > 0 else 100.0

    return ReconciliationStatusResponse(
        period=period,
        bank_balance=bank_balance,
        booked_balance=booked_balance,
        difference=bank_balance - booked_balance,
        total_transactions=total,
        matched_transactions=matched,
        unmatched_transactions=unmatched,
        pending_suggestions=suggested,
        auto_match_rate=auto_match_rate,
    )


@router.get("/reconciliation/suggestions", response_model=list[MatchSuggestionResponse])
async def list_pending_suggestions(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get pending match suggestions requiring user review."""
    company_id = await get_company_id(db)

    query = select(ReconciliationMatch).where(
        and_(
            ReconciliationMatch.company_id == company_id,
            ReconciliationMatch.status == MatchStatus.SUGGESTED,
        )
    ).order_by(desc(ReconciliationMatch.confidence_score)).limit(limit)

    result = await db.execute(query)
    matches = result.scalars().all()

    # Get bilag info
    bilag_ids = [m.bilag_id for m in matches if m.bilag_id]
    bilags = {}
    if bilag_ids:
        bilag_query = select(Bilag).where(Bilag.id.in_(bilag_ids))
        bilag_result = await db.execute(bilag_query)
        bilags = {b.id: b for b in bilag_result.scalars().all()}

    # Get transaction info
    tx_ids = [m.bank_transaction_id for m in matches if m.bank_transaction_id]
    txs = {}
    if tx_ids:
        tx_query = select(BankTransaction).where(BankTransaction.id.in_(tx_ids))
        tx_result = await db.execute(tx_query)
        txs = {t.id: t for t in tx_result.scalars().all()}

    suggestions = []
    for m in matches:
        bilag = bilags.get(m.bilag_id) if m.bilag_id else None
        tx = txs.get(m.bank_transaction_id) if m.bank_transaction_id else None
        suggestions.append(MatchSuggestionResponse(
            id=m.id,
            bilag_id=m.bilag_id,
            bilag_number=bilag.bilag_number if bilag else None,
            bilag_description=bilag.description if bilag else None,
            confidence=m.confidence.value,
            confidence_score=float(m.confidence_score),
            ciri_explanation=m.ciri_explanation or "",
            status=m.status.value,
            transaction_id=m.bank_transaction_id,
            transaction_date=tx.booking_date.isoformat() if tx else None,
            transaction_description=tx.raw_description if tx else None,
            transaction_merchant_name=tx.merchant_name or (tx.cleaned_description if tx else None),
            transaction_amount=float(tx.amount) if tx else None,
            bilag_amount=float(bilag.gross_amount) if bilag else None,
            bilag_date=bilag.document_date.isoformat() if bilag and bilag.document_date else None,
            bilag_supplier=bilag.counterparty_name if bilag else None,
            bilag_suggested_account=bilag.suggested_account if bilag else None,
            bilag_category=bilag.category if bilag else None,
            match_factors=m.match_factors if m.match_factors else None,
        ))

    return suggestions


@router.post("/reconciliation/matches/{match_id}/confirm")
async def confirm_match(
    match_id: uuid.UUID,
    request: ConfirmMatchRequest,
    db: AsyncSession = Depends(get_db),
):
    """Confirm a suggested match."""
    company_id = await get_company_id(db)

    query = select(ReconciliationMatch).where(
        and_(
            ReconciliationMatch.id == match_id,
            ReconciliationMatch.company_id == company_id,
        )
    )
    result = await db.execute(query)
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match ikke funnet")

    if match.status != MatchStatus.SUGGESTED:
        raise HTTPException(status_code=400, detail="Match er allerede bekreftet eller avvist")

    # Store feedback if provided
    if request.feedback:
        match.user_feedback = request.feedback

    # Confirm match
    match.confirm()

    # Update transaction status
    tx_query = select(BankTransaction).where(BankTransaction.id == match.bank_transaction_id)
    tx_result = await db.execute(tx_query)
    transaction = tx_result.scalar_one_or_none()

    if transaction:
        transaction.reconciliation_status = ReconciliationStatus.MATCHED
        transaction.reconciled_at = datetime.now(timezone.utc)

    # Learn positive rule from confirmation
    matcher = create_matcher(db)
    await matcher.learn_from_confirmation(match, request.feedback)

    # Record cluster data point from confirmed match
    if transaction and match.bilag_id:
        bilag_for_cluster = (await db.execute(select(Bilag).where(Bilag.id == match.bilag_id))).scalar_one_or_none()
        if bilag_for_cluster:
            desc_key = ReconciliationMatcher._extract_key_pattern_static(transaction.raw_description or "")
            tx_direction = "debit" if float(transaction.amount) < 0 else "credit"
            await record_data_point(
                db,
                company_id=company_id,
                account_number=bilag_for_cluster.suggested_account or "0000",
                category=bilag_for_cluster.category or "ukategorisert",
                merchant_name=transaction.merchant_name,
                description_key=desc_key,
                amount=float(transaction.amount),
                direction=tx_direction,
                source=DataPointSource.USER_CONFIRMED,
                match_id=match.id,
                transaction_id=transaction.id,
            )

    # Post the bilag (create posteringer)
    if match.bilag_id:
        from models.bilag import BilagStatus
        bilag = (await db.execute(select(Bilag).where(Bilag.id == match.bilag_id))).scalar_one_or_none()
        if bilag and bilag.status != BilagStatus.POSTED:
            from services.invoice_processor import post_bilag_with_entries, PostingValidationError
            try:
                await post_bilag_with_entries(bilag, db)
            except PostingValidationError as e:
                import logging
                logging.getLogger(__name__).warning(f"Could not post bilag {bilag.bilag_number}: {e}")

    await db.commit()

    return {"message": "Match bekreftet"}


@router.post("/reconciliation/matches/{match_id}/reject")
async def reject_match(
    match_id: uuid.UUID,
    request: RejectMatchRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reject a suggested match with optional feedback."""
    company_id = await get_company_id(db)

    query = select(ReconciliationMatch).where(
        and_(
            ReconciliationMatch.id == match_id,
            ReconciliationMatch.company_id == company_id,
        )
    )
    result = await db.execute(query)
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(status_code=404, detail="Match ikke funnet")

    # Reject match
    match.reject(request.feedback)

    # Update transaction back to unmatched
    tx_query = select(BankTransaction).where(BankTransaction.id == match.bank_transaction_id)
    tx_result = await db.execute(tx_query)
    transaction = tx_result.scalar_one_or_none()

    if transaction:
        transaction.reconciliation_status = ReconciliationStatus.UNMATCHED
        transaction.match_attempts += 1
        transaction.last_match_attempt_at = datetime.now(timezone.utc)

    # If correct bilag provided, create new match and post it
    if request.correct_bilag_id:
        # Mark old cluster data points as overridden (Ciri got it wrong)
        if transaction:
            await mark_data_point_overridden(db, transaction.id)

        new_match = ReconciliationMatch(
            company_id=company_id,
            bank_transaction_id=match.bank_transaction_id,
            bilag_id=request.correct_bilag_id,
            match_type=MatchType.ONE_TO_ONE,
            confidence=MatchConfidence.HIGH,
            confidence_score=1.0,
            status=MatchStatus.CONFIRMED,
            transaction_amount=match.transaction_amount,
            matched_amount=match.matched_amount,
            match_factors={"manual_correction": True},
            ciri_explanation="Manuelt matchet av bruker",
        )
        new_match.confirm()
        db.add(new_match)
        await db.flush()

        if transaction:
            transaction.reconciliation_status = ReconciliationStatus.MATCHED
            transaction.reconciled_at = datetime.now(timezone.utc)

        # Post the corrected bilag
        from models.bilag import BilagStatus as _BilagStatus
        correct_bilag = (await db.execute(select(Bilag).where(Bilag.id == request.correct_bilag_id))).scalar_one_or_none()
        if correct_bilag and correct_bilag.status != _BilagStatus.POSTED:
            from services.invoice_processor import post_bilag_with_entries, PostingValidationError
            try:
                await post_bilag_with_entries(correct_bilag, db)
            except PostingValidationError as e:
                import logging
                logging.getLogger(__name__).warning(f"Could not post corrected bilag: {e}")

        # Record corrected cluster data point
        if transaction and correct_bilag:
            desc_key = ReconciliationMatcher._extract_key_pattern_static(transaction.raw_description or "")
            tx_direction = "debit" if float(transaction.amount) < 0 else "credit"
            await record_data_point(
                db,
                company_id=company_id,
                account_number=correct_bilag.suggested_account or "0000",
                category=correct_bilag.category or "ukategorisert",
                merchant_name=transaction.merchant_name,
                description_key=desc_key,
                amount=float(transaction.amount),
                direction=tx_direction,
                source=DataPointSource.MANUAL_MATCH,
                match_id=new_match.id,
                transaction_id=transaction.id,
            )

    # Ensure the originally-matched bilag stays matchable after rejection
    from models.bilag import BilagStatus
    if match.bilag_id and match.bilag_id != request.correct_bilag_id:
        bilag = (await db.execute(select(Bilag).where(Bilag.id == match.bilag_id))).scalar_one_or_none()
        if bilag and bilag.status not in [BilagStatus.POSTED, BilagStatus.REJECTED]:
            bilag.status = BilagStatus.AWAITING_TRANSACTION

    # Learn from feedback (structured reject reason or freetext)
    if request.feedback or request.reject_reason:
        matcher = create_matcher(db)
        await matcher.learn_from_feedback(
            match,
            request.feedback or "",
            correct_bilag_id=request.correct_bilag_id,
            reject_reason=request.reject_reason.value if request.reject_reason else None,
        )

    await db.commit()

    return {"message": "Match avvist"}


@router.post("/reconciliation/manual", response_model=MatchSuggestionResponse)
async def create_manual_match(
    request: ManualMatchRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a manual match between transaction and bilag."""
    company_id = await get_company_id(db)

    # Verify transaction
    tx_query = select(BankTransaction).where(
        and_(
            BankTransaction.id == request.transaction_id,
            BankTransaction.company_id == company_id,
        )
    )
    tx_result = await db.execute(tx_query)
    transaction = tx_result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaksjon ikke funnet")

    # Verify bilag
    bilag_query = select(Bilag).where(
        and_(
            Bilag.id == request.bilag_id,
            Bilag.company_id == company_id,
        )
    )
    bilag_result = await db.execute(bilag_query)
    bilag = bilag_result.scalar_one_or_none()

    if not bilag:
        raise HTTPException(status_code=404, detail="Bilag ikke funnet")

    # Create match
    match = ReconciliationMatch(
        company_id=company_id,
        bank_transaction_id=request.transaction_id,
        bilag_id=request.bilag_id,
        match_type=MatchType.ONE_TO_ONE,
        confidence=MatchConfidence.HIGH,
        confidence_score=1.0,
        status=MatchStatus.CONFIRMED,
        transaction_amount=transaction.amount,
        matched_amount=bilag.gross_amount,
        difference=abs(transaction.amount) - abs(bilag.gross_amount),
        match_factors={"manual": True},
        ciri_explanation="Manuelt matchet av bruker",
    )
    match.confirm()

    # Update transaction
    transaction.reconciliation_status = ReconciliationStatus.MATCHED
    transaction.reconciled_at = datetime.now(timezone.utc)

    # Post the bilag (create posteringer)
    from models.bilag import BilagStatus
    if bilag.status != BilagStatus.POSTED:
        from services.invoice_processor import post_bilag_with_entries, PostingValidationError
        try:
            await post_bilag_with_entries(bilag, db)
        except PostingValidationError as e:
            import logging
            logging.getLogger(__name__).warning(f"Manual post failed for bilag {bilag.bilag_number}: {e}")

    db.add(match)
    await db.flush()

    # Record cluster data point for manual match
    desc_key = ReconciliationMatcher._extract_key_pattern_static(transaction.raw_description or "")
    tx_direction = "debit" if float(transaction.amount) < 0 else "credit"
    await record_data_point(
        db,
        company_id=company_id,
        account_number=bilag.suggested_account or "0000",
        category=bilag.category or "ukategorisert",
        merchant_name=transaction.merchant_name,
        description_key=desc_key,
        amount=float(transaction.amount),
        direction=tx_direction,
        source=DataPointSource.MANUAL_MATCH,
        match_id=match.id,
        transaction_id=transaction.id,
    )

    await db.commit()
    await db.refresh(match)

    return MatchSuggestionResponse(
        id=match.id,
        bilag_id=bilag.id,
        bilag_number=bilag.bilag_number,
        bilag_description=bilag.description,
        confidence=match.confidence.value,
        confidence_score=float(match.confidence_score),
        ciri_explanation=match.ciri_explanation or "",
        status=match.status.value,
        bilag_suggested_account=bilag.suggested_account,
        bilag_category=bilag.category,
    )


# ============================================================================
# Kontoer (Chart of Accounts) Endpoint
# ============================================================================

@router.get("/kontoer")
async def list_kontoer(
    db: AsyncSession = Depends(get_db),
):
    """Get all accounts from the chart of accounts."""
    company_id = await get_company_id(db)
    result = await db.execute(
        select(Konto).where(Konto.company_id == company_id).order_by(Konto.number)
    )
    kontoer = result.scalars().all()
    return [
        {
            "account_number": k.number,
            "name": k.name,
            "type": k.type.value,
        }
        for k in kontoer
    ]


# ============================================================================
# Rules Endpoints
# ============================================================================

@router.get("/rules", response_model=list[RuleResponse])
async def list_rules(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """Get all reconciliation rules."""
    company_id = await get_company_id(db)

    query = select(ReconciliationRule).where(ReconciliationRule.company_id == company_id)
    if active_only:
        query = query.where(ReconciliationRule.is_active == True)
    query = query.order_by(desc(ReconciliationRule.priority), ReconciliationRule.name)

    result = await db.execute(query)
    rules = result.scalars().all()

    return [
        RuleResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            rule_type=r.rule_type.value,
            priority=r.priority.value,
            criteria=r.criteria,
            action=r.action,
            is_active=r.is_active,
            times_applied=r.times_applied,
            times_overridden=r.times_overridden,
            last_applied_at=r.last_applied_at,
            learned_from_user=r.learned_from_user,
            confidence_threshold=r.confidence_threshold,
            created_at=r.created_at,
        )
        for r in rules
    ]


@router.get("/rules/stats")
async def get_rule_stats(
    db: AsyncSession = Depends(get_db),
):
    """Get rule statistics and autonomy progress score."""
    company_id = await get_company_id(db)

    # Count rules
    rules_result = await db.execute(
        select(ReconciliationRule).where(ReconciliationRule.company_id == company_id)
    )
    all_rules = rules_result.scalars().all()

    total_rules = len(all_rules)
    active_rules = sum(1 for r in all_rules if r.is_active)
    learned_rules = sum(1 for r in all_rules if r.learned_from_user)
    total_applied = sum(r.times_applied for r in all_rules)

    # Get reconciliation stats for autonomy calculation
    total_tx = (await db.execute(
        select(func.count(BankTransaction.id)).where(
            BankTransaction.company_id == company_id
        )
    )).scalar() or 0

    # All resolved transactions (matched or ignored) — includes user-approved
    resolved_tx = (await db.execute(
        select(func.count(BankTransaction.id)).where(
            and_(
                BankTransaction.company_id == company_id,
                BankTransaction.reconciliation_status.in_([
                    ReconciliationStatus.MATCHED,
                    ReconciliationStatus.IGNORED,
                ]),
            )
        )
    )).scalar() or 0

    # Truly autonomous: only transactions Ciri handled WITHOUT user intervention
    auto_matched = (await db.execute(
        select(func.count(BankTransaction.id)).where(
            and_(
                BankTransaction.company_id == company_id,
                BankTransaction.reconciliation_status == ReconciliationStatus.MATCHED,
                BankTransaction.reconciled_by_ciri == True,
            )
        )
    )).scalar() or 0

    auto_ignored = (await db.execute(
        select(func.count(BankTransaction.id)).where(
            and_(
                BankTransaction.company_id == company_id,
                BankTransaction.reconciliation_status == ReconciliationStatus.IGNORED,
                BankTransaction.private_marked_by_ciri == True,
            )
        )
    )).scalar() or 0

    auto_handled = auto_matched + auto_ignored

    # Autonomy score: percentage of transactions Ciri handled autonomously
    autonomy_pct = round((auto_handled / total_tx * 100) if total_tx > 0 else 0, 1)

    # Milestones
    if autonomy_pct >= 90:
        level = "Fullt autonom"
    elif autonomy_pct >= 75:
        level = "Nesten autonom"
    elif autonomy_pct >= 50:
        level = "Lærer fort"
    elif autonomy_pct >= 25:
        level = "Nybegynner"
    else:
        level = "Starter opp"

    return {
        "total_rules": total_rules,
        "active_rules": active_rules,
        "learned_rules": learned_rules,
        "total_applied": total_applied,
        "total_transactions": total_tx,
        "matched_transactions": resolved_tx,
        "auto_handled": auto_handled,
        "autonomy_percentage": autonomy_pct,
        "autonomy_level": level,
    }


@router.get("/clusters/stats")
async def get_cluster_stats(
    db: AsyncSession = Depends(get_db),
):
    """Get cluster statistics — strength distribution, data point counts, readiness summary."""
    from services.cluster_service import get_cluster_summaries, check_global_minimums
    from models.cluster_data_point import ClusterDataPoint

    company_id = await get_company_id(db)

    # Get cluster summaries
    clusters = await get_cluster_summaries(db, company_id)

    strong = [c for c in clusters if c.strength_level == "strong"]
    growing = [c for c in clusters if c.strength_level == "growing"]
    weak = [c for c in clusters if c.strength_level == "weak"]

    # Count total data points
    total_points = (await db.execute(
        select(func.count(ClusterDataPoint.id)).where(
            ClusterDataPoint.company_id == company_id
        )
    )).scalar() or 0

    overridden_points = (await db.execute(
        select(func.count(ClusterDataPoint.id)).where(
            and_(
                ClusterDataPoint.company_id == company_id,
                ClusterDataPoint.was_overridden == True,
            )
        )
    )).scalar() or 0

    # Global minimums check
    passes, reason = await check_global_minimums(db, company_id)

    # Cluster details for UI
    cluster_details = []
    for c in clusters:
        cluster_details.append({
            "account_number": c.account_number,
            "category": c.category,
            "total_points": c.total_points,
            "distinct_merchants": c.distinct_merchants,
            "strength": round(c.strength, 2),
            "strength_level": c.strength_level,
            "amount_range": f"kr {c.amount_p5:.0f}–{c.amount_p95:.0f}",
            "dominant_direction": c.dominant_direction,
            "example_merchants": c.example_merchants[:3],
            "overridden_count": c.overridden_count,
        })

    return {
        "total_clusters": len(clusters),
        "strong_clusters": len(strong),
        "growing_clusters": len(growing),
        "weak_clusters": len(weak),
        "total_data_points": total_points,
        "overridden_data_points": overridden_points,
        "global_minimums_passed": passes,
        "global_minimums_reason": reason,
        "clusters": cluster_details,
    }


@router.post("/clusters/backfill")
async def backfill_clusters(
    db: AsyncSession = Depends(get_db),
):
    """
    Backfill cluster data points from existing confirmed matches.
    Safe to run multiple times — checks for existing data points per transaction.
    """
    from models.cluster_data_point import ClusterDataPoint
    from services.cluster_service import record_data_point

    company_id = await get_company_id(db)

    # Get all confirmed matches
    matches_result = await db.execute(
        select(ReconciliationMatch).where(
            and_(
                ReconciliationMatch.company_id == company_id,
                ReconciliationMatch.status.in_([
                    MatchStatus.CONFIRMED,
                    MatchStatus.AUTO_CONFIRMED,
                ]),
            )
        )
    )
    matches = matches_result.scalars().all()

    # Get existing data point transaction IDs to avoid duplicates
    existing_result = await db.execute(
        select(ClusterDataPoint.transaction_id).where(
            ClusterDataPoint.company_id == company_id
        )
    )
    existing_tx_ids = {row for row in existing_result.scalars().all() if row}

    created = 0
    skipped = 0

    for match in matches:
        if match.bank_transaction_id in existing_tx_ids:
            skipped += 1
            continue

        # Get transaction
        tx = (await db.execute(
            select(BankTransaction).where(BankTransaction.id == match.bank_transaction_id)
        )).scalar_one_or_none()
        if not tx:
            skipped += 1
            continue

        # Get bilag for account/category
        bilag = None
        if match.bilag_id:
            bilag = (await db.execute(
                select(Bilag).where(Bilag.id == match.bilag_id)
            )).scalar_one_or_none()

        account = "0000"
        category = "ukategorisert"
        if bilag:
            account = bilag.suggested_account or "0000"
            category = bilag.category or "ukategorisert"

        desc_key = ReconciliationMatcher._extract_key_pattern_static(tx.raw_description or "")
        tx_direction = "debit" if (tx.amount and float(tx.amount) < 0) else "credit"

        source = DataPointSource.AUTO_CONFIRMED if match.status == MatchStatus.AUTO_CONFIRMED else DataPointSource.USER_CONFIRMED

        await record_data_point(
            db,
            company_id=company_id,
            account_number=account,
            category=category,
            merchant_name=tx.merchant_name,
            description_key=desc_key,
            amount=float(tx.amount) if tx.amount else 0,
            direction=tx_direction,
            source=source,
            match_id=match.id,
            transaction_id=tx.id,
        )
        created += 1

    await db.commit()

    return {
        "backfilled": created,
        "skipped": skipped,
        "total_matches": len(matches),
    }


@router.post("/rules", response_model=RuleResponse)
async def create_rule(
    request: CreateRuleRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new reconciliation rule."""
    company_id = await get_company_id(db)

    rule = ReconciliationRule(
        company_id=company_id,
        name=request.name,
        rule_type=request.rule_type,
        priority=request.priority,
        criteria=request.criteria.model_dump(exclude_none=True),
        action=request.action.model_dump(exclude_none=True),
    )

    db.add(rule)

    # Cascade: retroactively clean up existing data for IGNORE rules
    cascade_data = None
    if request.rule_type == RuleType.IGNORE:
        cascade_result = await cascade_ignore_rule(
            db=db,
            company_id=company_id,
            criteria=request.criteria.model_dump(exclude_none=True),
            rule_name=request.name,
        )
        if cascade_result.total_affected > 0:
            cascade_data = CascadeResultResponse(**cascade_result.to_dict())

    await db.commit()
    await db.refresh(rule)

    return RuleResponse(
        id=rule.id,
        name=rule.name,
        description=rule.description,
        rule_type=rule.rule_type.value,
        priority=rule.priority.value,
        criteria=rule.criteria,
        action=rule.action,
        is_active=rule.is_active,
        times_applied=rule.times_applied,
        times_overridden=rule.times_overridden,
        last_applied_at=rule.last_applied_at,
        learned_from_user=rule.learned_from_user,
        confidence_threshold=rule.confidence_threshold,
        created_at=rule.created_at,
        cascade=cascade_data,
    )


@router.post("/rules/apply-all")
async def apply_rules_to_unmatched(
    db: AsyncSession = Depends(get_db),
):
    """
    Re-apply all active rules to existing UNMATCHED transactions.

    Useful when rules were created after transactions were already imported.
    Runs apply_rules() + auto_reconcile() on every UNMATCHED, non-private tx.
    """
    company_id = await get_company_id(db)

    company = (await db.execute(
        select(Company).where(Company.id == company_id)
    )).scalar_one()

    tx_result = await db.execute(
        select(BankTransaction).where(
            and_(
                BankTransaction.company_id == company_id,
                BankTransaction.reconciliation_status == ReconciliationStatus.UNMATCHED,
                BankTransaction.is_private == False,
            )
        )
    )
    unmatched_txs = tx_result.scalars().all()

    if not unmatched_txs:
        return {
            "message": "Ingen uavstemte transaksjoner å behandle",
            "rules_applied": 0,
            "matches_found": 0,
            "total": 0,
        }

    matcher = create_matcher(db)
    rules_applied = 0
    matches_found = 0

    for tx in unmatched_txs:
        try:
            match = await matcher.auto_reconcile(tx, company.autonomy_level)
            if match:
                matches_found += 1
            if tx.category != TransactionCategory.UKATEGORISERT:
                rules_applied += 1
        except Exception as e:
            logger.warning(f"Rule re-apply failed for tx {tx.id}: {e}")

    await db.commit()
    matcher.clear_cache()

    return {
        "message": f"Regler kjørt: {rules_applied} kategorisert, {matches_found} matchet av {len(unmatched_txs)} transaksjoner",
        "rules_applied": rules_applied,
        "matches_found": matches_found,
        "total": len(unmatched_txs),
    }


@router.put("/rules/{rule_id}", response_model=RuleResponse)
async def update_rule(
    rule_id: uuid.UUID,
    request: CreateRuleRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing rule."""
    company_id = await get_company_id(db)

    query = select(ReconciliationRule).where(
        and_(
            ReconciliationRule.id == rule_id,
            ReconciliationRule.company_id == company_id,
        )
    )
    result = await db.execute(query)
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Regel ikke funnet")

    # Update fields
    rule.name = request.name
    rule.rule_type = request.rule_type
    rule.priority = request.priority
    rule.criteria = request.criteria.model_dump(exclude_none=True)
    rule.action = request.action.model_dump(exclude_none=True)

    # Cascade: retroactively clean up if changed to IGNORE
    cascade_data = None
    if request.rule_type == RuleType.IGNORE:
        cascade_result = await cascade_ignore_rule(
            db=db,
            company_id=company_id,
            criteria=request.criteria.model_dump(exclude_none=True),
            rule_name=request.name,
        )
        if cascade_result.total_affected > 0:
            cascade_data = CascadeResultResponse(**cascade_result.to_dict())

    await db.commit()
    await db.refresh(rule)

    return RuleResponse(
        id=rule.id,
        name=rule.name,
        description=rule.description,
        rule_type=rule.rule_type.value,
        priority=rule.priority.value,
        criteria=rule.criteria,
        action=rule.action,
        is_active=rule.is_active,
        times_applied=rule.times_applied,
        times_overridden=rule.times_overridden,
        last_applied_at=rule.last_applied_at,
        learned_from_user=rule.learned_from_user,
        confidence_threshold=rule.confidence_threshold,
        created_at=rule.created_at,
        cascade=cascade_data,
    )


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a rule."""
    company_id = await get_company_id(db)

    query = select(ReconciliationRule).where(
        and_(
            ReconciliationRule.id == rule_id,
            ReconciliationRule.company_id == company_id,
        )
    )
    result = await db.execute(query)
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Regel ikke funnet")

    db.delete(rule)
    await db.commit()

    return {"message": "Regel slettet"}


@router.post("/rules/{rule_id}/toggle")
async def toggle_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Toggle rule active status."""
    company_id = await get_company_id(db)

    query = select(ReconciliationRule).where(
        and_(
            ReconciliationRule.id == rule_id,
            ReconciliationRule.company_id == company_id,
        )
    )
    result = await db.execute(query)
    rule = result.scalar_one_or_none()

    if not rule:
        raise HTTPException(status_code=404, detail="Regel ikke funnet")

    rule.is_active = not rule.is_active
    await db.commit()

    return {"message": f"Regel {'aktivert' if rule.is_active else 'deaktivert'}"}


# ============================================================================
# Kontoutskrift (Bank Statement) Export Endpoints
# ============================================================================

class KontoutskriftTransaction(BaseModel):
    """Single transaction in kontoutskrift."""

    dato: date
    bokforingsdato: date
    beskrivelse: str
    inn: Optional[Decimal] = None  # Credit
    ut: Optional[Decimal] = None   # Debit
    saldo: Optional[Decimal] = None
    referanse: Optional[str] = None


class KontoutskriftResponse(BaseModel):
    """Kontoutskrift (bank statement) response."""

    kontonummer: str
    kontonavn: str
    bank: str
    periode_fra: date
    periode_til: date
    inngaende_saldo: Decimal
    utgaende_saldo: Decimal
    sum_inn: Decimal
    sum_ut: Decimal
    antall_transaksjoner: int
    transaksjoner: list[KontoutskriftTransaction]
    eksportert_dato: datetime

    class Config:
        from_attributes = True


@router.get("/accounts/{account_id}/kontoutskrift", response_model=KontoutskriftResponse)
async def get_kontoutskrift(
    account_id: uuid.UUID,
    from_date: date = Query(..., description="Start of period (YYYY-MM-DD)"),
    to_date: date = Query(..., description="End of period (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Extract kontoutskrift (bank statement) for a period.

    This endpoint provides the same data as a formal kontoutskrift from the bank:
    - Account information
    - Opening and closing balance
    - All transactions in the period
    - Summary totals

    The data is fetched via PSD2 Open Banking API.
    """
    company_id = await get_company_id(db)

    # Get account
    query = select(BankAccount).where(
        and_(
            BankAccount.id == account_id,
            BankAccount.company_id == company_id,
        )
    )
    result = await db.execute(query)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Konto ikke funnet")

    # Get transactions for period
    tx_query = select(BankTransaction).where(
        and_(
            BankTransaction.bank_account_id == account_id,
            BankTransaction.company_id == company_id,
            BankTransaction.booking_date >= from_date,
            BankTransaction.booking_date <= to_date,
        )
    ).order_by(BankTransaction.booking_date, BankTransaction.created_at)

    tx_result = await db.execute(tx_query)
    transactions = tx_result.scalars().all()

    # Calculate summary
    sum_inn = Decimal("0")
    sum_ut = Decimal("0")

    kontoutskrift_transactions = []

    # First pass: calculate sums for opening balance
    for tx in transactions:
        if tx.amount > 0:
            sum_inn += tx.amount
        else:
            sum_ut += abs(tx.amount)

    # Opening balance = current balance - net change in period
    inngaende_saldo = account.current_balance - (sum_inn - sum_ut)
    running_balance = inngaende_saldo

    # Second pass: build transaction list with running balance
    for tx in transactions:
        if tx.amount > 0:
            inn = tx.amount
            ut = None
        else:
            inn = None
            ut = abs(tx.amount)

        running_balance += tx.amount

        kontoutskrift_transactions.append(KontoutskriftTransaction(
            dato=tx.value_date or tx.booking_date,
            bokforingsdato=tx.booking_date,
            beskrivelse=tx.cleaned_description or tx.raw_description,
            inn=inn,
            ut=ut,
            saldo=running_balance,
            referanse=tx.reference,
        ))

    return KontoutskriftResponse(
        kontonummer=account.account_number,
        kontonavn=account.account_name,
        bank=account.bank_name,
        periode_fra=from_date,
        periode_til=to_date,
        inngaende_saldo=inngaende_saldo,
        utgaende_saldo=account.current_balance,
        sum_inn=sum_inn,
        sum_ut=sum_ut,
        antall_transaksjoner=len(transactions),
        transaksjoner=kontoutskrift_transactions,
        eksportert_dato=datetime.now(timezone.utc),
    )


@router.get("/accounts/{account_id}/kontoutskrift/pdf")
async def get_kontoutskrift_pdf(
    account_id: uuid.UUID,
    from_date: date = Query(..., description="Start of period (YYYY-MM-DD)"),
    to_date: date = Query(..., description="End of period (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate PDF kontoutskrift.

    Returns a formal bank statement PDF that can be used for:
    - Revisor/auditor documentation
    - Loan applications
    - Official records

    Note: This generates a PDF from the transaction data fetched via PSD2.
    For an official bank-stamped kontoutskrift, contact the bank directly.
    """
    from fastapi.responses import StreamingResponse
    from io import BytesIO

    # Get the kontoutskrift data
    kontoutskrift = await get_kontoutskrift(account_id, from_date, to_date, db)

    # Generate PDF (using simple text format - in production use reportlab/weasyprint)
    # This is a placeholder - real implementation would generate proper PDF
    pdf_content = f"""
KONTOUTSKRIFT
=============

Konto: {kontoutskrift.kontonummer}
Navn: {kontoutskrift.kontonavn}
Bank: {kontoutskrift.bank}

Periode: {kontoutskrift.periode_fra} - {kontoutskrift.periode_til}

Inngående saldo: {kontoutskrift.inngaende_saldo:,.2f} NOK
Utgående saldo: {kontoutskrift.utgaende_saldo:,.2f} NOK

Sum inn: {kontoutskrift.sum_inn:,.2f} NOK
Sum ut: {kontoutskrift.sum_ut:,.2f} NOK

Antall transaksjoner: {kontoutskrift.antall_transaksjoner}

TRANSAKSJONER
-------------
"""

    for tx in kontoutskrift.transaksjoner:
        inn_str = f"+{tx.inn:,.2f}" if tx.inn else ""
        ut_str = f"-{tx.ut:,.2f}" if tx.ut else ""
        pdf_content += f"{tx.dato} | {tx.beskrivelse[:40]:<40} | {inn_str:>12} | {ut_str:>12}\n"

    pdf_content += f"\n\nEksportert: {kontoutskrift.eksportert_dato}\n"
    pdf_content += "Generert av Ciri AI via PSD2 Open Banking\n"

    # In production, use reportlab to create actual PDF
    # For now, return as text file
    buffer = BytesIO(pdf_content.encode("utf-8"))

    return StreamingResponse(
        buffer,
        media_type="text/plain",  # Would be application/pdf in production
        headers={
            "Content-Disposition": f"attachment; filename=kontoutskrift_{kontoutskrift.kontonummer}_{from_date}_{to_date}.txt"
        }
    )


@router.post("/accounts/{account_id}/sync-kontoutskrift")
async def sync_kontoutskrift_from_bank(
    account_id: uuid.UUID,
    from_date: date = Query(..., description="Start of period"),
    to_date: date = Query(None, description="End of period (defaults to today)"),
    background_tasks: BackgroundTasks = None,  # type: ignore[assignment]
    db: AsyncSession = Depends(get_db),
):
    """
    Sync/refresh kontoutskrift data directly from bank via PSD2.

    This fetches the latest transactions from the bank's API and
    updates the local database. Use this to ensure you have the
    most recent data before generating a kontoutskrift.
    """
    company_id = await get_company_id(db)

    # Verify account
    query = select(BankAccount).where(
        and_(
            BankAccount.id == account_id,
            BankAccount.company_id == company_id,
        )
    )
    result = await db.execute(query)
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Konto ikke funnet")

    if account.status != BankAccountStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail="Konto er ikke aktiv. Vennligst koble til banken på nytt."
        )

    if not to_date:
        to_date = date.today()

    if not neonomics_client:
        raise HTTPException(
            status_code=501,
            detail="Neonomics er ikke konfigurert. Bruk Tink eller GoCardless for banktilkobling."
        )

    try:
        # Fetch transactions from bank via PSD2
        transactions = await neonomics_client.get_transactions(
            account.external_account_id,
            from_date=from_date,
            to_date=to_date,
        )

        # Import new transactions
        imported_count = 0
        for tx_data in transactions:
            # Check if transaction already exists
            existing_query = select(BankTransaction).where(
                BankTransaction.external_transaction_id == tx_data.get("transactionId")
            )
            existing_result = await db.execute(existing_query)
            if existing_result.scalar_one_or_none():
                continue

            # Create new transaction
            amount = Decimal(str(tx_data.get("amount", 0)))
            direction = TransactionDirection.CREDIT if amount > 0 else TransactionDirection.DEBIT

            new_tx = BankTransaction(
                company_id=company_id,
                bank_account_id=account_id,
                external_transaction_id=tx_data.get("transactionId"),
                booking_date=datetime.fromisoformat(tx_data.get("bookingDate")).date(),
                value_date=datetime.fromisoformat(tx_data.get("valueDate")).date() if tx_data.get("valueDate") else None,
                amount=amount,
                currency=tx_data.get("currency", "NOK"),
                direction=direction,
                raw_description=tx_data.get("remittanceInformation", ""),
                reference=tx_data.get("creditorReference"),
                reconciliation_status=ReconciliationStatus.UNMATCHED,
            )
            db.add(new_tx)
            imported_count += 1

        # Update account sync timestamp
        account.last_sync_at = datetime.now(timezone.utc)
        await db.commit()

        return {
            "message": f"Kontoutskrift synkronisert",
            "imported_transactions": imported_count,
            "period": f"{from_date} - {to_date}",
        }

    except NeonomicsError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Kunne ikke hente kontoutskrift fra banken: {str(e)}"
        )


# ============================================================================
# Notification Settings Endpoints
# ============================================================================

class NotificationSettingsResponse(BaseModel):
    """Notification settings for the company."""
    notification_email: Optional[str] = None
    notification_day: int = 1
    notification_enabled: bool = False


class NotificationSettingsRequest(BaseModel):
    """Request to update notification settings."""
    notification_email: Optional[str] = None
    notification_day: int = Field(1, ge=0, le=6)
    notification_enabled: bool = False


@router.get("/notification-settings", response_model=NotificationSettingsResponse)
async def get_notification_settings(db: AsyncSession = Depends(get_db)):
    """Get company notification settings."""
    company = await get_company(db)
    return NotificationSettingsResponse(
        notification_email=company.notification_email,
        notification_day=company.notification_day,
        notification_enabled=company.notification_enabled,
    )


@router.put("/notification-settings", response_model=NotificationSettingsResponse)
async def update_notification_settings(
    request: NotificationSettingsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update company notification settings."""
    company = await get_company(db)

    company.notification_email = request.notification_email
    company.notification_day = request.notification_day
    company.notification_enabled = request.notification_enabled

    await db.commit()
    await db.refresh(company)

    return NotificationSettingsResponse(
        notification_email=company.notification_email,
        notification_day=company.notification_day,
        notification_enabled=company.notification_enabled,
    )


# ============================================================================
# Manual Bilag Attach Endpoint
# ============================================================================

@router.post("/transactions/{transaction_id}/attach-bilag")
async def attach_bilag_to_transaction(
    transaction_id: uuid.UUID,
    bilag_id: uuid.UUID = Query(..., description="ID of bilag to attach"),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually attach a bilag to a specific transaction.

    Creates a confirmed match between the transaction and the bilag.
    """
    company_id = await get_company_id(db)

    # Verify transaction
    tx_query = select(BankTransaction).where(
        and_(
            BankTransaction.id == transaction_id,
            BankTransaction.company_id == company_id,
        )
    )
    tx_result = await db.execute(tx_query)
    transaction = tx_result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaksjon ikke funnet")

    # Verify bilag
    bilag_query = select(Bilag).where(
        and_(
            Bilag.id == bilag_id,
            Bilag.company_id == company_id,
        )
    )
    bilag_result = await db.execute(bilag_query)
    bilag = bilag_result.scalar_one_or_none()

    if not bilag:
        raise HTTPException(status_code=404, detail="Bilag ikke funnet")

    # Create confirmed match
    match = ReconciliationMatch(
        company_id=company_id,
        bank_transaction_id=transaction_id,
        bilag_id=bilag_id,
        match_type=MatchType.ONE_TO_ONE,
        confidence=MatchConfidence.HIGH,
        confidence_score=1.0,
        status=MatchStatus.CONFIRMED,
        transaction_amount=transaction.amount,
        matched_amount=bilag.gross_amount,
        difference=abs(transaction.amount) - abs(bilag.gross_amount),
        match_factors={"manual_attach": True},
        ciri_explanation="Manuelt tilknyttet av bruker",
    )
    match.confirm()

    transaction.reconciliation_status = ReconciliationStatus.MATCHED
    transaction.reconciled_at = datetime.now(timezone.utc)

    db.add(match)
    await db.commit()

    return {"message": "Bilag tilknyttet transaksjonen"}
