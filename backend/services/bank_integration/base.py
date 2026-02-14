"""
Base classes for direct bank integration.
Follows Berlin Group NextGenPSD2 standard for data structures.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Any
from enum import Enum


class BankError(Exception):
    """Bank API error."""

    def __init__(
        self,
        message: str,
        bank_id: str = None,
        status_code: int = None,
        error_code: str = None,
        retry_after: int = None,
    ):
        self.message = message
        self.bank_id = bank_id
        self.status_code = status_code
        self.error_code = error_code
        self.retry_after = retry_after  # Seconds until retry (rate limiting)
        super().__init__(message)


class ConsentStatus(str, Enum):
    """PSD2 consent status."""
    VALID = "valid"
    EXPIRED = "expired"
    REVOKED = "revoked"
    RECEIVED = "received"
    REJECTED = "rejected"


@dataclass
class BankInfo:
    """
    Norwegian bank information.

    Each bank has its own PSD2 API that follows the Berlin Group
    NextGenPSD2 standard (with minor variations).
    """

    id: str  # Unique identifier (e.g., "dnb", "nordea", "sparebank1-sr")
    name: str  # Display name (e.g., "DNB", "Nordea", "SpareBank 1 SR-Bank")
    bic: str  # BIC/SWIFT code

    # API configuration
    api_base_url: str  # Base URL for PSD2 API
    auth_url: str  # OAuth authorization URL
    token_url: str  # Token endpoint

    # Features
    supports_payment_initiation: bool = True
    supports_balance: bool = True
    supports_transactions: bool = True
    max_transaction_history_days: int = 365  # Max history available

    # UI
    logo_url: Optional[str] = None
    primary_color: str = "#1a1a2e"  # For UI theming

    # eIDAS requirements
    requires_qsealc: bool = True  # Most banks require qualified seal certificates
    requires_qwac: bool = False  # Some require qualified web auth certs


@dataclass
class BankBalance:
    """
    Account balance following NextGenPSD2 schema.

    balanceType values per Berlin Group:
    - closingBooked: Balance at end of last business day
    - expected: Balance including pending transactions
    - interimAvailable: Available for immediate use
    """

    amount: Decimal
    currency: str = "NOK"
    balance_type: str = "closingBooked"  # closingBooked, expected, interimAvailable
    reference_date: Optional[date] = None
    last_committed_transaction: Optional[str] = None


@dataclass
class BankAccountInfo:
    """
    Bank account following NextGenPSD2 AccountDetails schema.

    https://www.berlin-group.org/nextgenpsd2-downloads
    """

    # Required fields
    resource_id: str  # Internal bank resource ID
    iban: Optional[str] = None  # International Bank Account Number
    bban: Optional[str] = None  # Norwegian account number (e.g., "1234.56.78901")

    # Account identification
    name: Optional[str] = None  # Account name/alias
    display_name: Optional[str] = None  # User-friendly display name
    product: Optional[str] = None  # Product name (e.g., "Brukskonto", "Sparekonto")

    # Owner information
    owner_name: Optional[str] = None

    # Currency and type
    currency: str = "NOK"
    cash_account_type: str = "CACC"  # CACC=Current, SVGS=Savings, etc.

    # Status
    status: str = "enabled"  # enabled, deleted, blocked

    # Balances
    balances: list[BankBalance] = field(default_factory=list)

    # Links (HATEOAS)
    _links: dict = field(default_factory=dict)

    @property
    def account_number(self) -> str:
        """Get the Norwegian account number (BBAN or extracted from IBAN)."""
        if self.bban:
            return self.bban
        if self.iban and self.iban.startswith("NO"):
            # Norwegian IBAN: NO + 2 check digits + 11 digit account number
            return self.iban[4:]
        return self.resource_id

    @property
    def formatted_account_number(self) -> str:
        """Get account number in Norwegian format (XXXX.XX.XXXXX)."""
        num = self.account_number.replace(".", "").replace(" ", "")
        if len(num) == 11:
            return f"{num[:4]}.{num[4:6]}.{num[6:]}"
        return num

    @property
    def current_balance(self) -> Optional[Decimal]:
        """Get the current booked balance."""
        for bal in self.balances:
            if bal.balance_type in ("closingBooked", "expected"):
                return bal.amount
        return self.balances[0].amount if self.balances else None

    @property
    def available_balance(self) -> Optional[Decimal]:
        """Get the available balance."""
        for bal in self.balances:
            if bal.balance_type == "interimAvailable":
                return bal.amount
        return None


@dataclass
class BankTransactionInfo:
    """
    Bank transaction following NextGenPSD2 TransactionDetails schema.

    This is the unified schema for kontoutskrift data.
    """

    # Required fields (no defaults) must come first
    transaction_id: str  # Unique transaction identifier
    amount: Decimal  # Signed: positive=credit, negative=debit
    booking_date: date  # When booked by the bank

    # Optional fields with defaults
    currency: str = "NOK"
    value_date: Optional[date] = None  # Value/settlement date

    # Description (NextGenPSD2: remittanceInformationUnstructured)
    remittance_information: str = ""  # Free text description
    additional_information: Optional[str] = None  # Extra details

    # Counterparty (creditor for outgoing, debtor for incoming)
    creditor_name: Optional[str] = None
    creditor_account_iban: Optional[str] = None
    creditor_account_bban: Optional[str] = None
    debtor_name: Optional[str] = None
    debtor_account_iban: Optional[str] = None
    debtor_account_bban: Optional[str] = None

    # References
    end_to_end_id: Optional[str] = None  # End-to-end reference
    mandate_id: Optional[str] = None  # Direct debit mandate
    creditor_reference: Optional[str] = None  # KID number in Norway

    # Bank codes
    bank_transaction_code: Optional[str] = None  # ISO 20022 code
    proprietary_bank_code: Optional[str] = None  # Bank-specific code

    # Card transactions
    card_number_masked: Optional[str] = None  # e.g., "****1234"
    merchant_category_code: Optional[str] = None  # MCC

    # Balance after transaction
    balance_after_transaction: Optional[Decimal] = None

    # Status
    status: str = "booked"  # booked, pending

    # Raw data for debugging
    _raw: dict = field(default_factory=dict)

    @property
    def is_credit(self) -> bool:
        """Is this an incoming transaction (credit)?"""
        return self.amount >= 0

    @property
    def is_debit(self) -> bool:
        """Is this an outgoing transaction (debit)?"""
        return self.amount < 0

    @property
    def counterparty_name(self) -> Optional[str]:
        """Get the counterparty name (creditor or debtor)."""
        if self.is_debit:
            return self.creditor_name
        return self.debtor_name

    @property
    def counterparty_account(self) -> Optional[str]:
        """Get the counterparty account number."""
        if self.is_debit:
            return self.creditor_account_iban or self.creditor_account_bban
        return self.debtor_account_iban or self.debtor_account_bban

    @property
    def kid(self) -> Optional[str]:
        """Get the KID (payment reference) if available."""
        return self.creditor_reference

    @property
    def description(self) -> str:
        """Get a clean transaction description."""
        return self.remittance_information or self.additional_information or ""


@dataclass
class AuthorizationResult:
    """Result of bank authorization flow."""

    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "Bearer"
    expires_in: int = 3600  # Seconds
    scope: Optional[str] = None

    # Consent info
    consent_id: Optional[str] = None
    consent_status: ConsentStatus = ConsentStatus.VALID
    consent_expires_at: Optional[datetime] = None

    # Additional data from bank
    extra: dict = field(default_factory=dict)


class BankAdapter(ABC):
    """
    Abstract base class for bank adapters.

    Each bank (DNB, Nordea, SpareBank 1) has its own adapter
    that implements the Berlin Group NextGenPSD2 API with
    bank-specific variations.
    """

    def __init__(self, bank_info: BankInfo, client_id: str, client_secret: str):
        self.bank_info = bank_info
        self.client_id = client_id
        self.client_secret = client_secret

    @property
    def bank_id(self) -> str:
        return self.bank_info.id

    @property
    def bank_name(self) -> str:
        return self.bank_info.name

    # =========================================================================
    # Authorization Flow (OAuth2 + PSD2 Consent)
    # =========================================================================

    @abstractmethod
    async def get_authorization_url(
        self,
        redirect_uri: str,
        state: str,
        scope: str = "accounts",
        psu_ip_address: str = "127.0.0.1",
    ) -> str:
        """
        Get the URL to redirect user for bank authorization.

        The user will authenticate with BankID and grant consent.

        Args:
            redirect_uri: Where to redirect after authorization
            state: CSRF state parameter
            scope: PSD2 scope (accounts, payments, etc.)
            psu_ip_address: Payment Service User's IP (required by PSD2)

        Returns:
            Authorization URL to redirect user to
        """
        pass

    @abstractmethod
    async def exchange_code(
        self,
        code: str,
        redirect_uri: str,
    ) -> AuthorizationResult:
        """
        Exchange authorization code for tokens.

        Args:
            code: Authorization code from callback
            redirect_uri: Must match the one used in authorization

        Returns:
            Tokens and consent information
        """
        pass

    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> AuthorizationResult:
        """
        Refresh an expiring access token.

        Args:
            refresh_token: The refresh token

        Returns:
            New tokens
        """
        pass

    # =========================================================================
    # Account Information Services (AIS)
    # =========================================================================

    @abstractmethod
    async def get_accounts(
        self,
        access_token: str,
    ) -> list[BankAccountInfo]:
        """
        Get list of user's accounts.

        Args:
            access_token: Valid access token

        Returns:
            List of accounts
        """
        pass

    @abstractmethod
    async def get_account(
        self,
        access_token: str,
        account_id: str,
    ) -> BankAccountInfo:
        """
        Get details for a specific account.

        Args:
            access_token: Valid access token
            account_id: Account resource ID

        Returns:
            Account details
        """
        pass

    @abstractmethod
    async def get_balances(
        self,
        access_token: str,
        account_id: str,
    ) -> list[BankBalance]:
        """
        Get balances for an account.

        Args:
            access_token: Valid access token
            account_id: Account resource ID

        Returns:
            List of balances (different types)
        """
        pass

    @abstractmethod
    async def get_transactions(
        self,
        access_token: str,
        account_id: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        booking_status: str = "both",  # booked, pending, both
    ) -> list[BankTransactionInfo]:
        """
        Get transactions (kontoutskrift) for an account.

        This is the core method for extracting kontoutskrift data.

        Args:
            access_token: Valid access token
            account_id: Account resource ID
            date_from: Start date (default: 90 days ago)
            date_to: End date (default: today)
            booking_status: Filter by booking status

        Returns:
            List of transactions
        """
        pass

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _parse_amount(self, amount_obj: dict) -> tuple[Decimal, str]:
        """Parse NextGenPSD2 amount object."""
        amount = Decimal(str(amount_obj.get("amount", 0)))
        currency = amount_obj.get("currency", "NOK")
        return amount, currency

    def _parse_date(self, date_str: Optional[str]) -> Optional[date]:
        """Parse ISO date string."""
        if not date_str:
            return None
        try:
            return date.fromisoformat(date_str)
        except ValueError:
            return None

    def _parse_datetime(self, dt_str: Optional[str]) -> Optional[datetime]:
        """Parse ISO datetime string."""
        if not dt_str:
            return None
        try:
            # Handle various formats
            dt_str = dt_str.replace("Z", "+00:00")
            return datetime.fromisoformat(dt_str)
        except ValueError:
            return None
