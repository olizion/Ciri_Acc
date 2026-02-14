"""
Bank Sync Background Task
Periodic synchronization of bank transactions via Open Banking
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from config.database import async_session_maker
from config.settings import settings
from models import (
    BankAccount, BankAccountStatus,
    BankTransaction, TransactionDirection, ReconciliationStatus, TransactionCategory,
    Company, AutonomyLevel,
)
from services.bank_aggregator import neonomics_client, NeonomicsError
from services.reconciliation_matcher import create_matcher

logger = logging.getLogger(__name__)

# Global task reference
_sync_task: Optional[asyncio.Task] = None


class BankSyncService:
    """
    Service for synchronizing bank transactions.

    Runs periodically to:
    1. Refresh expiring consents
    2. Fetch new transactions
    3. Update account balances
    4. Trigger auto-reconciliation
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def sync_all_accounts(self) -> dict:
        """
        Sync all active bank accounts for all companies.

        Returns:
            Summary of sync results
        """
        results = {
            "accounts_synced": 0,
            "transactions_imported": 0,
            "auto_matched": 0,
            "errors": [],
        }

        # Get all active bank accounts
        query = select(BankAccount).where(
            BankAccount.status == BankAccountStatus.ACTIVE,
            BankAccount.auto_sync_enabled == True,
        )
        result = await self.db.execute(query)
        accounts = result.scalars().all()

        for account in accounts:
            try:
                account_result = await self.sync_account(account)
                results["accounts_synced"] += 1
                results["transactions_imported"] += account_result.get("transactions_imported", 0)
                results["auto_matched"] += account_result.get("auto_matched", 0)
            except Exception as e:
                logger.error(f"Error syncing account {account.id}: {e}")
                results["errors"].append({
                    "account_id": str(account.id),
                    "error": str(e),
                })

        await self.db.commit()
        return results

    async def sync_account(self, account: BankAccount) -> dict:
        """
        Sync a single bank account.

        Args:
            account: The bank account to sync

        Returns:
            Sync result summary
        """
        logger.info(f"Syncing account {account.id} ({account.bank_name} - {account.account_number})")

        result = {
            "transactions_imported": 0,
            "balance_updated": False,
            "auto_matched": 0,
        }

        try:
            # Check consent validity
            if account.needs_reauth:
                await self._handle_consent_refresh(account)

            # Skip if still no valid consent
            if not account.access_token_encrypted:
                logger.warning(f"No access token for account {account.id}")
                return result

            # Decrypt access token (in production, use proper encryption)
            access_token = account.access_token_encrypted  # TODO: Decrypt

            # Update balance
            try:
                balance_data = await neonomics_client.get_account_balance(
                    access_token,
                    account.external_account_id,
                )
                account.current_balance = balance_data["balance"]
                account.available_balance = balance_data.get("available")
                account.balance_updated_at = datetime.utcnow()
                result["balance_updated"] = True
            except NeonomicsError as e:
                logger.warning(f"Failed to fetch balance for {account.id}: {e}")

            # Fetch transactions
            from_date = account.last_sync_at or (datetime.utcnow() - timedelta(days=90))
            to_date = datetime.utcnow()

            try:
                transactions = await neonomics_client.get_transactions(
                    access_token,
                    account.external_account_id,
                    from_date,
                    to_date,
                )

                # Import new transactions
                for tx_data in transactions:
                    imported = await self._import_transaction(account, tx_data)
                    if imported:
                        result["transactions_imported"] += 1

            except NeonomicsError as e:
                logger.warning(f"Failed to fetch transactions for {account.id}: {e}")
                account.last_sync_error = str(e)
                return result

            # Update sync timestamp
            account.last_sync_at = datetime.utcnow()
            account.last_sync_error = None

            # Trigger auto-reconciliation for new transactions
            if result["transactions_imported"] > 0:
                auto_matched = await self._auto_reconcile_new_transactions(account)
                result["auto_matched"] = auto_matched

        except Exception as e:
            logger.error(f"Sync error for account {account.id}: {e}")
            account.last_sync_error = str(e)
            raise

        return result

    async def _handle_consent_refresh(self, account: BankAccount) -> bool:
        """Attempt to refresh an expiring/expired consent."""
        if not account.refresh_token_encrypted:
            logger.warning(f"No refresh token for account {account.id}")
            account.status = BankAccountStatus.CONSENT_EXPIRED
            return False

        try:
            # Decrypt refresh token (in production, use proper encryption)
            refresh_token = account.refresh_token_encrypted  # TODO: Decrypt

            # Refresh tokens
            token_data = await neonomics_client.refresh_consent(refresh_token)

            # Update tokens (in production, encrypt before storing)
            account.access_token_encrypted = token_data["access_token"]
            if token_data.get("refresh_token"):
                account.refresh_token_encrypted = token_data["refresh_token"]

            # Update consent expiry (typically 90 days for PSD2)
            account.consent_expires_at = datetime.utcnow() + timedelta(days=90)
            account.status = BankAccountStatus.ACTIVE

            logger.info(f"Refreshed consent for account {account.id}")
            return True

        except NeonomicsError as e:
            logger.error(f"Failed to refresh consent for {account.id}: {e}")
            account.status = BankAccountStatus.CONSENT_EXPIRED
            return False

    async def _import_transaction(
        self,
        account: BankAccount,
        tx_data,
    ) -> Optional[BankTransaction]:
        """
        Import a single transaction if it doesn't already exist.

        Returns:
            The imported transaction or None if already exists
        """
        # Check if already imported
        query = select(BankTransaction).where(
            and_(
                BankTransaction.bank_account_id == account.id,
                BankTransaction.external_transaction_id == tx_data.external_id,
            )
        )
        result = await self.db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            return None

        # Create new transaction
        direction = TransactionDirection.CREDIT if tx_data.direction == "CREDIT" else TransactionDirection.DEBIT
        amount = tx_data.amount

        transaction = BankTransaction(
            company_id=account.company_id,
            bank_account_id=account.id,
            external_transaction_id=tx_data.external_id,
            booking_date=tx_data.booking_date.date(),
            value_date=tx_data.value_date.date() if tx_data.value_date else None,
            amount=amount,
            currency=tx_data.currency,
            direction=direction,
            balance_after=tx_data.balance_after,
            raw_description=tx_data.description,
            cleaned_description=self._clean_description(tx_data.description),
            merchant_name=tx_data.counterparty_name,
            merchant_category_code=tx_data.merchant_category_code,
            reference=tx_data.reference,
            category=self._initial_categorize(tx_data),
            reconciliation_status=ReconciliationStatus.UNMATCHED,
        )

        self.db.add(transaction)
        account.transaction_count += 1

        return transaction

    def _clean_description(self, description: str) -> str:
        """Clean up a raw bank description."""
        if not description:
            return ""

        # Remove common prefixes
        cleaned = description
        prefixes = [
            "Varekjøp ", "Kortbetaling ", "VIPPS*", "VIPPS ",
            "Nettbank ", "Giro ", "Fra: ", "Til: ",
        ]
        for prefix in prefixes:
            if cleaned.upper().startswith(prefix.upper()):
                cleaned = cleaned[len(prefix):]

        # Remove card/reference numbers at the end
        import re
        cleaned = re.sub(r"\s+\d{4,}$", "", cleaned)

        return cleaned.strip()

    def _initial_categorize(self, tx_data) -> TransactionCategory:
        """Initial categorization based on MCC or description."""
        desc = (tx_data.description or "").upper()
        mcc = tx_data.merchant_category_code

        # MCC-based categorization
        if mcc:
            mcc_categories = {
                # Travel
                "4111": TransactionCategory.REISE,  # Transportation
                "4121": TransactionCategory.REISE,  # Taxi
                "4131": TransactionCategory.REISE,  # Bus
                "5541": TransactionCategory.REISE,  # Gas stations
                "5542": TransactionCategory.REISE,  # Gas stations
                "7011": TransactionCategory.REISE,  # Hotels
                "4511": TransactionCategory.REISE,  # Airlines

                # Office
                "5943": TransactionCategory.KONTOR,  # Office supplies
                "5045": TransactionCategory.KONTOR,  # Computers
                "5732": TransactionCategory.KONTOR,  # Electronics

                # Food
                "5411": TransactionCategory.VAREKJOP,  # Grocery
                "5814": TransactionCategory.VAREKJOP,  # Fast food
                "5812": TransactionCategory.VAREKJOP,  # Restaurants
            }
            if mcc in mcc_categories:
                return mcc_categories[mcc]

        # Description-based categorization
        patterns = {
            TransactionCategory.REISE: ["TAXI", "UBER", "LYFT", "FLYTOGET", "NSB", "VY ", "SAS ", "NORWEGIAN", "WIDEROE", "CIRCLE K", "ESSO ", "SHELL ", "STATOIL"],
            TransactionCategory.KONTOR: ["MICROSOFT", "ADOBE", "GOOGLE", "AWS ", "AMAZON WEB", "GITHUB", "SLACK", "ZOOM", "DROPBOX", "SPOTIFY AB", "NETFLIX"],
            TransactionCategory.LONN: ["LØNN", "SALARY", "WAGE"],
            TransactionCategory.BANK: ["RENTE", "GEBYR", "FEE"],
            TransactionCategory.FORSIKRING: ["FORSIKRING", "INSURANCE", "IF SKADE", "TRYG ", "GJENSIDIGE"],
            TransactionCategory.LEIE: ["HUSLEIE", "LEIE", "RENT "],
            TransactionCategory.MVA: ["SKATTEETATEN", "MVA", "MERVERDIAVGIFT"],
        }

        for category, keywords in patterns.items():
            for keyword in keywords:
                if keyword in desc:
                    return category

        return TransactionCategory.UKATEGORISERT

    async def _auto_reconcile_new_transactions(self, account: BankAccount) -> int:
        """Run auto-reconciliation on unmatched transactions."""
        # Get company autonomy level
        query = select(Company).where(Company.id == account.company_id)
        result = await self.db.execute(query)
        company = result.scalar_one_or_none()

        if not company:
            return 0

        # Get unmatched transactions
        query = select(BankTransaction).where(
            and_(
                BankTransaction.bank_account_id == account.id,
                BankTransaction.reconciliation_status == ReconciliationStatus.UNMATCHED,
                BankTransaction.is_private == False,
            )
        ).order_by(BankTransaction.booking_date.desc()).limit(50)

        result = await self.db.execute(query)
        transactions = result.scalars().all()

        matcher = create_matcher(self.db)
        matched_count = 0

        for transaction in transactions:
            try:
                match = await matcher.auto_reconcile(transaction, company.autonomy_level)
                if match and match.is_confirmed:
                    matched_count += 1
            except Exception as e:
                logger.warning(f"Error auto-reconciling transaction {transaction.id}: {e}")

        return matched_count


