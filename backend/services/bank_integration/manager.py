"""
Bank Manager
Unified interface for managing multiple bank integrations.

This module provides a single entry point for all bank operations,
handling bank selection, adapter instantiation, and common operations.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional
from dataclasses import dataclass, field

from config.settings import settings

from .base import (
    BankAdapter,
    BankInfo,
    BankAccountInfo,
    BankTransactionInfo,
    BankBalance,
    BankError,
    AuthorizationResult,
)
from .dnb import DNBAdapter, DNB_BANK_INFO, DNB_SANDBOX_INFO
from .nordea import NordeaAdapter, NORDEA_BANK_INFO, NORDEA_SANDBOX_INFO
from .sparebank1 import SpareBank1Adapter, SPAREBANK1_BANKS, get_sparebank1_regional_banks
from .tink import TinkClient, TinkAdapter, get_tink_client
from .roaring import RoaringAdapter, get_roaring_client, ROARING_BANK_INFO


@dataclass
class SupportedBank:
    """Information about a supported bank for the UI."""

    id: str
    name: str
    logo_url: str
    primary_color: str
    market_share: float  # Percentage
    description: str = ""
    is_popular: bool = False


# All supported banks with metadata for UI
SUPPORTED_BANKS: list[SupportedBank] = [
    # Roaring.io aggregator (sandbox-friendly) - Mock ASPSP with test data
    SupportedBank(
        id="roaring",
        name="Roaring.io (Sandbox)",
        logo_url="/images/banks/roaring.svg",
        primary_color="#6366F1",
        market_share=100.0,  # Aggregator covers all
        description="Koble til banker via Roaring.io (Mock ASPSP for testing)",
        is_popular=True,
    ),
    # Tink aggregator (recommended for production) - supports all banks via single integration
    SupportedBank(
        id="tink",
        name="Tink (Alle banker)",
        logo_url="/images/banks/tink.svg",
        primary_color="#0055FF",
        market_share=100.0,  # Aggregator covers all
        description="Koble til alle norske banker via Tink",
        is_popular=True,
    ),
    SupportedBank(
        id="dnb",
        name="DNB",
        logo_url="/images/banks/dnb.svg",
        primary_color="#00754a",
        market_share=54.0,
        description="Norges største bank",
        is_popular=True,
    ),
    SupportedBank(
        id="nordea",
        name="Nordea",
        logo_url="/images/banks/nordea.svg",
        primary_color="#0000a0",
        market_share=10.0,
        description="Nordisk storbank",
        is_popular=True,
    ),
    SupportedBank(
        id="sparebank1",
        name="SpareBank 1",
        logo_url="/images/banks/sparebank1.svg",
        primary_color="#002776",
        market_share=15.0,
        description="Landets største sparebankgruppe",
        is_popular=True,
    ),
    SupportedBank(
        id="sparebank1-sr",
        name="SpareBank 1 SR-Bank",
        logo_url="/images/banks/sparebank1.svg",
        primary_color="#002776",
        market_share=5.36,
        description="Vestlandet og Rogaland",
    ),
    SupportedBank(
        id="sparebank1-smn",
        name="SpareBank 1 SMN",
        logo_url="/images/banks/sparebank1.svg",
        primary_color="#002776",
        market_share=3.5,
        description="Midt-Norge",
    ),
    SupportedBank(
        id="sparebank1-ostlandet",
        name="SpareBank 1 Østlandet",
        logo_url="/images/banks/sparebank1.svg",
        primary_color="#002776",
        market_share=3.28,
        description="Østlandet",
    ),
    SupportedBank(
        id="sparebank1-nord-norge",
        name="SpareBank 1 Nord-Norge",
        logo_url="/images/banks/sparebank1.svg",
        primary_color="#002776",
        market_share=2.37,
        description="Nord-Norge",
    ),
]


@dataclass
class KontoutskriftExport:
    """
    Kontoutskrift (bank statement) export format.

    This is the unified format for bank statements across all banks.
    """

    # Account info
    kontonummer: str
    kontonavn: str
    bank: str
    iban: Optional[str] = None

    # Period
    periode_fra: date = None
    periode_til: date = None

    # Balances
    inngaende_saldo: Decimal = Decimal("0")
    utgaende_saldo: Decimal = Decimal("0")

    # Totals
    sum_inn: Decimal = Decimal("0")  # Sum of credits
    sum_ut: Decimal = Decimal("0")  # Sum of debits
    antall_transaksjoner: int = 0

    # Transactions
    transaksjoner: list[BankTransactionInfo] = field(default_factory=list)

    # Metadata
    eksportert_dato: datetime = field(default_factory=datetime.utcnow)
    eksportert_av: str = "Ciri AI"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "kontonummer": self.kontonummer,
            "kontonavn": self.kontonavn,
            "bank": self.bank,
            "iban": self.iban,
            "periode_fra": self.periode_fra.isoformat() if self.periode_fra else None,
            "periode_til": self.periode_til.isoformat() if self.periode_til else None,
            "inngaende_saldo": float(self.inngaende_saldo),
            "utgaende_saldo": float(self.utgaende_saldo),
            "sum_inn": float(self.sum_inn),
            "sum_ut": float(self.sum_ut),
            "antall_transaksjoner": self.antall_transaksjoner,
            "transaksjoner": [
                {
                    "id": t.transaction_id,
                    "dato": t.booking_date.isoformat(),
                    "verdidato": t.value_date.isoformat() if t.value_date else None,
                    "beskrivelse": t.description,
                    "belop": float(t.amount),
                    "valuta": t.currency,
                    "inn": float(t.amount) if t.is_credit else None,
                    "ut": float(abs(t.amount)) if t.is_debit else None,
                    "motpart": t.counterparty_name,
                    "motpart_konto": t.counterparty_account,
                    "kid": t.kid,
                    "saldo_etter": float(t.balance_after_transaction) if t.balance_after_transaction else None,
                }
                for t in self.transaksjoner
            ],
            "eksportert_dato": self.eksportert_dato.isoformat(),
            "eksportert_av": self.eksportert_av,
        }


class BankManager:
    """
    Unified bank manager for all direct bank integrations.

    Provides a single interface for:
    - Listing available banks
    - Creating bank connections
    - Fetching accounts and transactions
    - Generating kontoutskrift exports
    """

    def __init__(self, sandbox: bool = False):
        self.sandbox = sandbox
        self._adapters: dict[str, BankAdapter] = {}

    def get_supported_banks(self, popular_only: bool = False) -> list[SupportedBank]:
        """Get list of supported banks for the UI."""
        if popular_only:
            return [b for b in SUPPORTED_BANKS if b.is_popular]
        return SUPPORTED_BANKS

    def get_bank_info(self, bank_id: str) -> Optional[BankInfo]:
        """Get bank info by ID."""
        # Roaring.io aggregator (sandbox-friendly)
        if bank_id == "roaring":
            return ROARING_BANK_INFO

        # Tink aggregator
        if bank_id == "tink":
            return BankInfo(
                id="tink",
                name="Tink (by Visa)",
                bic="",
                api_base_url="https://api.tink.com",
                auth_url="https://link.tink.com",
                token_url="https://api.tink.com/api/v1/oauth/token",
                max_transaction_history_days=365,
                logo_url="/images/banks/tink.svg",
                primary_color="#0055FF",
                requires_qsealc=False,
                requires_qwac=False,
            )

        bank_info_map = {
            "dnb": DNB_SANDBOX_INFO if self.sandbox else DNB_BANK_INFO,
            "dnb-sandbox": DNB_SANDBOX_INFO,
            "nordea": NORDEA_SANDBOX_INFO if self.sandbox else NORDEA_BANK_INFO,
            "nordea-sandbox": NORDEA_SANDBOX_INFO,
        }

        # Check direct mapping first
        if bank_id in bank_info_map:
            return bank_info_map[bank_id]

        # Check SpareBank 1 banks
        if bank_id in SPAREBANK1_BANKS:
            return SPAREBANK1_BANKS[bank_id]

        return None

    def get_adapter(self, bank_id: str) -> BankAdapter:
        """
        Get or create a bank adapter.

        Uses settings for client credentials.
        """
        if bank_id in self._adapters:
            return self._adapters[bank_id]

        # Get bank-specific credentials from settings
        # In production, these would be separate per bank
        adapter = self._create_adapter(bank_id)
        self._adapters[bank_id] = adapter
        return adapter

    def _create_adapter(self, bank_id: str) -> BankAdapter:
        """Create a new adapter for the specified bank."""
        # Roaring.io (sandbox-friendly aggregator)
        if bank_id == "roaring":
            client = get_roaring_client()
            if not client:
                raise BankError(
                    message="Roaring.io er ikke konfigurert. Legg til credentials i .env",
                    bank_id="roaring",
                )
            return RoaringAdapter(client)

        # Tink (recommended aggregator for production)
        if bank_id == "tink":
            client = get_tink_client()
            return TinkAdapter(client)

        # DNB
        if bank_id in ("dnb", "dnb-sandbox"):
            return DNBAdapter(
                client_id=settings.dnb_client_id,
                client_secret=settings.dnb_client_secret,
                sandbox=self.sandbox or bank_id == "dnb-sandbox",
                certificate_path=settings.dnb_certificate_path,
                key_path=settings.dnb_key_path,
            )

        # Nordea
        if bank_id in ("nordea", "nordea-sandbox"):
            return NordeaAdapter(
                client_id=settings.nordea_client_id,
                client_secret=settings.nordea_client_secret,
                sandbox=self.sandbox or bank_id == "nordea-sandbox",
                certificate_path=settings.nordea_certificate_path,
                key_path=settings.nordea_key_path,
            )

        # SpareBank 1 (any regional bank)
        if bank_id.startswith("sparebank1"):
            return SpareBank1Adapter(
                client_id=settings.sparebank1_client_id,
                client_secret=settings.sparebank1_client_secret,
                bank_id=bank_id,
                sandbox=self.sandbox,
            )

        raise BankError(
            message=f"Unknown bank: {bank_id}",
            bank_id=bank_id,
        )

    # =========================================================================
    # Authorization
    # =========================================================================

    async def get_authorization_url(
        self,
        bank_id: str,
        redirect_uri: str,
        state: str,
    ) -> str:
        """Get authorization URL for bank connection."""
        adapter = self.get_adapter(bank_id)
        return await adapter.get_authorization_url(redirect_uri, state)

    async def complete_authorization(
        self,
        bank_id: str,
        code: str,
        redirect_uri: str,
    ) -> AuthorizationResult:
        """Complete bank authorization with code exchange."""
        adapter = self.get_adapter(bank_id)
        return await adapter.exchange_code(code, redirect_uri)

    async def refresh_token(
        self,
        bank_id: str,
        refresh_token: str,
    ) -> AuthorizationResult:
        """Refresh bank access token."""
        adapter = self.get_adapter(bank_id)
        return await adapter.refresh_token(refresh_token)

    # =========================================================================
    # Account Information
    # =========================================================================

    async def get_accounts(
        self,
        bank_id: str,
        access_token: str,
    ) -> list[BankAccountInfo]:
        """Get accounts from bank."""
        adapter = self.get_adapter(bank_id)
        return await adapter.get_accounts(access_token)

    async def get_account(
        self,
        bank_id: str,
        access_token: str,
        account_id: str,
    ) -> BankAccountInfo:
        """Get specific account details."""
        adapter = self.get_adapter(bank_id)
        return await adapter.get_account(access_token, account_id)

    async def get_balances(
        self,
        bank_id: str,
        access_token: str,
        account_id: str,
    ) -> list[BankBalance]:
        """Get account balances."""
        adapter = self.get_adapter(bank_id)
        return await adapter.get_balances(access_token, account_id)

    async def get_transactions(
        self,
        bank_id: str,
        access_token: str,
        account_id: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[BankTransactionInfo]:
        """Get account transactions."""
        adapter = self.get_adapter(bank_id)
        return await adapter.get_transactions(
            access_token,
            account_id,
            date_from,
            date_to,
        )

    # =========================================================================
    # Kontoutskrift Export
    # =========================================================================

    async def get_kontoutskrift(
        self,
        bank_id: str,
        access_token: str,
        account_id: str,
        date_from: date,
        date_to: date,
    ) -> KontoutskriftExport:
        """
        Generate a complete kontoutskrift (bank statement).

        This fetches all data needed for a formal bank statement export.
        """
        adapter = self.get_adapter(bank_id)

        # Get account details
        account = await adapter.get_account(access_token, account_id)

        # Get transactions
        transactions = await adapter.get_transactions(
            access_token,
            account_id,
            date_from,
            date_to,
        )

        # Calculate totals
        sum_inn = Decimal("0")
        sum_ut = Decimal("0")

        for tx in transactions:
            if tx.is_credit:
                sum_inn += tx.amount
            else:
                sum_ut += abs(tx.amount)

        # Get current balance for utgående saldo
        utgaende_saldo = account.current_balance or Decimal("0")

        # Calculate inngående saldo (opening balance)
        # = current balance - credits + debits in period
        inngaende_saldo = utgaende_saldo - sum_inn + sum_ut

        return KontoutskriftExport(
            kontonummer=account.formatted_account_number,
            kontonavn=account.name or account.display_name or "Konto",
            bank=adapter.bank_name,
            iban=account.iban,
            periode_fra=date_from,
            periode_til=date_to,
            inngaende_saldo=inngaende_saldo,
            utgaende_saldo=utgaende_saldo,
            sum_inn=sum_inn,
            sum_ut=sum_ut,
            antall_transaksjoner=len(transactions),
            transaksjoner=transactions,
        )

    async def sync_transactions(
        self,
        bank_id: str,
        access_token: str,
        account_id: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[BankTransactionInfo]:
        """
        Sync latest transactions from bank.

        Fetches new transactions and returns them for import.
        """
        if not date_to:
            date_to = date.today()
        if not date_from:
            # Default to last 90 days, but allow requesting more
            date_from = date_to - timedelta(days=90)

        return await self.get_transactions(
            bank_id,
            access_token,
            account_id,
            date_from,
            date_to,
        )


# Singleton instance
bank_manager = BankManager(sandbox=settings.bank_sandbox_mode)
