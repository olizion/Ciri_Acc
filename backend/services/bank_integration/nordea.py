"""
Nordea Bank Adapter
Direct integration with Nordea's Open Banking API.

Nordea is one of the largest Nordic banks with ~10% market share in Norway.
Developer portal: https://developer.nordeaopenbanking.com

API follows Berlin Group NextGenPSD2 standard with Nordea-specific extensions.
Swagger files: https://github.com/NordeaOB/swaggers
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


# Nordea Bank configuration
NORDEA_BANK_INFO = BankInfo(
    id="nordea",
    name="Nordea",
    bic="NDEANOKK",
    api_base_url="https://open.nordea.com/personal/v5",  # v5 is latest
    auth_url="https://authorize.nordea.com/oauth/authorize",
    token_url="https://open.nordea.com/oauth/token",
    supports_payment_initiation=True,
    supports_balance=True,
    supports_transactions=True,
    max_transaction_history_days=365,
    logo_url="/images/banks/nordea.svg",
    primary_color="#0000a0",  # Nordea Blue
    requires_qsealc=True,
    requires_qwac=False,
)

# Sandbox configuration
NORDEA_SANDBOX_INFO = BankInfo(
    id="nordea-sandbox",
    name="Nordea (Sandbox)",
    bic="NDEANOKK",
    api_base_url="https://open.sandbox.nordea.com/personal/v5",
    auth_url="https://authorize.sandbox.nordea.com/oauth/authorize",
    token_url="https://open.sandbox.nordea.com/oauth/token",
    supports_payment_initiation=True,
    supports_balance=True,
    supports_transactions=True,
    max_transaction_history_days=365,
    logo_url="/images/banks/nordea.svg",
    primary_color="#0000a0",
    requires_qsealc=False,
    requires_qwac=False,
)


class NordeaAdapter(BankAdapter):
    """
    Nordea Open Banking API adapter.

    Implements NextGenPSD2 with Nordea-specific variations.
    Uses Nordea v5 Personal API.

    API Documentation: https://developer.nordeaopenbanking.com/docs
    """

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        sandbox: bool = False,
        certificate_path: Optional[str] = None,
        key_path: Optional[str] = None,
    ):
        bank_info = NORDEA_SANDBOX_INFO if sandbox else NORDEA_BANK_INFO
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
                "X-IBM-Client-Id": self.client_id,  # Nordea uses this header
            },
        }

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
        """Make authenticated request to Nordea API."""
        headers = kwargs.pop("headers", {})

        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"

        # Nordea specific headers
        headers["X-IBM-Client-Id"] = self.client_id
        headers["X-Request-ID"] = str(datetime.utcnow().timestamp()).replace(".", "")
        headers["X-Response-Scenarios"] = "NOResponse"  # Norway responses

        async with self._get_client() as client:
            url = f"{self.bank_info.api_base_url}{path}"
            response = await client.request(method, url, headers=headers, **kwargs)

            if response.status_code >= 400:
                error_data = response.json() if response.content else {}
                # Nordea uses group_header for errors
                error_msg = (
                    error_data.get("group_header", {}).get("message_identification") or
                    error_data.get("error_description") or
                    response.text
                )
                raise BankError(
                    message=error_msg,
                    bank_id=self.bank_id,
                    status_code=response.status_code,
                    error_code=str(error_data.get("group_header", {}).get("http_code")),
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
        Get Nordea authorization URL.

        Nordea uses OAuth 2.0 with PKCE for personal banking.
        """
        # Nordea scope format
        scope_map = {
            "accounts": "ACCOUNTS_BASIC,ACCOUNTS_BALANCES,ACCOUNTS_DETAILS,ACCOUNTS_TRANSACTIONS",
            "payments": "PAYMENTS_MULTIPLE",
        }
        nordea_scope = scope_map.get(scope, "ACCOUNTS_BASIC,ACCOUNTS_TRANSACTIONS")

        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "scope": nordea_scope,
            "state": state,
            "country": "NO",  # Norway
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
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-IBM-Client-Id": self.client_id,
                    "X-IBM-Client-Secret": self.client_secret,
                },
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
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-IBM-Client-Id": self.client_id,
                    "X-IBM-Client-Secret": self.client_secret,
                },
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
        """Get list of user's Nordea accounts."""
        data = await self._api_request(
            "GET",
            "/accounts",
            access_token=access_token,
        )

        accounts = []
        response_data = data.get("response", data)

        for acc in response_data.get("accounts", []):
            # Nordea includes balances in account response
            balances = []
            if acc.get("booked_balance"):
                balances.append(BankBalance(
                    amount=Decimal(str(acc["booked_balance"])),
                    currency=acc.get("currency", "NOK"),
                    balance_type="closingBooked",
                ))
            if acc.get("available_balance"):
                balances.append(BankBalance(
                    amount=Decimal(str(acc["available_balance"])),
                    currency=acc.get("currency", "NOK"),
                    balance_type="interimAvailable",
                ))

            accounts.append(BankAccountInfo(
                resource_id=acc["_id"],
                iban=acc.get("iban"),
                bban=acc.get("account_number"),  # Nordea uses account_number
                name=acc.get("account_name"),
                display_name=acc.get("nick_name"),
                product=acc.get("product"),
                owner_name=acc.get("owner_name"),
                currency=acc.get("currency", "NOK"),
                cash_account_type=acc.get("account_type", "CACC"),
                status="enabled" if acc.get("status") == "OPEN" else "blocked",
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
            f"/accounts/{account_id}",
            access_token=access_token,
        )

        acc = data.get("response", data)

        balances = []
        if acc.get("booked_balance"):
            balances.append(BankBalance(
                amount=Decimal(str(acc["booked_balance"])),
                currency=acc.get("currency", "NOK"),
                balance_type="closingBooked",
            ))
        if acc.get("available_balance"):
            balances.append(BankBalance(
                amount=Decimal(str(acc["available_balance"])),
                currency=acc.get("currency", "NOK"),
                balance_type="interimAvailable",
            ))

        return BankAccountInfo(
            resource_id=acc["_id"],
            iban=acc.get("iban"),
            bban=acc.get("account_number"),
            name=acc.get("account_name"),
            display_name=acc.get("nick_name"),
            product=acc.get("product"),
            owner_name=acc.get("owner_name"),
            currency=acc.get("currency", "NOK"),
            cash_account_type=acc.get("account_type", "CACC"),
            status="enabled" if acc.get("status") == "OPEN" else "blocked",
            balances=balances,
            _links=acc.get("_links", {}),
        )

    async def get_balances(
        self,
        access_token: str,
        account_id: str,
    ) -> list[BankBalance]:
        """Get balances for an account."""
        # Nordea includes balances in account details
        account = await self.get_account(access_token, account_id)
        return account.balances

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

        Nordea v5 API uses pagination with continuation_key.
        """
        if not date_from:
            date_from = date.today() - timedelta(days=90)
        if not date_to:
            date_to = date.today()

        params = {
            "fromDate": date_from.isoformat(),
            "toDate": date_to.isoformat(),
        }

        all_transactions = []
        continuation_key = None

        while True:
            if continuation_key:
                params["continuationKey"] = continuation_key

            data = await self._api_request(
                "GET",
                f"/accounts/{account_id}/transactions",
                access_token=access_token,
                params=params,
            )

            response_data = data.get("response", data)

            # Parse transactions
            for tx in response_data.get("transactions", []):
                all_transactions.append(self._parse_transaction(tx))

            # Check for more pages
            continuation_key = response_data.get("continuation_key")
            if not continuation_key:
                break

        # Filter by booking status if needed
        if booking_status == "booked":
            all_transactions = [t for t in all_transactions if t.status == "booked"]
        elif booking_status == "pending":
            all_transactions = [t for t in all_transactions if t.status == "pending"]

        # Sort by booking date descending
        all_transactions.sort(key=lambda t: t.booking_date, reverse=True)

        return all_transactions

    def _parse_transaction(self, tx: dict) -> BankTransactionInfo:
        """Parse a single transaction from Nordea API response."""
        # Amount (Nordea uses signed amount directly)
        amount = Decimal(str(tx.get("amount", 0)))
        currency = tx.get("currency", "NOK")

        # Dates
        booking_date = self._parse_date(tx.get("booking_date"))
        value_date = self._parse_date(tx.get("value_date"))

        # Determine status
        status = "booked" if tx.get("status") == "SETTLED" else "pending"

        return BankTransactionInfo(
            transaction_id=tx.get("transaction_id", tx.get("_id", "")),
            amount=amount,
            currency=currency,
            booking_date=booking_date or date.today(),
            value_date=value_date,
            remittance_information=tx.get("narrative", "") or tx.get("message", ""),
            additional_information=tx.get("type_description"),
            creditor_name=tx.get("counterparty_name") if amount < 0 else None,
            creditor_account_iban=tx.get("counterparty_account") if amount < 0 else None,
            debtor_name=tx.get("counterparty_name") if amount >= 0 else None,
            debtor_account_iban=tx.get("counterparty_account") if amount >= 0 else None,
            end_to_end_id=tx.get("reference"),
            creditor_reference=tx.get("reference"),  # May contain KID
            bank_transaction_code=tx.get("transaction_type"),
            card_number_masked=tx.get("card_number"),
            merchant_category_code=tx.get("card_transaction_type"),
            status=status,
            _raw=tx,
        )
