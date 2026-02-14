"""
GoCardless Bank Account Data Integration
(Formerly Nordigen)

FREE open banking aggregator that handles PSD2 compliance for you.
No eIDAS certificates required!

Features:
- Free tier: 50 bank connections/month
- 4 syncs per day per bank
- Returns Berlin Group PSD2 format
- Covers 2,500+ banks across Europe including Norwegian banks

Get credentials: https://bankaccountdata.gocardless.com/user-secrets/
Documentation: https://developer.gocardless.com/bank-account-data/

Based on: https://github.com/nordigen/nordigen-python
"""

import httpx
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Any
from dataclasses import dataclass
from uuid import uuid4

from config.settings import settings
from .base import (
    BankAdapter,
    BankInfo,
    BankAccountInfo,
    BankTransactionInfo,
    BankBalance,
    BankError,
    AuthorizationResult,
    ConsentStatus,
)


# GoCardless Bank Account Data API endpoints
GOCARDLESS_API_URL = "https://bankaccountdata.gocardless.com/api/v2"


@dataclass
class GoCardlessInstitution:
    """Bank/Institution from GoCardless."""
    id: str
    name: str
    bic: str
    logo: str
    countries: list[str]
    transaction_total_days: int  # Max days of history available


@dataclass
class RequisitionDto:
    """DTO for requisition create response (Nordigen SDK compatible)."""
    link: str
    requisition_id: str


class InstitutionApi:
    """Sub-API for institutions (Nordigen SDK compatible)."""

    def __init__(self, client: "GoCardlessClient"):
        self.client = client

    async def get_institutions(self, country: str = "NO") -> list[dict]:
        """Get all institutions for a country."""
        return await self.client._request("GET", f"institutions/?country={country}")

    async def get_institution_by_id(self, institution_id: str) -> dict:
        """Get institution by ID."""
        return await self.client._request("GET", f"institutions/{institution_id}/")


class RequisitionApi:
    """Sub-API for requisitions (Nordigen SDK compatible)."""

    def __init__(self, client: "GoCardlessClient"):
        self.client = client

    async def get_requisition_by_id(self, requisition_id: str) -> dict:
        """Get requisition by ID."""
        return await self.client._request("GET", f"requisitions/{requisition_id}/")

    async def create_requisition(
        self,
        redirect_uri: str,
        institution_id: str,
        reference_id: str,
        agreement: str,
        user_language: str = "NO",
        account_selection: bool = False,
    ) -> dict:
        """Create a requisition."""
        return await self.client._request(
            "POST",
            "requisitions/",
            json={
                "redirect": redirect_uri,
                "institution_id": institution_id,
                "reference": reference_id,
                "agreement": agreement,
                "user_language": user_language,
                "account_selection": account_selection,
            },
        )


class AgreementApi:
    """Sub-API for agreements (Nordigen SDK compatible)."""

    def __init__(self, client: "GoCardlessClient"):
        self.client = client

    async def create_agreement(
        self,
        institution_id: str,
        max_historical_days: int = 90,
        access_valid_for_days: int = 90,
        access_scope: Optional[list[str]] = None,
    ) -> dict:
        """Create an end-user agreement."""
        if access_scope is None:
            access_scope = ["balances", "details", "transactions"]

        return await self.client._request(
            "POST",
            "agreements/enduser/",
            json={
                "institution_id": institution_id,
                "max_historical_days": max_historical_days,
                "access_valid_for_days": access_valid_for_days,
                "access_scope": access_scope,
            },
        )


