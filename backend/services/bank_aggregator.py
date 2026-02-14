"""
Bank Aggregator Service
Neonomics Open Banking integration for PSD2 bank connections
"""

import uuid
import httpx
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from dataclasses import dataclass
from enum import Enum

from config.settings import settings


class NeonomicsError(Exception):
    """Neonomics API error."""

    def __init__(self, message: str, status_code: int = None, error_code: str = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(message)


@dataclass
class NorwegianBank:
    """Norwegian bank information."""

    id: str
    name: str
    bic: str
    logo_url: Optional[str] = None
    supports_payment: bool = True


# Popular Norwegian banks supported by Neonomics
NORWEGIAN_BANKS = [
    NorwegianBank("no-dnb", "DNB", "DNBANOKK", "https://logos.neonomics.io/no-dnb.png"),
    NorwegianBank("no-nordea", "Nordea", "NDEANOKK", "https://logos.neonomics.io/no-nordea.png"),
    NorwegianBank("no-sparebank1", "SpareBank 1", "SHEDNO22", "https://logos.neonomics.io/no-sparebank1.png"),
    NorwegianBank("no-sbanken", "Sbanken", "SABOROKK", "https://logos.neonomics.io/no-sbanken.png"),
    NorwegianBank("no-handelsbanken", "Handelsbanken", "HANDSESS", "https://logos.neonomics.io/no-handelsbanken.png"),
    NorwegianBank("no-danske", "Danske Bank", "DABANO22", "https://logos.neonomics.io/no-danske.png"),
    NorwegianBank("no-storebrand", "Storebrand Bank", "SBANNOKK", "https://logos.neonomics.io/no-storebrand.png"),
    NorwegianBank("no-obos", "OBOS-banken", "OBOSNO22", "https://logos.neonomics.io/no-obos.png"),
    NorwegianBank("no-bulder", "Bulder Bank", "BULDNO22", "https://logos.neonomics.io/no-bulder.png"),
    NorwegianBank("no-kron", "Kron", "KRONNO22", "https://logos.neonomics.io/no-kron.png"),
]


@dataclass
class BankAccountInfo:
    """Bank account information from Neonomics."""

    external_id: str
    iban: Optional[str]
    bban: str  # Norwegian account number
    name: str
    currency: str
    balance: Decimal
    available_balance: Optional[Decimal]
    account_type: str  # "current", "savings", etc.


@dataclass
class BankTransactionInfo:
    """Bank transaction from Neonomics."""

    external_id: str
    booking_date: datetime
    value_date: Optional[datetime]
    amount: Decimal
    currency: str
    direction: str  # "DEBIT" or "CREDIT"
    description: str
    reference: Optional[str]
    counterparty_name: Optional[str]
    counterparty_account: Optional[str]
    balance_after: Optional[Decimal]
    merchant_category_code: Optional[str]


class NeonomicsClient:
    """
    Client for Neonomics Open Banking API.

    Handles authentication, bank connections, and transaction fetching.
    See: https://docs.neonomics.io/
    """

    def __init__(self):
        self.client_id = settings.neonomics_client_id
        self.client_secret = settings.neonomics_client_secret
        self.api_url = settings.neonomics_api_url
        self.auth_url = settings.neonomics_auth_url
        self.redirect_uri = (
            settings.neonomics_redirect_uri or
            f"{settings.backend_url}/api/bank/callback"
        )
        self._access_token: Optional[str] = None
        self._token_expires: Optional[datetime] = None

    async def _ensure_authenticated(self) -> None:
        """Ensure we have a valid access token."""
        if self._access_token and self._token_expires and datetime.utcnow() < self._token_expires:
            return

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.auth_url}/oauth/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
            )

            if response.status_code != 200:
                raise NeonomicsError(
                    f"Authentication failed: {response.text}",
                    status_code=response.status_code,
                )

            data = response.json()
            self._access_token = data["access_token"]
            self._token_expires = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600) - 60)

    async def _request(
        self,
        method: str,
        path: str,
        user_token: Optional[str] = None,
        **kwargs
    ) -> dict:
        """Make authenticated request to Neonomics API."""
        await self._ensure_authenticated()

        headers = {
            "Authorization": f"Bearer {user_token or self._access_token}",
            "Content-Type": "application/json",
            "x-device-id": str(uuid.uuid4()),  # Required by Neonomics
            "x-psu-ip-address": "127.0.0.1",  # PSU IP for PSD2 compliance
        }

        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                f"{self.api_url}{path}",
                headers=headers,
                **kwargs,
            )

            if response.status_code >= 400:
                error_data = response.json() if response.content else {}
                raise NeonomicsError(
                    error_data.get("message", response.text),
                    status_code=response.status_code,
                    error_code=error_data.get("errorCode"),
                )

            return response.json() if response.content else {}

    def get_available_banks(self) -> list[NorwegianBank]:
        """Get list of available Norwegian banks."""
        return NORWEGIAN_BANKS

    async def get_bank_by_id(self, bank_id: str) -> Optional[NorwegianBank]:
        """Get bank by ID."""
        for bank in NORWEGIAN_BANKS:
            if bank.id == bank_id:
                return bank
        return None

    async def create_session(self, bank_id: str) -> dict:
        """
        Create a new banking session for user authorization.

        Returns:
            Dict with session_id and authorization URL
        """
        response = await self._request(
            "POST",
            "/sessions",
            json={
                "bankId": bank_id,
                "redirectUrl": self.redirect_uri,
            },
        )

        return {
            "session_id": response["sessionId"],
            "authorization_url": response["authorizationUrl"],
        }

    async def complete_authorization(
        self,
        session_id: str,
        authorization_code: str
    ) -> dict:
        """
        Complete bank authorization after user consent.

        Returns:
            Dict with consent_id and expiry
        """
        response = await self._request(
            "POST",
            f"/sessions/{session_id}/authorize",
            json={"code": authorization_code},
        )

        return {
            "consent_id": response["consentId"],
            "expires_at": datetime.fromisoformat(response["expiresAt"].replace("Z", "+00:00")),
            "access_token": response.get("accessToken"),
            "refresh_token": response.get("refreshToken"),
        }

    async def refresh_consent(self, refresh_token: str) -> dict:
        """Refresh an expiring consent."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.auth_url}/oauth/token",
                data={
                    "grant_type": "refresh_token",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                },
            )

            if response.status_code != 200:
                raise NeonomicsError(
                    f"Token refresh failed: {response.text}",
                    status_code=response.status_code,
                )

            data = response.json()
            return {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token"),
                "expires_in": data.get("expires_in", 3600),
            }

    async def get_accounts(self, user_token: str) -> list[BankAccountInfo]:
        """
        Get all accounts for authorized user.

        Args:
            user_token: User's access token from authorization

        Returns:
            List of bank accounts
        """
        response = await self._request("GET", "/accounts", user_token=user_token)

        accounts = []
        for acc in response.get("accounts", []):
            accounts.append(BankAccountInfo(
                external_id=acc["accountId"],
                iban=acc.get("iban"),
                bban=acc.get("bban", acc.get("accountNumber", "")),
                name=acc.get("name", acc.get("product", "Konto")),
                currency=acc.get("currency", "NOK"),
                balance=Decimal(str(acc.get("balance", {}).get("amount", 0))),
                available_balance=Decimal(str(acc["availableBalance"]["amount"])) if acc.get("availableBalance") else None,
                account_type=acc.get("accountType", "current"),
            ))

        return accounts

    async def get_transactions(
        self,
        user_token: str,
        account_id: str,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> list[BankTransactionInfo]:
        """
        Get transactions for an account.

        Args:
            user_token: User's access token
            account_id: External account ID
            from_date: Start date (default: 90 days ago)
            to_date: End date (default: today)

        Returns:
            List of transactions
        """
        if not from_date:
            from_date = datetime.utcnow() - timedelta(days=settings.bank_transaction_lookback_days)
        if not to_date:
            to_date = datetime.utcnow()

        params = {
            "dateFrom": from_date.strftime("%Y-%m-%d"),
            "dateTo": to_date.strftime("%Y-%m-%d"),
        }

        response = await self._request(
            "GET",
            f"/accounts/{account_id}/transactions",
            user_token=user_token,
            params=params,
        )

        transactions = []
        for tx in response.get("transactions", {}).get("booked", []):
            # Parse amount (can be positive or negative)
            amount_data = tx.get("transactionAmount", {})
            amount = Decimal(str(amount_data.get("amount", 0)))

            # Determine direction
            direction = "CREDIT" if amount >= 0 else "DEBIT"

            # Extract counterparty
            counterparty = tx.get("creditorName") or tx.get("debtorName")
            counterparty_account = tx.get("creditorAccount", {}).get("iban") or tx.get("debtorAccount", {}).get("iban")

            transactions.append(BankTransactionInfo(
                external_id=tx["transactionId"],
                booking_date=datetime.strptime(tx["bookingDate"], "%Y-%m-%d"),
                value_date=datetime.strptime(tx["valueDate"], "%Y-%m-%d") if tx.get("valueDate") else None,
                amount=amount,
                currency=amount_data.get("currency", "NOK"),
                direction=direction,
                description=tx.get("remittanceInformationUnstructured", tx.get("additionalInformation", "")),
                reference=tx.get("endToEndId") or tx.get("creditorReference"),
                counterparty_name=counterparty,
                counterparty_account=counterparty_account,
                balance_after=Decimal(str(tx["balanceAfterTransaction"]["amount"])) if tx.get("balanceAfterTransaction") else None,
                merchant_category_code=tx.get("merchantCategoryCode"),
            ))

        return transactions

    async def get_account_balance(self, user_token: str, account_id: str) -> dict:
        """
        Get current balance for an account.

        Returns:
            Dict with balance and available balance
        """
        response = await self._request(
            "GET",
            f"/accounts/{account_id}/balances",
            user_token=user_token,
        )

        balances = response.get("balances", [])
        result = {"balance": Decimal(0), "available": None}

        for bal in balances:
            amount = Decimal(str(bal.get("balanceAmount", {}).get("amount", 0)))
            bal_type = bal.get("balanceType", "")

            if bal_type in ["closingBooked", "expected"]:
                result["balance"] = amount
            elif bal_type in ["interimAvailable", "available"]:
                result["available"] = amount

        return result


# Singleton instance
neonomics_client = NeonomicsClient()
