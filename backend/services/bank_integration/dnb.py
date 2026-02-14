"""
DNB Bank Adapter
Direct integration with DNB's PSD2 API.

DNB is Norway's largest bank with ~54% market share.
Developer portal: https://developer.dnb.no

API follows Berlin Group NextGenPSD2 standard.
"""

import httpx
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional
from urllib.parse import urlencode

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


# DNB Bank configuration
DNB_BANK_INFO = BankInfo(
    id="dnb",
    name="DNB",
    bic="DNBANOKK",
    api_base_url="https://api.dnb.no",  # Production
    auth_url="https://psd2.dnb.no/oauth/authorize",
    token_url="https://psd2.dnb.no/oauth/token",
    supports_payment_initiation=True,
    supports_balance=True,
    supports_transactions=True,
    max_transaction_history_days=540,  # 18 months
    logo_url="/images/banks/dnb.svg",
    primary_color="#00754a",  # DNB Green
    requires_qsealc=True,
    requires_qwac=False,
)

# Sandbox configuration for development
DNB_SANDBOX_INFO = BankInfo(
    id="dnb-sandbox",
    name="DNB (Sandbox)",
    bic="DNBANOKK",
    api_base_url="https://developer-api-sandbox.dnb.no",
    auth_url="https://developer-api-sandbox.dnb.no/oauth/authorize",
    token_url="https://developer-api-sandbox.dnb.no/oauth/token",
    supports_payment_initiation=True,
    supports_balance=True,
    supports_transactions=True,
    max_transaction_history_days=365,
    logo_url="/images/banks/dnb.svg",
    primary_color="#00754a",
    requires_qsealc=False,  # Sandbox doesn't require certs
    requires_qwac=False,
)