class AccountApi:
    """Sub-API for account data (Nordigen SDK compatible)."""

    def __init__(self, client: "GoCardlessClient", account_id: str):
        self.client = client
        self.id = account_id

    async def get_metadata(self) -> dict:
        """Get account metadata."""
        return await self.client._request("GET", f"accounts/{self.id}/")

    async def get_details(self) -> dict:
        """Get account details."""
        return await self.client._request("GET", f"accounts/{self.id}/details/")

    async def get_balances(self) -> dict:
        """Get account balances."""
        return await self.client._request("GET", f"accounts/{self.id}/balances/")

    async def get_transactions(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> dict:
        """Get account transactions."""
        params = {}
        if date_from:
            params["date_from"] = date_from
        if date_to:
            params["date_to"] = date_to

        return await self.client._request(
            "GET",
            f"accounts/{self.id}/transactions/",
            params=params if params else None,
        )


class GoCardlessClient:
    """
    GoCardless Bank Account Data client.

    This is a FREE service that provides PSD2 bank access without
    requiring your own eIDAS certificates.

    Pricing (as of 2024):
    - Free tier: 50 bank connections/month
    - 4 syncs per day per connection
    - No per-transaction fees

    Flow:
    1. Get institutions (banks) for Norway
    2. Create requisition (bank auth session)
    3. User authorizes via bank's website
    4. Fetch accounts and transactions

    Compatible with Nordigen Python SDK interface.
    """

    def __init__(
        self,
        secret_id: str,
        secret_key: str,
        base_url: str = GOCARDLESS_API_URL,
    ):
        self.secret_id = secret_id
        self.secret_key = secret_key
        self.base_url = base_url
        self._access_token: Optional[str] = None
        self._refresh_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

        # Sub-APIs (Nordigen SDK compatible)
        self.institution = InstitutionApi(self)
        self.requisition = RequisitionApi(self)
        self.agreement = AgreementApi(self)

    def account_api(self, id: str) -> AccountApi:
        """Create account API instance for a specific account."""
        return AccountApi(self, id)

    @property
    def token(self) -> Optional[str]:
        """Get current access token."""
        return self._access_token

    @token.setter
    def token(self, value: str):
        """Set access token."""
        self._access_token = value

    async def generate_token(self) -> dict:
        """Generate new access token (Nordigen SDK compatible)."""
        await self._ensure_authenticated()
        return {
            "access": self._access_token,
            "refresh": self._refresh_token,
            "access_expires": 86400,
            "refresh_expires": 604800,
        }

    async def initialize_session(
        self,
        redirect_uri: str,
        institution_id: str,
        reference_id: str,
        max_historical_days: int = 90,
        access_valid_for_days: int = 90,
        account_selection: bool = False,
    ) -> RequisitionDto:
        """
        Initialize a complete bank session (Nordigen SDK compatible).

        Creates agreement and requisition in one call.
        """
        # Create agreement
        agreement = await self.agreement.create_agreement(
            institution_id=institution_id,
            max_historical_days=max_historical_days,
            access_valid_for_days=access_valid_for_days,
        )

        # Create requisition
        requisition = await self.requisition.create_requisition(
            redirect_uri=redirect_uri,
            institution_id=institution_id,
            reference_id=reference_id,
            agreement=agreement["id"],
            account_selection=account_selection,
        )

        return RequisitionDto(
            link=requisition["link"],
            requisition_id=requisition["id"],
        )

    async def _ensure_authenticated(self) -> None:
        """Ensure we have a valid access token."""
        if (
            self._access_token and
            self._token_expires_at and
            datetime.utcnow() < self._token_expires_at
        ):
            return

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/token/new/",
                json={
                    "secret_id": self.secret_id,
                    "secret_key": self.secret_key,
                },
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            )

            if response.status_code != 200:
                raise BankError(
                    message=f"GoCardless authentication failed: {response.text}",
                    bank_id="gocardless",
                    status_code=response.status_code,
                )

            data = response.json()
            self._access_token = data["access"]
            self._refresh_token = data.get("refresh")
            # Token expires in access_expires seconds
            expires_in = data.get("access_expires", 86400)
            self._token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in - 60)

    async def _request(
        self,
        method: str,
        path: str,
        **kwargs,
    ) -> dict:
        """Make authenticated request to GoCardless API."""
        await self._ensure_authenticated()

        headers = kwargs.pop("headers", {})
        headers.update({
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._access_token}",
        })

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method,
                f"{self.base_url}/{path}",
                headers=headers,
                **kwargs,
            )

            if response.status_code >= 400:
                error_data = response.json() if response.content else {}
                raise BankError(
                    message=error_data.get("detail", response.text),
                    bank_id="gocardless",
                    status_code=response.status_code,
                    error_code=error_data.get("type"),
                )

            return response.json() if response.content else {}

    # =========================================================================
    # Institutions (Banks)
    # =========================================================================

    async def get_institutions(self, country: str = "NO") -> list[GoCardlessInstitution]:
        """
        Get available banks for a country.

        Args:
            country: ISO 3166-1 alpha-2 country code (default: NO for Norway)

        Returns:
            List of available banks
        """
        data = await self._request("GET", f"institutions/?country={country}")

        return [
            GoCardlessInstitution(
                id=bank["id"],
                name=bank["name"],
                bic=bank.get("bic", ""),
                logo=bank.get("logo", ""),
                countries=bank.get("countries", []),
                transaction_total_days=int(bank.get("transaction_total_days", 90)),
            )
            for bank in data
        ]

    async def get_institution_by_id(self, institution_id: str) -> GoCardlessInstitution:
        """Get details about a specific bank."""
        data = await self._request("GET", f"institutions/{institution_id}/")
        return GoCardlessInstitution(
            id=data["id"],
            name=data["name"],
            bic=data.get("bic", ""),
            logo=data.get("logo", ""),
            countries=data.get("countries", []),
            transaction_total_days=int(data.get("transaction_total_days", 90)),
        )

    # =========================================================================
    # Requisitions (Bank Auth Sessions)
    # =========================================================================

    async def create_requisition(
        self,
        institution_id: str,
        redirect_uri: str,
        reference_id: Optional[str] = None,
        user_language: str = "NO",
        max_historical_days: int = 90,
        access_valid_for_days: int = 90,
    ) -> dict:
        """
        Create a bank authorization session.

        Args:
            institution_id: Bank ID from get_institutions()
            redirect_uri: Where to redirect after bank authorization
            reference_id: Your internal reference (e.g., user ID)
            user_language: Language for bank interface
            max_historical_days: Max transaction history to request
            access_valid_for_days: How long access should be valid

        Returns:
            Dict with requisition_id and link to redirect user to
        """
        if not reference_id:
            reference_id = str(uuid4())

        # First create an end-user agreement
        agreement = await self._request(
            "POST",
            "agreements/enduser/",
            json={
                "institution_id": institution_id,
                "max_historical_days": max_historical_days,
                "access_valid_for_days": access_valid_for_days,
                "access_scope": ["balances", "details", "transactions"],
            },
        )

        # Then create the requisition
        requisition = await self._request(
            "POST",
            "requisitions/",
            json={
                "institution_id": institution_id,
                "redirect": redirect_uri,
                "reference": reference_id,
                "agreement": agreement["id"],
                "user_language": user_language,
            },
        )

        return {
            "requisition_id": requisition["id"],
            "link": requisition["link"],  # Redirect user here
            "agreement_id": agreement["id"],
            "reference": reference_id,
        }

    async def get_requisition(self, requisition_id: str) -> dict:
        """
        Get requisition status and accounts.

        Call this after user returns from bank authorization.
        """
        return await self._request("GET", f"requisitions/{requisition_id}/")

    async def delete_requisition(self, requisition_id: str) -> None:
        """Delete a requisition (disconnect bank)."""
        await self._request("DELETE", f"requisitions/{requisition_id}/")

    # =========================================================================
    # Account Information
    # =========================================================================

    async def get_account_metadata(self, account_id: str) -> dict:
        """Get account metadata (status, IBAN, etc.)."""
        return await self._request("GET", f"accounts/{account_id}/")

    async def get_account_details(self, account_id: str) -> dict:
        """
        Get account details (owner name, currency, etc.).
        Returns data in Berlin Group PSD2 format.
        """
        return await self._request("GET", f"accounts/{account_id}/details/")

    async def get_account_balances(self, account_id: str) -> dict:
        """
        Get account balances.
        Returns data in Berlin Group PSD2 format.
        """
        return await self._request("GET", f"accounts/{account_id}/balances/")

    async def get_account_transactions(
        self,
        account_id: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> dict:
        """
        Get account transactions (kontoutskrift data).
        Returns data in Berlin Group PSD2 format.

        Args:
            account_id: Account ID from requisition
            date_from: Start date (default: 90 days ago)
            date_to: End date (default: today)

        Returns:
            Dict with 'booked' and 'pending' transactions
        """
        params = {}
        if date_from:
            params["date_from"] = date_from.isoformat()
        if date_to:
            params["date_to"] = date_to.isoformat()

        return await self._request(
            "GET",
            f"accounts/{account_id}/transactions/",
            params=params if params else None,
        )


class GoCardlessAdapter(BankAdapter):
    """
    Bank adapter that uses GoCardless for all banks.

    This is a wrapper that makes GoCardless work with our
    unified bank integration interface.
    """

    def __init__(
        self,
        institution: GoCardlessInstitution,
        client: GoCardlessClient,
    ):
        # Create a BankInfo from GoCardless institution
        bank_info = BankInfo(
            id=f"gc_{institution.id}",
            name=institution.name,
            bic=institution.bic,
            api_base_url=GOCARDLESS_API_URL,
            auth_url=GOCARDLESS_API_URL,
            token_url=GOCARDLESS_API_URL,
            max_transaction_history_days=institution.transaction_total_days,
            logo_url=institution.logo,
            requires_qsealc=False,  # GoCardless handles this!
            requires_qwac=False,
        )
        super().__init__(bank_info, "", "")

        self.client = client
        self.institution = institution

    async def get_authorization_url(
        self,
        redirect_uri: str,
        state: str,
        scope: str = "accounts",
        psu_ip_address: str = "127.0.0.1",
    ) -> str:
        """Get URL to redirect user for bank authorization."""
        result = await self.client.create_requisition(
            institution_id=self.institution.id,
            redirect_uri=redirect_uri,
            reference_id=state,
        )
        # Store requisition_id in state for later use
        return result["link"]

    async def exchange_code(
        self,
        code: str,  # This is the requisition_id for GoCardless
        redirect_uri: str,
    ) -> AuthorizationResult:
        """
        Get account access after user authorization.

        For GoCardless, 'code' is the requisition_id.
        """
        requisition = await self.client.get_requisition(code)

        return AuthorizationResult(
            access_token=code,  # Use requisition_id as the "token"
            refresh_token=None,
            expires_in=90 * 24 * 3600,  # 90 days
            consent_id=requisition.get("agreement"),
            consent_status=ConsentStatus.VALID,
            consent_expires_at=datetime.utcnow() + timedelta(days=90),
            extra={
                "accounts": requisition.get("accounts", []),
                "requisition_id": code,
            },
        )

    async def refresh_token(self, refresh_token: str) -> AuthorizationResult:
        """GoCardless doesn't use refresh tokens in the same way."""
        raise NotImplementedError("GoCardless requisitions don't need refresh")

    async def get_accounts(
        self,
        access_token: str,  # requisition_id
    ) -> list[BankAccountInfo]:
        """Get accounts from the requisition."""
        requisition = await self.client.get_requisition(access_token)

        accounts = []
        for account_id in requisition.get("accounts", []):
            # Get metadata
            metadata = await self.client.get_account_metadata(account_id)

            # Get details (may fail for some banks)
            try:
                details = await self.client.get_account_details(account_id)
                account_info = details.get("account", {})
            except BankError:
                account_info = {}

            # Get balances
            try:
                balances_data = await self.client.get_account_balances(account_id)
                balances = [
                    BankBalance(
                        amount=Decimal(str(b.get("balanceAmount", {}).get("amount", 0))),
                        currency=b.get("balanceAmount", {}).get("currency", "NOK"),
                        balance_type=b.get("balanceType", "closingBooked"),
                    )
                    for b in balances_data.get("balances", [])
                ]
            except BankError:
                balances = []

            accounts.append(BankAccountInfo(
                resource_id=account_id,
                iban=metadata.get("iban") or account_info.get("iban"),
                bban=metadata.get("bban"),
                name=account_info.get("name") or account_info.get("product"),
                owner_name=account_info.get("ownerName"),
                currency=account_info.get("currency", "NOK"),
                status=metadata.get("status", "enabled"),
                balances=balances,
            ))

        return accounts

    async def get_account(
        self,
        access_token: str,
        account_id: str,
    ) -> BankAccountInfo:
        """Get details for a specific account."""
        accounts = await self.get_accounts(access_token)
        for acc in accounts:
            if acc.resource_id == account_id:
                return acc
        raise BankError(
            message=f"Account {account_id} not found",
            bank_id=self.bank_id,
        )

    async def get_balances(
        self,
        access_token: str,
        account_id: str,
    ) -> list[BankBalance]:
        """Get balances for an account."""
        balances_data = await self.client.get_account_balances(account_id)
        return [
            BankBalance(
                amount=Decimal(str(b.get("balanceAmount", {}).get("amount", 0))),
                currency=b.get("balanceAmount", {}).get("currency", "NOK"),
                balance_type=b.get("balanceType", "closingBooked"),
            )
            for b in balances_data.get("balances", [])
        ]

    async def get_transactions(
        self,
        access_token: str,
        account_id: str,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        booking_status: str = "both",
    ) -> list[BankTransactionInfo]:
        """
        Get transactions (kontoutskrift) for an account.

        GoCardless returns data in Berlin Group PSD2 format.
        """
        data = await self.client.get_account_transactions(
            account_id,
            date_from,
            date_to,
        )

        transactions = []

        # Parse booked transactions
        for tx in data.get("transactions", {}).get("booked", []):
            transactions.append(self._parse_transaction(tx, "booked"))

        # Parse pending transactions
        if booking_status in ("pending", "both"):
            for tx in data.get("transactions", {}).get("pending", []):
                transactions.append(self._parse_transaction(tx, "pending"))

        # Sort by date descending
        transactions.sort(key=lambda t: t.booking_date, reverse=True)

        return transactions

    def _parse_transaction(self, tx: dict, status: str) -> BankTransactionInfo:
        """Parse a Berlin Group format transaction."""
        # Amount
        amount_data = tx.get("transactionAmount", {})
        amount = Decimal(str(amount_data.get("amount", 0)))
        currency = amount_data.get("currency", "NOK")

        # Balance after
        balance_after = None
        if tx.get("balanceAfterTransaction"):
            balance_after = Decimal(str(
                tx["balanceAfterTransaction"].get("balanceAmount", {}).get("amount", 0)
            ))

        # Counterparty
        creditor_iban = None
        creditor_bban = None
        debtor_iban = None
        debtor_bban = None

        if tx.get("creditorAccount"):
            creditor_iban = tx["creditorAccount"].get("iban")
            creditor_bban = tx["creditorAccount"].get("bban")
        if tx.get("debtorAccount"):
            debtor_iban = tx["debtorAccount"].get("iban")
            debtor_bban = tx["debtorAccount"].get("bban")

        return BankTransactionInfo(
            transaction_id=tx.get("transactionId") or tx.get("internalTransactionId", ""),
            amount=amount,
            currency=currency,
            booking_date=self._parse_date(tx.get("bookingDate")) or date.today(),
            value_date=self._parse_date(tx.get("valueDate")),
            remittance_information=tx.get("remittanceInformationUnstructured", ""),
            additional_information=tx.get("additionalInformation"),
            creditor_name=tx.get("creditorName"),
            creditor_account_iban=creditor_iban,
            creditor_account_bban=creditor_bban,
            debtor_name=tx.get("debtorName"),
            debtor_account_iban=debtor_iban,
            debtor_account_bban=debtor_bban,
            end_to_end_id=tx.get("endToEndId"),
            creditor_reference=tx.get("creditorReference"),  # KID
            bank_transaction_code=tx.get("bankTransactionCode"),
            proprietary_bank_code=tx.get("proprietaryBankTransactionCode"),
            balance_after_transaction=balance_after,
            status=status,
            _raw=tx,
        )


# Singleton client
_gocardless_client: Optional[GoCardlessClient] = None


def get_gocardless_client() -> GoCardlessClient:
    """Get or create GoCardless client singleton."""
    global _gocardless_client
    if _gocardless_client is None:
        _gocardless_client = GoCardlessClient(
            secret_id=settings.gocardless_secret_id,
            secret_key=settings.gocardless_secret_key,
        )
    return _gocardless_client


async def get_norwegian_banks() -> list[GoCardlessInstitution]:
    """Get all Norwegian banks available via GoCardless."""
    client = get_gocardless_client()
    return await client.get_institutions(country="NO")


async def create_bank_adapter(institution_id: str) -> GoCardlessAdapter:
    """Create a bank adapter for a specific institution."""
    client = get_gocardless_client()
    institution = await client.get_institution_by_id(institution_id)
    return GoCardlessAdapter(institution, client)
