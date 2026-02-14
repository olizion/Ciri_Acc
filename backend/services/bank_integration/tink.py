"""
Tink Open Banking Integration

Tink (by Visa) is a European open banking platform with 6000+ bank connections.
Supports Norwegian banks including SpareBank 1 SR-Bank.

Features:
- Account data (AIS)
- Transaction history
- Business accounts (Enterprise)
- Enriched transaction categories

Get credentials: https://console.tink.com/
Documentation: https://docs.tink.com/
"""

import httpx
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from typing import Optional, Any
from dataclasses import dataclass
from urllib.parse import urlencode

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


# Tink API endpoints
TINK_API_URL = "https://api.tink.com"
TINK_LINK_URL = "https://link.tink.com"


@dataclass
class TinkProvider:
    """Bank/Provider from Tink."""
    id: str
    name: str
    country: str
    type: str  # "bank", "broker", etc.
    status: str  # "enabled", "disabled"
    capabilities: list[str]  # ["CHECKING_ACCOUNTS", "SAVINGS_ACCOUNTS", "TRANSACTIONS"]
    logo_url: Optional[str] = None


class TinkClient:
    """
    Tink Open Banking API client.

    Tink uses OAuth 2.0 with two types of tokens:
    1. Client Access Token - for app-level operations (creating users, etc.)
    2. User Access Token - for accessing user's bank data

    Flow for permanent users:
    1. Get client access token
    2. Create a permanent user
    3. Generate authorization grant for user
    4. Redirect user to Tink Link for bank connection
    5. Exchange authorization code for user access token
    6. Fetch accounts and transactions
    """

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        base_url: str = TINK_API_URL,
        sandbox: bool = True,
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = base_url
        self.sandbox = sandbox

        # Token cache
        self._client_access_token: Optional[str] = None
        self._client_token_expires_at: Optional[datetime] = None

    # =========================================================================
    # Authentication
    # =========================================================================

    async def get_client_access_token(
        self,
        scope: str = "authorization:grant,user:create,user:read",
    ) -> str:
        """
        Get client access token using client credentials grant.

        This token is used for app-level operations like creating users.
        """
        # Return cached token if still valid
        if (
            self._client_access_token and
            self._client_token_expires_at and
            datetime.now(timezone.utc) < self._client_token_expires_at
        ):
            return self._client_access_token

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/v1/oauth/token",
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "client_credentials",
                    "scope": scope,
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )

            if response.status_code != 200:
                raise BankError(
                    message=f"Tink client authentication failed: {response.text}",
                    bank_id="tink",
                    status_code=response.status_code,
                )

            data = response.json()
            access_token: str = data["access_token"]
            self._client_access_token = access_token
            # Tink client tokens expire in 30 minutes
            expires_in = data.get("expires_in", 1800)
            self._client_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in - 60)

            return access_token

    async def create_user(self, external_user_id: str, market: str = "NO", locale: str = "en_US") -> dict:
        """
        Create a permanent Tink user.

        Args:
            external_user_id: Your internal user ID
            market: Market code (NO for Norway)
            locale: Locale for Tink Link UI

        Returns:
            Dict with user_id and external_user_id
        """
        token = await self.get_client_access_token()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/v1/user/create",
                json={
                    "external_user_id": external_user_id,
                    "market": market,
                    "locale": locale,
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

            if response.status_code not in (200, 201):
                raise BankError(
                    message=f"Failed to create Tink user: {response.text}",
                    bank_id="tink",
                    status_code=response.status_code,
                )

            return response.json()

    async def get_user(self, external_user_id: str) -> dict:
        """
        Get an existing Tink user by external_user_id.

        Returns:
            Dict with user_id and external_user_id
        """
        token = await self.get_client_access_token("user:read")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/api/v1/user/external/{external_user_id}",
                headers={
                    "Authorization": f"Bearer {token}",
                },
            )

            if response.status_code != 200:
                raise BankError(
                    message=f"Failed to get Tink user: {response.text}",
                    bank_id="tink",
                    status_code=response.status_code,
                )

            return response.json()

    async def get_authorization_grant(
        self,
        user_id: str,
        scope: str = "accounts:read,transactions:read,credentials:read",
    ) -> str:
        """
        Generate an authorization grant code for a user.

        This code is used to create a Tink Link URL.
        """
        token = await self.get_client_access_token("authorization:grant")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/v1/oauth/authorization-grant",
                data={
                    "user_id": user_id,
                    "scope": scope,
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )

            if response.status_code != 200:
                raise BankError(
                    message=f"Failed to get authorization grant: {response.text}",
                    bank_id="tink",
                    status_code=response.status_code,
                )

            return response.json().get("code")

    async def delegate_authorization_grant(
        self,
        user_id: Optional[str] = None,
        external_user_id: Optional[str] = None,
        actor_client_id: str = "df05e4b379934cd09963197cc855bfe9",  # Tink Link client ID
        scope: str = "accounts:read,transactions:read,credentials:read,user:read",
    ) -> str:
        """
        Create a delegated authorization grant for Tink Link.

        This is used when redirecting to Tink Link for bank connection.
        Accepts either user_id (Tink internal) or external_user_id.
        """
        token = await self.get_client_access_token("authorization:grant")

        data: dict[str, str] = {
            "actor_client_id": actor_client_id,
            "scope": scope,
        }

        if external_user_id:
            data["external_user_id"] = external_user_id
            data["id_hint"] = external_user_id
        elif user_id:
            data["user_id"] = user_id
            data["id_hint"] = user_id

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/v1/oauth/authorization-grant/delegate",
                data=data,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )

            if response.status_code != 200:
                # If external_user_id failed, try with user_id fallback
                if external_user_id and user_id and user_id != external_user_id:
                    data_fallback = {
                        "user_id": user_id,
                        "id_hint": user_id,
                        "actor_client_id": actor_client_id,
                        "scope": scope,
                    }
                    response = await client.post(
                        f"{self.base_url}/api/v1/oauth/authorization-grant/delegate",
                        data=data_fallback,
                        headers={
                            "Authorization": f"Bearer {token}",
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                    )

                if response.status_code != 200:
                    raise BankError(
                        message=f"Failed to delegate authorization grant: {response.text}",
                        bank_id="tink",
                        status_code=response.status_code,
                    )

            return response.json().get("code")

    def get_tink_link_url(
        self,
        authorization_code: str,
        redirect_uri: str,
        market: str = "NO",
        locale: str = "en_US",  # Tink doesn't support nb_NO
        test: Optional[bool] = None,
    ) -> str:
        """
        Generate Tink Link URL for user to connect their bank.

        Args:
            authorization_code: From delegate_authorization_grant()
            redirect_uri: Where to redirect after bank connection
            market: Market code
            locale: UI locale
            test: Use test/demo bank (defaults to sandbox setting)

        Returns:
            URL to redirect user to
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "market": market,
            "locale": locale,
        }

        return f"{TINK_LINK_URL}/1.0/business-transactions/connect-accounts/?{urlencode(params)}"

    async def get_connect_link(
        self,
        external_user_id: str,
        redirect_uri: str,
        market: str = "NO",
        locale: str = "en_US",  # Tink uses standard locales, nb_NO not supported
        scope: str = "accounts:read,transactions:read,credentials:read,user:read",
    ) -> str:
        """
        Convenience method to get a Tink Link URL for connecting a bank.

        This handles the full flow:
        1. Create or get existing Tink user
        2. Delegate authorization grant
        3. Generate Tink Link URL

        Args:
            external_user_id: Your internal user/company ID
            redirect_uri: Where to redirect after bank connection
            market: Market code (NO for Norway)
            locale: UI locale (nb_NO for Norwegian)
            scope: OAuth scopes for the connection

        Returns:
            URL to redirect user to for bank connection
        """
        # Step 1: Create user (or get existing)
        tink_user_id: Optional[str] = None
        try:
            user_data = await self.create_user(external_user_id, market, locale)
            tink_user_id = user_data.get("user_id")
        except BankError as e:
            if "already exists" in str(e.message).lower():
                pass  # User already exists, external_user_id will work for delegation
            else:
                raise

        # Step 2: Delegate authorization grant
        # Prefer external_user_id (works whether user was just created or already exists)
        authorization_code = await self.delegate_authorization_grant(
            user_id=tink_user_id,
            external_user_id=external_user_id,
            scope=scope,
        )

        # Step 3: Generate Tink Link URL
        return self.get_tink_link_url(
            authorization_code=authorization_code,
            redirect_uri=redirect_uri,
            market=market,
            locale=locale,
        )

    async def exchange_code(
        self,
        code: str,
    ) -> dict:
        """
        Exchange authorization code for user access token.

        Args:
            code: Authorization code from Tink Link callback

        Returns:
            Dict with access_token, refresh_token, expires_in, scope
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/v1/oauth/token",
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "authorization_code",
                    "code": code,
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )

            if response.status_code != 200:
                raise BankError(
                    message=f"Failed to exchange code: {response.text}",
                    bank_id="tink",
                    status_code=response.status_code,
                )

            return response.json()

    async def refresh_access_token(self, refresh_token: str) -> dict:
        """Refresh user access token."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/v1/oauth/token",
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )

            if response.status_code != 200:
                raise BankError(
                    message=f"Failed to refresh token: {response.text}",
                    bank_id="tink",
                    status_code=response.status_code,
                )

            return response.json()

    # =========================================================================
    # Providers (Banks)
    # =========================================================================

    async def get_providers(
        self,
        market: str = "NO",
        capability: Optional[str] = None,
    ) -> list[TinkProvider]:
        """
        Get available providers (banks) for a market.

        Args:
            market: Market code (NO for Norway)
            capability: Filter by capability (e.g., "CHECKING_ACCOUNTS")
        """
        token = await self.get_client_access_token()

        params = {"includeTestProviders": str(self.sandbox).lower()}
        if capability:
            params["capability"] = capability

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/api/v1/providers/{market}",
                params=params,
                headers={
                    "Authorization": f"Bearer {token}",
                },
            )

            if response.status_code != 200:
                raise BankError(
                    message=f"Failed to get providers: {response.text}",
                    bank_id="tink",
                    status_code=response.status_code,
                )

            data = response.json()
            return [
                TinkProvider(
                    id=p["name"],  # Tink uses "name" as the ID
                    name=p.get("displayName", p["name"]),
                    country=p.get("market", market),
                    type=p.get("type", "unknown"),
                    status=p.get("status", "unknown"),
                    capabilities=p.get("capabilities", []),
                    logo_url=p.get("images", {}).get("icon"),
                )
                for p in data.get("providers", [])
            ]

    # =========================================================================
    # Account Information
    # =========================================================================

    async def get_accounts(self, access_token: str) -> list[dict]:
        """
        Get user's connected accounts.

        Args:
            access_token: User access token
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/api/v1/accounts/list",
                headers={
                    "Authorization": f"Bearer {access_token}",
                },
            )

            if response.status_code != 200:
                raise BankError(
                    message=f"Failed to get accounts: {response.text}",
                    bank_id="tink",
                    status_code=response.status_code,
                )

            return response.json().get("accounts", [])

    async def get_account(self, access_token: str, account_id: str) -> dict:
        """Get a specific account by ID."""
        accounts = await self.get_accounts(access_token)
        for acc in accounts:
            if acc.get("id") == account_id:
                return acc
        raise BankError(
            message=f"Account {account_id} not found",
            bank_id="tink",
        )

    # =========================================================================
    # Transactions
    # =========================================================================

    async def get_transactions(
        self,
        access_token: str,
        account_id: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        """
        Get user's transactions.

        Args:
            access_token: User access token
            account_id: Filter by account (optional)
            date_from: Start date
            date_to: End date
            limit: Max transactions per request (max 100)
            offset: Pagination offset
        """
        # Build query params
        params: dict[str, Any] = {
            "limit": min(limit, 100),
            "offset": offset,
        }

        if account_id:
            params["accountIdIn"] = account_id
        if date_from:
            params["bookedDateGte"] = date_from.isoformat()
        if date_to:
            params["bookedDateLte"] = date_to.isoformat()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/data/v2/transactions",
                params=params,
                headers={
                    "Authorization": f"Bearer {access_token}",
                },
            )

            if response.status_code != 200:
                # Try v1 API as fallback
                response = await client.get(
                    f"{self.base_url}/api/v1/search",
                    params={
                        "limit": params["limit"],
                        "offset": params["offset"],
                    },
                    headers={
                        "Authorization": f"Bearer {access_token}",
                    },
                )

                if response.status_code != 200:
                    raise BankError(
                        message=f"Failed to get transactions: {response.text}",
                        bank_id="tink",
                        status_code=response.status_code,
                    )

            data = response.json()
            return data.get("transactions", [])

    async def get_all_transactions(
        self,
        access_token: str,
        account_id: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[dict]:
        """
        Get all transactions with pagination.

        Handles pagination automatically to fetch all results.
        """
        all_transactions = []
        offset = 0
        limit = 100

        while True:
            transactions = await self.get_transactions(
                access_token,
                account_id,
                date_from,
                date_to,
                limit,
                offset,
            )

            if not transactions:
                break

            all_transactions.extend(transactions)

            if len(transactions) < limit:
                break

            offset += limit

            # Safety limit
            if offset > 10000:
                break

        return all_transactions


class TinkAdapter(BankAdapter):
    """
    Bank adapter using Tink for all bank connections.

    Integrates with our unified bank interface.
    """

    def __init__(
        self,
        client: TinkClient,
        user_id: Optional[str] = None,
    ):
        # Create generic BankInfo for Tink
        bank_info = BankInfo(
            id="tink",
            name="Tink",
            bic="",
            api_base_url=TINK_API_URL,
            auth_url=TINK_LINK_URL,
            token_url=f"{TINK_API_URL}/api/v1/oauth/token",
            requires_qsealc=False,  # Tink handles PSD2 compliance
            requires_qwac=False,
        )
        super().__init__(bank_info, client.client_id, client.client_secret)

        self.client = client
        self.user_id = user_id

    async def get_authorization_url(
        self,
        redirect_uri: str,
        state: str,
        scope: str = "accounts:read,transactions:read",
        psu_ip_address: str = "127.0.0.1",  # noqa: ARG002 - required by base class
    ) -> str:
        """
        Get Tink Link URL for bank connection.

        Flow:
        1. Create user (if not exists)
        2. Get delegated authorization grant
        3. Generate Tink Link URL
        """
        # Create or get user
        external_user_id = state
        if not self.user_id:
            try:
                user_result = await self.client.create_user(
                    external_user_id=external_user_id,
                    market="NO",
                )
                self.user_id = user_result.get("user_id")
            except BankError as e:
                if "already exists" not in str(e.message).lower():
                    raise

        # Get delegated authorization grant (use external_user_id as fallback)
        auth_code = await self.client.delegate_authorization_grant(
            user_id=self.user_id,
            external_user_id=external_user_id,
            scope=scope,
        )

        # Generate Tink Link URL
        return self.client.get_tink_link_url(
            authorization_code=auth_code,
            redirect_uri=redirect_uri,
            market="NO",
        )

    async def exchange_code(
        self,
        code: str,
        redirect_uri: str,
    ) -> AuthorizationResult:
        """Exchange authorization code for tokens."""
        token_data = await self.client.exchange_code(code)

        expires_in = token_data.get("expires_in", 3600)

        return AuthorizationResult(
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            token_type=token_data.get("token_type", "Bearer"),
            expires_in=expires_in,
            scope=token_data.get("scope"),
            consent_status=ConsentStatus.VALID,
            consent_expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            extra={
                "user_id": self.user_id,
            },
        )

    async def refresh_token(self, refresh_token: str) -> AuthorizationResult:
        """Refresh access token."""
        token_data = await self.client.refresh_access_token(refresh_token)

        expires_in = token_data.get("expires_in", 3600)

        return AuthorizationResult(
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            token_type=token_data.get("token_type", "Bearer"),
            expires_in=expires_in,
            scope=token_data.get("scope"),
            consent_status=ConsentStatus.VALID,
            consent_expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
        )

    async def get_accounts(
        self,
        access_token: str,
    ) -> list[BankAccountInfo]:
        """Get connected accounts."""
        accounts_data = await self.client.get_accounts(access_token)

        accounts = []
        for acc in accounts_data:
            # Parse balances
            balances = []
            if acc.get("balance"):
                balances.append(BankBalance(
                    amount=Decimal(str(acc["balance"])),
                    currency=acc.get("currencyCode", "NOK"),
                    balance_type="closingBooked",
                ))

            # Determine account type
            acc_type = acc.get("type", "CHECKING")
            cash_account_type = "CACC"  # Current account
            if acc_type == "SAVINGS":
                cash_account_type = "SVGS"
            elif acc_type == "CREDIT_CARD":
                cash_account_type = "CARD"

            # Extract IBAN/BBAN
            identifiers = acc.get("identifiers", {})
            iban = None
            bban = None

            # Tink may return identifiers in different formats
            if isinstance(identifiers, dict):
                iban = identifiers.get("iban", {}).get("iban")
                bban = identifiers.get("se", {}).get("clearingNumber")
            elif isinstance(identifiers, list):
                for ident in identifiers:
                    if ident.get("type") == "iban":
                        iban = ident.get("iban")
                    elif ident.get("type") in ("bban", "se"):
                        bban = ident.get("number")

            # Also check financialInstitutionId
            if not iban and acc.get("accountNumber"):
                # Norwegian account number
                bban = acc.get("accountNumber")

            accounts.append(BankAccountInfo(
                resource_id=acc.get("id", ""),
                iban=iban,
                bban=bban,
                name=acc.get("name"),
                display_name=acc.get("name") or acc.get("holderName"),
                product=acc.get("type"),
                owner_name=acc.get("holderName"),
                currency=acc.get("currencyCode", "NOK"),
                cash_account_type=cash_account_type,
                status="enabled",
                balances=balances,
            ))

        return accounts

    async def get_account(
        self,
        access_token: str,
        account_id: str,
    ) -> BankAccountInfo:
        """Get specific account."""
        accounts = await self.get_accounts(access_token)
        for acc in accounts:
            if acc.resource_id == account_id:
                return acc
        raise BankError(
            message=f"Account {account_id} not found",
            bank_id="tink",
        )

    async def get_balances(
        self,
        access_token: str,
        account_id: str,
    ) -> list[BankBalance]:
        """Get account balances."""
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
        """Get account transactions."""
        # Default date range
        if not date_to:
            date_to = date.today()
        if not date_from:
            date_from = date_to - timedelta(days=90)

        transactions_data = await self.client.get_all_transactions(
            access_token,
            account_id,
            date_from,
            date_to,
        )

        transactions = []
        for tx in transactions_data:
            transactions.append(self._parse_transaction(tx))

        # Sort by date descending
        transactions.sort(key=lambda t: t.booking_date, reverse=True)

        return transactions

    def _parse_transaction(self, tx: dict) -> BankTransactionInfo:
        """Parse Tink transaction to our format."""
        # Amount - Tink uses original amount or amount object
        amount_data = tx.get("amount", {})
        if isinstance(amount_data, dict):
            amount = Decimal(str(amount_data.get("value", {}).get("unscaledValue", 0)))
            scale = amount_data.get("value", {}).get("scale", 0)
            if scale:
                amount = amount / (10 ** scale)
            currency = amount_data.get("currencyCode", "NOK")
        else:
            # Legacy format
            amount = Decimal(str(tx.get("originalAmount", tx.get("amount", 0))))
            currency = tx.get("currencyCode", "NOK")

        # Dates
        booking_date = self._parse_date(
            tx.get("dates", {}).get("booked") or
            tx.get("date") or
            tx.get("originalDate")
        ) or date.today()

        value_date = self._parse_date(
            tx.get("dates", {}).get("value")
        )

        # Description
        description = (
            tx.get("descriptions", {}).get("display") or
            tx.get("description") or
            tx.get("originalDescription", "")
        )

        # Counterparty
        counterparts = tx.get("counterparties", {})
        creditor_name = None
        debtor_name = None

        if amount < 0:
            # Outgoing - creditor is the recipient
            creditor_name = counterparts.get("payee", {}).get("name") or tx.get("merchantName")
        else:
            # Incoming - debtor is the sender
            debtor_name = counterparts.get("payer", {}).get("name")

        # Category from Tink's enriched data
        category = tx.get("categories", {}).get("pfm", {}).get("name")

        # Reference/KID
        reference = tx.get("reference") or tx.get("referenceNumbers", {}).get("reference")

        return BankTransactionInfo(
            transaction_id=tx.get("id", ""),
            amount=amount,
            currency=currency,
            booking_date=booking_date,
            value_date=value_date,
            remittance_information=description,
            additional_information=category,
            creditor_name=creditor_name,
            debtor_name=debtor_name,
            end_to_end_id=tx.get("referenceNumbers", {}).get("endToEnd"),
            creditor_reference=reference,  # KID
            proprietary_bank_code=tx.get("types", {}).get("type"),
            status="booked" if tx.get("status") != "PENDING" else "pending",
            _raw=tx,
        )


# Singleton client
_tink_client: Optional[TinkClient] = None


def get_tink_client() -> TinkClient:
    """Get or create Tink client singleton."""
    global _tink_client
    if _tink_client is None:
        _tink_client = TinkClient(
            client_id=settings.tink_client_id,
            client_secret=settings.tink_client_secret,
            sandbox=getattr(settings, 'bank_sandbox_mode', True),
        )
    return _tink_client


async def get_norwegian_banks_tink() -> list[TinkProvider]:
    """Get all Norwegian banks available via Tink."""
    client = get_tink_client()
    return await client.get_providers(market="NO")


async def create_tink_adapter(user_id: Optional[str] = None) -> TinkAdapter:
    """Create a Tink adapter."""
    client = get_tink_client()
    return TinkAdapter(client, user_id)
