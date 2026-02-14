"""
SpareBank 1 Adapter
Direct integration with SpareBank 1's Open API.

SpareBank 1 is a network of regional savings banks representing
~15% combined market share in Norway.

Main API: https://api.sparebank1.no
Developer info: https://www.sparebank1.no/nb/bank/bedrift/open-api.html
GitHub tutorial: https://github.com/SpareBank1/sb1-open-api-tutorial

The SpareBank 1 alliance includes:
- SpareBank 1 SR-Bank (Sør-Norge)
- SpareBank 1 SMN (Midt-Norge)
- SpareBank 1 Østlandet
- SpareBank 1 Nord-Norge
- And many regional banks

All use the same API platform with individual OAuth flows.
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


# SpareBank 1 regional bank configurations
# Each regional bank has its own OAuth endpoints but shares the same API

SPAREBANK1_BANKS = {
    "sparebank1-sr": BankInfo(
        id="sparebank1-sr",
        name="SpareBank 1 SR-Bank",
        bic="SHEDNO22",
        api_base_url="https://api.sparebank1.no",
        auth_url="https://api.sparebank1.no/oauth/authorize",
        token_url="https://api.sparebank1.no/oauth/token",
        max_transaction_history_days=365,
        logo_url="/images/banks/sparebank1.svg",
        primary_color="#002776",  # SpareBank 1 Blue
    ),
    "sparebank1-smn": BankInfo(
        id="sparebank1-smn",
        name="SpareBank 1 SMN",
        bic="SMNONO22",
        api_base_url="https://api.sparebank1.no",
        auth_url="https://api.sparebank1.no/oauth/authorize",
        token_url="https://api.sparebank1.no/oauth/token",
        max_transaction_history_days=365,
        logo_url="/images/banks/sparebank1.svg",
        primary_color="#002776",
    ),
    "sparebank1-ostlandet": BankInfo(
        id="sparebank1-ostlandet",
        name="SpareBank 1 Østlandet",
        bic="SBSNO22",
        api_base_url="https://api.sparebank1.no",
        auth_url="https://api.sparebank1.no/oauth/authorize",
        token_url="https://api.sparebank1.no/oauth/token",
        max_transaction_history_days=365,
        logo_url="/images/banks/sparebank1.svg",
        primary_color="#002776",
    ),
    "sparebank1-nord-norge": BankInfo(
        id="sparebank1-nord-norge",
        name="SpareBank 1 Nord-Norge",
        bic="SNNONO22",
        api_base_url="https://api.sparebank1.no",
        auth_url="https://api.sparebank1.no/oauth/authorize",
        token_url="https://api.sparebank1.no/oauth/token",
        max_transaction_history_days=365,
        logo_url="/images/banks/sparebank1.svg",
        primary_color="#002776",
    ),
    # Generic SpareBank 1 entry for the alliance
    "sparebank1": BankInfo(
        id="sparebank1",
        name="SpareBank 1",
        bic="SHEDNO22",
        api_base_url="https://api.sparebank1.no",
        auth_url="https://api.sparebank1.no/oauth/authorize",
        token_url="https://api.sparebank1.no/oauth/token",
        max_transaction_history_days=365,
        logo_url="/images/banks/sparebank1.svg",
        primary_color="#002776",
    ),
}


class SpareBank1Adapter(BankAdapter):
    """
    SpareBank 1 Open API adapter.

    SpareBank 1 has a unique API that differs slightly from
    Berlin Group standard. They use OAuth 2.0 with BankID
    for user authentication.

    Token validity:
    - Access token: 10 minutes (can be reused)
    - Refresh token: 30 days

    API Documentation: https://github.com/SpareBank1/sb1-open-api-tutorial
    """

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        bank_id: str = "sparebank1",  # Which regional bank
        sandbox: bool = False,
    ):
        if bank_id not in SPAREBANK1_BANKS:
            raise ValueError(f"Unknown SpareBank 1 bank: {bank_id}")

        bank_info = SPAREBANK1_BANKS[bank_id]
        super().__init__(bank_info, client_id, client_secret)

        self.sandbox = sandbox
        self.regional_bank_id = bank_id

    def _get_client(self) -> httpx.AsyncClient:
        """Get HTTP client."""
        return httpx.AsyncClient(
            timeout=30.0,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )

    async def _api_request(
        self,
        method: str,
        path: str,
        access_token: Optional[str] = None,
        psu_ip: str = "127.0.0.1",
        **kwargs,
    ) -> dict:
        """Make authenticated request to SpareBank 1 API."""
        headers = kwargs.pop("headers", {})

        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"

        # SpareBank 1 specific headers
        headers["X-Request-ID"] = str(datetime.utcnow().timestamp()).replace(".", "")

        async with self._get_client() as client:
            url = f"{self.bank_info.api_base_url}{path}"
            response = await client.request(method, url, headers=headers, **kwargs)

            if response.status_code >= 400:
                error_data = response.json() if response.content else {}
                raise BankError(
                    message=error_data.get("error_description", response.text),
                    bank_id=self.bank_id,
                    status_code=response.status_code,
                    error_code=error_data.get("error"),
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
        Get SpareBank 1 authorization URL.

        User will be redirected to authenticate with BankID
        and grant access to their accounts.

        The authorization flow is:
        1. Redirect user to auth URL
        2. User logs in with BankID
        3. User grants consent
        4. Redirect back with authorization code
        5. Exchange code for tokens
        """
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": redirect_uri,
            "state": state,
            "finInst": self._get_fin_inst_code(),  # Financial institution code
        }

        return f"{self.bank_info.auth_url}?{urlencode(params)}"

    def _get_fin_inst_code(self) -> str:
        """Get the financial institution code for the regional bank."""
        # Each SpareBank 1 bank has a unique code
        fin_inst_map = {
            "sparebank1-sr": "fid-sr-bank",
            "sparebank1-smn": "fid-smn",
            "sparebank1-ostlandet": "fid-ostlandet",
            "sparebank1-nord-norge": "fid-nord-norge",
            "sparebank1": "fid-sparebank1",
        }
        return fin_inst_map.get(self.regional_bank_id, "fid-sparebank1")

    async def exchange_code(
        self,
        code: str,
        redirect_uri: str,
    ) -> AuthorizationResult:
        """
        Exchange authorization code for access token.

        Note: Authorization codes expire within a couple minutes
        and can only be used once.
        """
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

            # SpareBank 1 tokens:
            # - access_token: valid for 10 minutes
            # - refresh_token: valid for 30 days
            return AuthorizationResult(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token"),
                token_type=data.get("token_type", "Bearer"),
                expires_in=data.get("expires_in", 600),  # 10 minutes
                scope=data.get("scope"),
                consent_expires_at=datetime.utcnow() + timedelta(days=30),
            )

    async def refresh_token(self, refresh_token: str) -> AuthorizationResult:
        """
        Refresh an expiring access token.

        Refresh tokens are valid for 30 days.
        """
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
                expires_in=data.get("expires_in", 600),
            )

    # =========================================================================
    # Account Information Services (AIS)
    # =========================================================================

    async def get_accounts(
        self,
        access_token: str,
    ) -> list[BankAccountInfo]:
        """
        Get list of user's SpareBank 1 accounts.

        SpareBank 1 returns accounts in their own format.
        """
        data = await self._api_request(
            "GET",
            "/open/personal/banking/accounts",
            access_token=access_token,
        )

        accounts = []

        for acc in data.get("accounts", data if isinstance(data, list) else []):
            # Parse balance
            balances = []
            if acc.get("balance") is not None:
                balances.append(BankBalance(
                    amount=Decimal(str(acc["balance"])),
                    currency=acc.get("currency", "NOK"),
                    balance_type="closingBooked",
                ))
            if acc.get("availableBalance") is not None:
                balances.append(BankBalance(
                    amount=Decimal(str(acc["availableBalance"])),
                    currency=acc.get("currency", "NOK"),
                    balance_type="interimAvailable",
                ))

            # SpareBank 1 account number format
            account_number = acc.get("accountNumber", acc.get("bban", ""))

            accounts.append(BankAccountInfo(
                resource_id=acc.get("accountId", acc.get("id", account_number)),
                iban=acc.get("iban"),
                bban=account_number,
                name=acc.get("name", acc.get("accountName")),
                display_name=acc.get("displayName", acc.get("alias")),
                product=acc.get("accountType", acc.get("productName")),
                owner_name=acc.get("ownerName"),
                currency=acc.get("currency", "NOK"),
                cash_account_type=self._map_account_type(acc.get("accountType")),
                status="enabled",
                balances=balances,
            ))

        return accounts

    def _map_account_type(self, sb1_type: Optional[str]) -> str:
        """Map SpareBank 1 account types to standard codes."""
        if not sb1_type:
            return "CACC"

        type_map = {
            "BRUKSKONTO": "CACC",  # Current account
            "SPAREKONTO": "SVGS",  # Savings
            "BEDRIFTSKONTO": "CACC",  # Business current
            "BSU": "SVGS",  # Youth savings
            "AKSJESPAREKONTO": "TRAS",  # Investment
        }
        return type_map.get(sb1_type.upper(), "CACC")

    async def get_account(
        self,
        access_token: str,
        account_id: str,
    ) -> BankAccountInfo:
        """Get details for a specific account."""
        data = await self._api_request(
            "GET",
            f"/open/personal/banking/accounts/{account_id}",
            access_token=access_token,
        )

        acc = data.get("account", data)

        balances = []
        if acc.get("balance") is not None:
            balances.append(BankBalance(
                amount=Decimal(str(acc["balance"])),
                currency=acc.get("currency", "NOK"),
                balance_type="closingBooked",
            ))
        if acc.get("availableBalance") is not None:
            balances.append(BankBalance(
                amount=Decimal(str(acc["availableBalance"])),
                currency=acc.get("currency", "NOK"),
                balance_type="interimAvailable",
            ))

        account_number = acc.get("accountNumber", acc.get("bban", ""))

        return BankAccountInfo(
            resource_id=acc.get("accountId", acc.get("id", account_id)),
            iban=acc.get("iban"),
            bban=account_number,
            name=acc.get("name", acc.get("accountName")),
            display_name=acc.get("displayName", acc.get("alias")),
            product=acc.get("accountType", acc.get("productName")),
            owner_name=acc.get("ownerName"),
            currency=acc.get("currency", "NOK"),
            cash_account_type=self._map_account_type(acc.get("accountType")),
            status="enabled",
            balances=balances,
        )

    async def get_balances(
        self,
        access_token: str,
        account_id: str,
    ) -> list[BankBalance]:
        """Get balances for an account."""
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

        SpareBank 1 returns transactions in their own format.
        """
        if not date_from:
            date_from = date.today() - timedelta(days=90)
        if not date_to:
            date_to = date.today()

        params = {
            "fromDate": date_from.isoformat(),
            "toDate": date_to.isoformat(),
        }

        data = await self._api_request(
            "GET",
            f"/open/personal/banking/accounts/{account_id}/transactions",
            access_token=access_token,
            params=params,
        )

        transactions = []

        for tx in data.get("transactions", data if isinstance(data, list) else []):
            transactions.append(self._parse_transaction(tx))

        # Sort by booking date descending
        transactions.sort(key=lambda t: t.booking_date, reverse=True)

        return transactions

    def _parse_transaction(self, tx: dict) -> BankTransactionInfo:
        """Parse a single transaction from SpareBank 1 API response."""
        # Amount (can be positive or negative)
        amount = Decimal(str(tx.get("amount", 0)))
        currency = tx.get("currency", "NOK")

        # Dates
        booking_date = self._parse_date(tx.get("bookingDate", tx.get("transactionDate")))
        value_date = self._parse_date(tx.get("valueDate"))

        # Description - SpareBank 1 may have different field names
        description = (
            tx.get("description") or
            tx.get("text") or
            tx.get("message") or
            tx.get("remittanceInformation") or
            ""
        )

        # Counterparty
        counterparty_name = tx.get("counterpartyName", tx.get("toFromName"))
        counterparty_account = tx.get("counterpartyAccount", tx.get("toFromAccount"))

        # Reference (KID)
        reference = tx.get("reference", tx.get("kid", tx.get("creditorReference")))

        return BankTransactionInfo(
            transaction_id=tx.get("transactionId", tx.get("id", str(hash(str(tx))))),
            amount=amount,
            currency=currency,
            booking_date=booking_date or date.today(),
            value_date=value_date,
            remittance_information=description,
            additional_information=tx.get("additionalInfo"),
            creditor_name=counterparty_name if amount < 0 else None,
            creditor_account_bban=counterparty_account if amount < 0 else None,
            debtor_name=counterparty_name if amount >= 0 else None,
            debtor_account_bban=counterparty_account if amount >= 0 else None,
            creditor_reference=reference,
            bank_transaction_code=tx.get("transactionType", tx.get("type")),
            card_number_masked=tx.get("cardNumber"),
            balance_after_transaction=Decimal(str(tx["balanceAfter"])) if tx.get("balanceAfter") else None,
            status="booked",
            _raw=tx,
        )


def get_sparebank1_regional_banks() -> list[BankInfo]:
    """Get list of all SpareBank 1 regional banks."""
    return list(SPAREBANK1_BANKS.values())
