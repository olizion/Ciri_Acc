"""
Roaring.io Open Banking Integration

Roaring.io provides bank account data via PSD2 APIs with a working
Mock ASPSP sandbox for Norway — useful for end-to-end testing when
other providers only offer error-scenario demos.

API docs: https://developer.roaring.io/
Token endpoint: POST https://api.roaring.io/token
Base URL: https://api.roaring.io/global/bank-account-data/1.0
"""

import httpx
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional
from dataclasses import dataclass
from urllib.parse import quote

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


ROARING_TOKEN_URL = "https://api.roaring.io/token"

ROARING_BANK_INFO = BankInfo(
    id="roaring",
    name="Roaring.io (Alle banker)",
    bic="",
    api_base_url=settings.roaring_base_url,
    auth_url="https://api.roaring.io",
    token_url=ROARING_TOKEN_URL,
    max_transaction_history_days=365,
    logo_url="/images/banks/roaring.svg",
    primary_color="#6366F1",
    requires_qsealc=False,
    requires_qwac=False,
)


@dataclass
class RoaringBank:
    """Bank available through Roaring."""
    id: str
    name: str
    bic: str = ""
    logo: Optional[str] = None
    country: str = "NO"


class RoaringClient:
    """
    Roaring.io Bank Account Data API client.

    Flow:
    1. Authenticate with client_credentials to get bearer token
    2. List available banks for Norway
    3. Start auth session for a specific bank (e.g. Mock ASPSP)
       -> returns authorization URL + authorizationId + state
    4. User completes consent in browser
    5. User is redirected back with authCode
    6. Exchange authCode for session with account IDs
    7. Fetch account details + transactions
    """

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        base_url: str = "",
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = base_url or settings.roaring_base_url
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    async def _ensure_token(self) -> str:
        """Get or refresh the OAuth client_credentials token."""
        if self._access_token and self._token_expires_at and datetime.utcnow() < self._token_expires_at:
            return self._access_token

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                ROARING_TOKEN_URL,
                data={"grant_type": "client_credentials"},
                auth=(self.client_id, self.client_secret),
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

        if resp.status_code != 200:
            raise BankError(
                message=f"Roaring token request failed: {resp.status_code} {resp.text}",
                bank_id="roaring",
                status_code=resp.status_code,
            )

        data = resp.json()
        self._access_token = data["access_token"]
        expires_in = data.get("expires_in", 3600)
        self._token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in - 60)
        return self._access_token

    async def _get(self, path: str, params: dict = None) -> dict:
        """Make authenticated GET request."""
        token = await self._ensure_token()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}{path}",
                params=params,
                headers={"Authorization": f"Bearer {token}"},
            )
        if resp.status_code != 200:
            raise BankError(
                message=f"Roaring API error: {resp.status_code} {resp.text}",
                bank_id="roaring",
                status_code=resp.status_code,
            )
        return resp.json()

    async def _post(self, path: str, params: dict = None, json_body: dict = None) -> dict:
        """Make authenticated POST request."""
        token = await self._ensure_token()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}{path}",
                params=params,
                json=json_body,
                headers={"Authorization": f"Bearer {token}"},
            )
        if resp.status_code not in (200, 201):
            raise BankError(
                message=f"Roaring API error: {resp.status_code} {resp.text}",
                bank_id="roaring",
                status_code=resp.status_code,
            )
        return resp.json()

    async def _delete(self, path: str) -> None:
        """Make authenticated DELETE request."""
        token = await self._ensure_token()
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{self.base_url}{path}",
                headers={"Authorization": f"Bearer {token}"},
            )
        if resp.status_code not in (200, 204):
            raise BankError(
                message=f"Roaring API error: {resp.status_code} {resp.text}",
                bank_id="roaring",
                status_code=resp.status_code,
            )

    # ------------------------------------------------------------------
    # Bank listing
    # ------------------------------------------------------------------

    async def list_banks(self, country_code: str = "NO", psu_type: str = "business") -> list[RoaringBank]:
        """List available banks for a country."""
        data = await self._get(f"/banks/{psu_type}", params={"countryCode": country_code})
        # Roaring wraps the list under "records"
        items = (
            data if isinstance(data, list)
            else data.get("records", data.get("banks", data.get("data", [])))
        )
        banks = []
        for item in items:
            banks.append(RoaringBank(
                id=item.get("name", item.get("id", "")),
                name=item.get("name", item.get("id", "")),
                bic=item.get("bic", ""),
                logo=item.get("bankLogo", item.get("logo")),
                country=country_code,
            ))
        return banks

    # ------------------------------------------------------------------
    # Authorization flow
    # ------------------------------------------------------------------

    async def start_authorization(
        self,
        country: str,
        bank_name: str,
        redirect_url: str,
        psu_type: str = "business",
    ) -> dict:
        """
        Start bank authorization session.

        Returns:
            {"url": "https://...", "state": "...", "authorizationId": "..."}
        """
        encoded_bank = quote(bank_name, safe="")
        data = await self._post(
            f"/auth/url/{country}/{encoded_bank}",
            params={"redirectUrl": redirect_url, "psuType": psu_type},
        )
        return data

    async def get_session(self, auth_code: str) -> dict:
        """
        Exchange authCode for session with account IDs.

        Returns session data including account IDs.
        """
        return await self._get("/auth/session", params={"authCode": auth_code})

    # ------------------------------------------------------------------
    # Account data
    # ------------------------------------------------------------------

    async def get_account_details(self, account_id: str) -> dict:
        """Get details for a specific account."""
        return await self._get(f"/account/details/{account_id}")

    async def get_transactions(
        self,
        account_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> list[dict]:
        """Get transactions for an account."""
        params = {}
        if from_date:
            params["fromDate"] = from_date.isoformat()
        if to_date:
            params["toDate"] = to_date.isoformat()

        data = await self._get(f"/account/{account_id}/transactions", params=params)
        if isinstance(data, list):
            return data
        return data.get("transactions", data.get("booked", []))

    # ------------------------------------------------------------------
    # Session cleanup
    # ------------------------------------------------------------------

    async def delete_session(self, session_id: str) -> None:
        """Delete an authorization session."""
        await self._delete(f"/session/{session_id}")


class RoaringAdapter(BankAdapter):
    """
    Adapter mapping Roaring.io API to the BankAdapter interface.

    Roaring has a different auth flow from PSD2 direct — it manages the
    bank consent flow itself and returns account IDs in the session response.
    """

    def __init__(self, client: RoaringClient):
        # Roaring is an aggregator, so we use a generic BankInfo
        super().__init__(
            bank_info=ROARING_BANK_INFO,
            client_id=client.client_id,
            client_secret=client.client_secret,
        )
        self.client = client

    async def get_authorization_url(
        self,
        redirect_uri: str,
        state: str,
        scope: str = "accounts",
        psu_ip_address: str = "127.0.0.1",
    ) -> str:
        """Not used directly — use RoaringClient.start_authorization instead."""
        raise NotImplementedError(
            "Use RoaringClient.start_authorization() for the Roaring flow"
        )

    async def exchange_code(
        self,
        code: str,
        redirect_uri: str,
    ) -> AuthorizationResult:
        """Exchange authCode for session data.

        For Roaring, the 'code' is the authCode from the redirect callback.
        We get the session which contains account IDs.
        """
        session_data = await self.client.get_session(code)
        # Roaring sessions don't use traditional access/refresh tokens.
        # The session itself grants access to account data.
        session_id = session_data.get("sessionId", session_data.get("id", ""))
        account_ids = session_data.get("accountIds", session_data.get("accounts", []))

        return AuthorizationResult(
            access_token=session_id,  # session acts as access token
            refresh_token=None,
            consent_id=session_id,
            consent_status=ConsentStatus.VALID,
            consent_expires_at=datetime.utcnow() + timedelta(days=90),
            extra={"account_ids": account_ids, "session_data": session_data},
        )

    async def refresh_token(self, refresh_token: str) -> AuthorizationResult:
        """Roaring sessions don't support refresh — re-authorize instead."""
        raise BankError(
            message="Roaring sessions cannot be refreshed. Please re-authorize.",
            bank_id="roaring",
        )

    async def get_accounts(
        self,
        access_token: str,
    ) -> list[BankAccountInfo]:
        """Get accounts from a Roaring session.

        The access_token is actually the session_id from exchange_code.
        We need to get account details for each account ID in the session.
        """
        # Re-fetch session to get account IDs
        # In practice the account_ids are stored from exchange_code
        # For now, we fetch via the session
        # This method expects account IDs to be passed via the access_token extra data
        # We'll handle this in the bank.py endpoint directly
        raise NotImplementedError(
            "Use get_account() with specific account IDs from the session"
        )

    async def get_account(
        self,
        access_token: str,
        account_id: str,
    ) -> BankAccountInfo:
        """Get details for a specific account.

        Roaring account details response:
        {
          "account_id": {"iban": "...", "other": {"identification": "...", "scheme_name": "BBAN"}},
          "account_servicer": {"bic_fi": "...", "name": "..."},
          "name": "...", "currency": "NOK", "cash_account_type": "CACC",
          "balances": [{"balance_amount": {"currency": "NOK", "amount": "0.00"}, "balance_type": "ITAV", ...}]
        }
        """
        data = await self.client.get_account_details(account_id)

        # Extract identifiers
        acc_id = data.get("account_id", {})
        iban = acc_id.get("iban")
        other = acc_id.get("other", {})
        bban = other.get("identification") if other else None

        # Extract balances
        balances = []
        for bal in data.get("balances", []):
            bal_amount = bal.get("balance_amount", {})
            balances.append(BankBalance(
                amount=Decimal(str(bal_amount.get("amount", "0"))),
                currency=bal_amount.get("currency", "NOK"),
                balance_type=bal.get("balance_type", "closingBooked"),
                reference_date=self._parse_date(bal.get("reference_date")),
            ))

        return BankAccountInfo(
            resource_id=account_id,
            iban=iban,
            bban=bban,
            name=data.get("name"),
            display_name=data.get("details") or data.get("product"),
            owner_name=data.get("name"),
            currency=data.get("currency", "NOK"),
            balances=balances,
        )

    async def get_balances(
        self,
        access_token: str,
        account_id: str,
    ) -> list[BankBalance]:
        """Get balances from account details."""
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
        """Get transactions for an account.

        Roaring transaction format:
        {
          "entry_reference": "TX0001",
          "transaction_amount": {"currency": "NOK", "amount": "1454.00"},
          "credit_debit_indicator": "DBIT",
          "status": "BOOK",
          "booking_date": "2026-02-06",
          "value_date": "2026-02-05",
          "remittance_information": ["description text"],
          "creditor": {"name": "..."},
          "debtor": {"name": "..."},
          ...
        }
        """
        raw_txs = await self.client.get_transactions(account_id, date_from, date_to)

        transactions = []
        for tx in raw_txs:
            tx_id = tx.get("entry_reference", tx.get("transaction_id", ""))

            # Amount: always positive in response, sign from credit_debit_indicator
            tx_amount = tx.get("transaction_amount", {})
            amount = Decimal(str(tx_amount.get("amount", "0")))
            currency = tx_amount.get("currency", "NOK")

            # Apply sign based on direction
            if tx.get("credit_debit_indicator") == "DBIT":
                amount = -abs(amount)
            else:
                amount = abs(amount)

            booking_dt = self._parse_date(tx.get("booking_date")) or date.today()
            value_dt = self._parse_date(tx.get("value_date"))

            # remittance_information is an array of strings
            remittance = tx.get("remittance_information", [])
            description = remittance[0] if remittance else ""

            # Creditor/debtor
            creditor = tx.get("creditor") or {}
            debtor = tx.get("debtor") or {}
            creditor_account = tx.get("creditor_account") or {}
            debtor_account = tx.get("debtor_account") or {}

            transactions.append(BankTransactionInfo(
                transaction_id=tx_id,
                amount=amount,
                booking_date=booking_dt,
                currency=currency,
                value_date=value_dt,
                remittance_information=description,
                creditor_name=creditor.get("name"),
                creditor_account_iban=creditor_account.get("iban"),
                creditor_account_bban=(creditor_account.get("other") or {}).get("identification"),
                debtor_name=debtor.get("name"),
                debtor_account_iban=debtor_account.get("iban"),
                debtor_account_bban=(debtor_account.get("other") or {}).get("identification"),
                creditor_reference=tx.get("reference_number"),
                balance_after_transaction=Decimal(str(tx["balance_after_transaction"]["amount"])) if tx.get("balance_after_transaction") else None,
                _raw=tx,
            ))

        return transactions


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------

_roaring_client: Optional[RoaringClient] = None


def get_roaring_client() -> Optional[RoaringClient]:
    """Get or create the Roaring client singleton (None if not configured)."""
    global _roaring_client
    if _roaring_client is not None:
        return _roaring_client

    if not settings.roaring_client_id or not settings.roaring_client_secret:
        return None

    _roaring_client = RoaringClient(
        client_id=settings.roaring_client_id,
        client_secret=settings.roaring_client_secret,
        base_url=settings.roaring_base_url,
    )
    return _roaring_client


async def get_norwegian_banks_roaring() -> list[RoaringBank]:
    """Get Norwegian banks available through Roaring."""
    client = get_roaring_client()
    if not client:
        return []
    return await client.list_banks(country_code="NO")