class DNBAdapter(BankAdapter):
    """
    DNB PSD2 API adapter.

    Implements Berlin Group NextGenPSD2 with DNB-specific variations.

    API Documentation: https://developer.dnb.no/documentation/psd2-accounts
    """

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        sandbox: bool = False,
        certificate_path: Optional[str] = None,
        key_path: Optional[str] = None,
    ):
        bank_info = DNB_SANDBOX_INFO if sandbox else DNB_BANK_INFO
        super().__init__(bank_info, client_id, client_secret)

        self.sandbox = sandbox
        self.certificate_path = certificate_path
        self.key_path = key_path

    def _get_client(self) -> httpx.AsyncClient:
        """Get HTTP client with optional certificate authentication."""
        kwargs = {
            "timeout": 30.0,
            "headers": {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        }

        # Add client certificate for production
        if self.certificate_path and self.key_path:
            kwargs["cert"] = (self.certificate_path, self.key_path)

        return httpx.AsyncClient(**kwargs)

    async def _api_request(
        self,
        method: str,
        path: str,
        access_token: Optional[str] = None,
        psu_ip: str = "127.0.0.1",
        **kwargs,
    ) -> dict:
        """Make authenticated request to DNB API."""
        headers = kwargs.pop("headers", {})

        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"

        # PSD2 required headers
        headers["X-Request-ID"] = str(datetime.utcnow().timestamp()).replace(".", "")
        headers["PSU-IP-Address"] = psu_ip

        async with self._get_client() as client:
            url = f"{self.bank_info.api_base_url}{path}"
            response = await client.request(method, url, headers=headers, **kwargs)

            if response.status_code >= 400:
                error_data = response.json() if response.content else {}
                raise BankError(
                    message=error_data.get("tppMessages", [{}])[0].get("text", response.text),
                    bank_id=self.bank_id,
                    status_code=response.status_code,
                    error_code=error_data.get("tppMessages", [{}])[0].get("code"),
                )

            return response.json() if response.content else {}

    # =========================================================================
    # Authorization Flow
    # =========================================================================

    async def get_authorization_url(
        self,
        redirect_uri: str,
        state: str,
        scope: str = "accounts",
        psu_ip_address: str = "127.0.0.1",
    ) -> str:
        """
        Get DNB authorization URL.

        User will be redirected to DNB to authenticate with BankID
        and grant consent to access their accounts.
        """
        # Map scope to DNB's expected format
        scope_map = {
            "accounts": "AIS",  # Account Information Service
            "payments": "PIS",  # Payment Initiation Service
            "funds": "CBPII",  # Card-Based Payment Instrument Issuer
        }
        dnb_scope = scope_map.get(scope, "AIS")

        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": dnb_scope,
            "state": state,
        }

        return f"{self.bank_info.auth_url}?{urlencode(params)}"

    async def exchange_code(
        self,
        code: str,
        redirect_uri: str,
    ) -> AuthorizationResult:
        """Exchange authorization code for access token."""
        async with self._get_client() as client:
            response = await client.post(
                self.bank_info.token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            if response.status_code != 200:
                raise BankError(
                    message=f"Token exchange failed: {response.text}",
                    bank_id=self.bank_id,
                    status_code=response.status_code,
                )

            data = response.json()

            return AuthorizationResult(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token"),
                token_type=data.get("token_type", "Bearer"),
                expires_in=data.get("expires_in", 3600),
                scope=data.get("scope"),
                consent_id=data.get("consent_id"),
                consent_status=ConsentStatus.VALID,
                consent_expires_at=datetime.utcnow() + timedelta(days=90),
            )

    async def refresh_token(self, refresh_token: str) -> AuthorizationResult:
        """Refresh an expiring access token."""
        async with self._get_client() as client:
            response = await client.post(
                self.bank_info.token_url,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            if response.status_code != 200:
                raise BankError(
                    message=f"Token refresh failed: {response.text}",
                    bank_id=self.bank_id,
                    status_code=response.status_code,
                )

            data = response.json()

            return AuthorizationResult(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token", refresh_token),
                token_type=data.get("token_type", "Bearer"),
                expires_in=data.get("expires_in", 3600),
            )

    # =========================================================================
    # Account Information Services (AIS)
    # =========================================================================

    async def get_accounts(
        self,
        access_token: str,
    ) -> list[BankAccountInfo]:
        """Get list of user's DNB accounts."""
        data = await self._api_request(
            "GET",
            "/v1/accounts",
            access_token=access_token,
        )

        accounts = []
        for acc in data.get("accounts", []):
            # Parse balances
            balances = []
            for bal in acc.get("balances", []):
                amount, currency = self._parse_amount(bal.get("balanceAmount", {}))
                balances.append(BankBalance(
                    amount=amount,
                    currency=currency,
                    balance_type=bal.get("balanceType", "closingBooked"),
                    reference_date=self._parse_date(bal.get("referenceDate")),
                ))

            accounts.append(BankAccountInfo(
                resource_id=acc["resourceId"],
                iban=acc.get("iban"),
                bban=acc.get("bban"),
                name=acc.get("name"),
                display_name=acc.get("displayName"),
                product=acc.get("product"),
                owner_name=acc.get("ownerName"),
                currency=acc.get("currency", "NOK"),
                cash_account_type=acc.get("cashAccountType", "CACC"),
                status=acc.get("status", "enabled"),
                balances=balances,
                _links=acc.get("_links", {}),
            ))

        return accounts

    async def get_account(
        self,
        access_token: str,
        account_id: str,
    ) -> BankAccountInfo:
        """Get details for a specific account."""
        data = await self._api_request(
            "GET",
            f"/v1/accounts/{account_id}",
            access_token=access_token,
        )

        acc = data.get("account", data)

        # Parse balances
        balances = []
        for bal in acc.get("balances", []):
            amount, currency = self._parse_amount(bal.get("balanceAmount", {}))
            balances.append(BankBalance(
                amount=amount,
                currency=currency,
                balance_type=bal.get("balanceType", "closingBooked"),
                reference_date=self._parse_date(bal.get("referenceDate")),
            ))

        return BankAccountInfo(
            resource_id=acc["resourceId"],
            iban=acc.get("iban"),
            bban=acc.get("bban"),
            name=acc.get("name"),
            display_name=acc.get("displayName"),
            product=acc.get("product"),
            owner_name=acc.get("ownerName"),
            currency=acc.get("currency", "NOK"),
            cash_account_type=acc.get("cashAccountType", "CACC"),
            status=acc.get("status", "enabled"),
            balances=balances,
            _links=acc.get("_links", {}),
        )

    async def get_balances(
        self,
        access_token: str,
        account_id: str,
    ) -> list[BankBalance]:
        """Get balances for an account."""
        data = await self._api_request(
            "GET",
            f"/v1/accounts/{account_id}/balances",
            access_token=access_token,
        )

        balances = []
        for bal in data.get("balances", []):
            amount, currency = self._parse_amount(bal.get("balanceAmount", {}))
            balances.append(BankBalance(
                amount=amount,
                currency=currency,
                balance_type=bal.get("balanceType", "closingBooked"),
                reference_date=self._parse_date(bal.get("referenceDate")),
                last_committed_transaction=bal.get("lastCommittedTransaction"),
            ))

        return balances

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

        This is the core method for extracting bank statement data.
        """
        # Default to last 90 days
        if not date_from:
            date_from = date.today() - timedelta(days=90)
        if not date_to:
            date_to = date.today()

        params = {
            "dateFrom": date_from.isoformat(),
            "dateTo": date_to.isoformat(),
            "bookingStatus": booking_status,
        }

        data = await self._api_request(
            "GET",
            f"/v1/accounts/{account_id}/transactions",
            access_token=access_token,
            params=params,
        )

        transactions = []

        # Parse booked transactions
        for tx in data.get("transactions", {}).get("booked", []):
            transactions.append(self._parse_transaction(tx, status="booked"))

        # Parse pending transactions if requested
        if booking_status in ("pending", "both"):
            for tx in data.get("transactions", {}).get("pending", []):
                transactions.append(self._parse_transaction(tx, status="pending"))

        # Sort by booking date descending
        transactions.sort(key=lambda t: t.booking_date, reverse=True)

        return transactions

    def _parse_transaction(self, tx: dict, status: str = "booked") -> BankTransactionInfo:
        """Parse a single transaction from DNB API response."""
        # Amount
        amount, currency = self._parse_amount(tx.get("transactionAmount", {}))

        # Balance after transaction
        balance_after = None
        if tx.get("balanceAfterTransaction"):
            balance_after, _ = self._parse_amount(tx["balanceAfterTransaction"])

        # Counterparty accounts
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
            transaction_id=tx["transactionId"],
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
            mandate_id=tx.get("mandateId"),
            creditor_reference=tx.get("creditorReference"),  # KID
            bank_transaction_code=tx.get("bankTransactionCode"),
            proprietary_bank_code=tx.get("proprietaryBankTransactionCode"),
            card_number_masked=tx.get("cardNumber"),
            merchant_category_code=tx.get("merchantCategoryCode"),
            balance_after_transaction=balance_after,
            status=status,
            _raw=tx,
        )