async def sync_bank_accounts_task():
    """Background task that runs bank synchronization."""
    logger.info("Starting bank sync background task")

    while True:
        try:
            async with async_session_maker() as db:
                service = BankSyncService(db)
                results = await service.sync_all_accounts()

                logger.info(
                    f"Bank sync completed: "
                    f"{results['accounts_synced']} accounts, "
                    f"{results['transactions_imported']} new transactions, "
                    f"{results['auto_matched']} auto-matched"
                )

                if results["errors"]:
                    logger.warning(f"Sync errors: {results['errors']}")

        except Exception as e:
            logger.error(f"Bank sync task error: {e}")

        # Wait for next sync interval
        await asyncio.sleep(settings.bank_sync_interval_hours * 3600)


def start_bank_sync_task():
    """Start the bank sync background task."""
    global _sync_task

    if _sync_task is not None:
        logger.warning("Bank sync task already running")
        return

    _sync_task = asyncio.create_task(sync_bank_accounts_task())
    logger.info("Bank sync task started")


def stop_bank_sync_task():
    """Stop the bank sync background task."""
    global _sync_task

    if _sync_task is not None:
        _sync_task.cancel()
        _sync_task = None
        logger.info("Bank sync task stopped")


async def sync_single_account(account_id: UUID, db: AsyncSession | None = None) -> dict:
    """
    Trigger immediate sync for a single account.

    Used for manual sync requests. Creates its own session when called
    from a background task (where the route's session is unavailable).
    """
    if db is None:
        async with async_session_maker() as db:
            return await _do_sync_single_account(account_id, db)
    else:
        return await _do_sync_single_account(account_id, db)


async def _do_sync_single_account(account_id: UUID, db: AsyncSession) -> dict:
    """Internal helper for sync_single_account."""
    query = select(BankAccount).where(BankAccount.id == account_id)
    result = await db.execute(query)
    account = result.scalar_one_or_none()

    if not account:
        raise ValueError(f"Account not found: {account_id}")

    service = BankSyncService(db)
    return await service.sync_account(account)
