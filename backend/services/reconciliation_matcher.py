"""
Reconciliation Matcher Service
AI-powered multi-factor matching algorithm for bank reconciliation
"""

import uuid
import re
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from dataclasses import dataclass, field
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from models import (
    Bilag, BilagStatus,
    BankTransaction, ReconciliationStatus, TransactionCategory,
    ReconciliationMatch, MatchType, MatchConfidence, MatchStatus,
    ReconciliationRule, RuleType,
    Company, AutonomyLevel,
)


@dataclass
class MatchFactor:
    """Single matching factor with score contribution."""

    name: str
    weight: float
    matched: bool
    score: float
    details: dict = field(default_factory=dict)


@dataclass
class MatchCandidate:
    """A potential match between transaction and bilag."""

    bilag_id: uuid.UUID
    bilag_number: str
    bilag_description: str
    bilag_amount: Decimal
    total_score: float
    confidence: MatchConfidence
    factors: list[MatchFactor]
    explanation: str  # Norwegian explanation for user


class ReconciliationMatcher:
    """
    Multi-factor reconciliation matching engine.

    Matches bank transactions to bilags using multiple weighted factors:
    - Exact amount match (35%)
    - Reference/KID match (30%)
    - Amount tolerance (20%)
    - Counterparty name similarity (15%)
    - Date proximity (15%)
    - Historical patterns (10%)

    Total can exceed 100% as factors can stack.
    """

    # Factor weights (sum to 1.0 for core factors)
    WEIGHT_EXACT_AMOUNT = 0.35
    WEIGHT_REFERENCE = 0.30
    WEIGHT_AMOUNT_TOLERANCE = 0.20
    WEIGHT_NAME_SIMILARITY = 0.15
    WEIGHT_DATE_PROXIMITY = 0.15
    WEIGHT_HISTORICAL = 0.10

    # Thresholds
    AMOUNT_TOLERANCE_PERCENT = 0.05  # 5% tolerance for rounding/fees/currency conversion
    DATE_PROXIMITY_DAYS = 14  # Max days between transaction and bilag
    NAME_SIMILARITY_THRESHOLD = 0.6  # Min similarity for name match

    # Confidence thresholds
    HIGH_CONFIDENCE_THRESHOLD = 0.90
    MEDIUM_CONFIDENCE_THRESHOLD = 0.70

    def __init__(self, db: AsyncSession):
        self.db = db
        self._rules_cache: dict[uuid.UUID, list] = {}
        self._bilags_cache: dict[uuid.UUID, list] = {}

    def clear_cache(self):
        """Clear cached rules and bilags (call after batch completes)."""
        self._rules_cache.clear()
        self._bilags_cache.clear()

    async def find_matches(
        self,
        transaction: BankTransaction,
        limit: int = 5,
    ) -> list[MatchCandidate]:
        """
        Find potential bilag matches for a bank transaction.

        Args:
            transaction: The bank transaction to match
            limit: Maximum number of candidates to return

        Returns:
            List of match candidates sorted by score (highest first)
        """
        # Get unmatched bilags for this company (cached per company to avoid N+1)
        company_id = transaction.company_id
        if company_id not in self._bilags_cache:
            query = select(Bilag).where(
                and_(
                    Bilag.company_id == company_id,
                    Bilag.status.in_([BilagStatus.AWAITING_TRANSACTION, BilagStatus.APPROVED]),
                    Bilag.gross_amount > 0,
                )
            ).order_by(Bilag.document_date.desc()).limit(100)

            result = await self.db.execute(query)
            self._bilags_cache[company_id] = result.scalars().all()

        bilags = self._bilags_cache[company_id]

        candidates = []
        for bilag in bilags:
            match_result = self._calculate_match_score(transaction, bilag)
            if match_result:
                candidates.append(match_result)

        # Sort by score and limit
        candidates.sort(key=lambda x: x.total_score, reverse=True)
        return candidates[:limit]

    def _calculate_match_score(
        self,
        transaction: BankTransaction,
        bilag: Bilag,
        skip_minimum_threshold: bool = False,
    ) -> Optional[MatchCandidate]:
        """Calculate match score between transaction and bilag."""
        factors = []

        # Transaction amount (always positive for comparison)
        tx_amount = abs(transaction.amount)
        bilag_amount = abs(bilag.gross_amount)

        # Factor 1: Exact amount match
        exact_match = tx_amount == bilag_amount
        factors.append(MatchFactor(
            name="exact_amount",
            weight=self.WEIGHT_EXACT_AMOUNT,
            matched=exact_match,
            score=self.WEIGHT_EXACT_AMOUNT if exact_match else 0,
            details={"transaction": float(tx_amount), "bilag": float(bilag_amount)},
        ))

        # Factor 2: Reference/KID match
        reference_match = self._check_reference_match(transaction, bilag)
        factors.append(MatchFactor(
            name="reference_match",
            weight=self.WEIGHT_REFERENCE,
            matched=reference_match,
            score=self.WEIGHT_REFERENCE if reference_match else 0,
            details={
                "transaction_ref": transaction.reference,
                "bilag_number": bilag.bilag_number,
            },
        ))

        # Factor 3: Amount within tolerance
        if not exact_match:
            amount_diff = abs(tx_amount - bilag_amount)
            tolerance = bilag_amount * Decimal(str(self.AMOUNT_TOLERANCE_PERCENT))
            within_tolerance = amount_diff <= tolerance
            tolerance_score = self.WEIGHT_AMOUNT_TOLERANCE if within_tolerance else 0
        else:
            within_tolerance = True
            tolerance_score = 0  # Already counted in exact match

        factors.append(MatchFactor(
            name="amount_tolerance",
            weight=self.WEIGHT_AMOUNT_TOLERANCE,
            matched=within_tolerance,
            score=tolerance_score,
            details={"difference": float(abs(tx_amount - bilag_amount))},
        ))

        # Factor 4: Counterparty name similarity
        name_similarity = self._calculate_name_similarity(
            transaction.merchant_name or transaction.cleaned_description or transaction.raw_description,
            bilag.counterparty_name or bilag.description,
        )
        name_match = name_similarity >= self.NAME_SIMILARITY_THRESHOLD
        name_score = self.WEIGHT_NAME_SIMILARITY * name_similarity if name_match else 0

        factors.append(MatchFactor(
            name="name_similarity",
            weight=self.WEIGHT_NAME_SIMILARITY,
            matched=name_match,
            score=name_score,
            details={"similarity": name_similarity},
        ))

        # Factor 5: Date proximity
        days_diff = abs((transaction.booking_date - bilag.document_date).days)
        date_match = days_diff <= self.DATE_PROXIMITY_DAYS
        # Score decreases linearly with distance
        date_score = 0
        if date_match:
            date_score = self.WEIGHT_DATE_PROXIMITY * (1 - days_diff / self.DATE_PROXIMITY_DAYS)

        factors.append(MatchFactor(
            name="date_proximity",
            weight=self.WEIGHT_DATE_PROXIMITY,
            matched=date_match,
            score=date_score,
            details={"days_difference": days_diff},
        ))

        # Calculate total score
        total_score = sum(f.score for f in factors)

        # Minimum threshold to be a candidate (skipped for manual matching)
        if not skip_minimum_threshold and total_score < 0.2:
            return None

        # Determine confidence level
        if total_score >= self.HIGH_CONFIDENCE_THRESHOLD:
            confidence = MatchConfidence.HIGH
        elif total_score >= self.MEDIUM_CONFIDENCE_THRESHOLD:
            confidence = MatchConfidence.MEDIUM
        else:
            confidence = MatchConfidence.LOW

        # Generate Norwegian explanation
        explanation = self._generate_explanation(factors, bilag, transaction)

        return MatchCandidate(
            bilag_id=bilag.id,
            bilag_number=bilag.bilag_number,
            bilag_description=bilag.description,
            bilag_amount=bilag.gross_amount,
            total_score=total_score,
            confidence=confidence,
            factors=factors,
            explanation=explanation,
        )

    def _check_reference_match(self, transaction: BankTransaction, bilag: Bilag) -> bool:
        """Check if transaction reference matches bilag."""
        if not transaction.reference:
            return False

        # Check against bilag number
        if transaction.reference in bilag.bilag_number:
            return True

        # Check if reference contains invoice number pattern
        # Common patterns: F-2025-001, INV-123, etc.
        ref = transaction.reference.upper()
        bilag_num = bilag.bilag_number.upper()

        # Extract numeric parts and compare
        ref_nums = re.findall(r"\d+", ref)
        bilag_nums = re.findall(r"\d+", bilag_num)

        if ref_nums and bilag_nums:
            # Check if any numeric sequence matches
            for rn in ref_nums:
                if rn in bilag_nums or any(rn in bn for bn in bilag_nums):
                    return True

        return False

    def _calculate_name_similarity(self, name1: Optional[str], name2: Optional[str]) -> float:
        """Calculate similarity between two names using SequenceMatcher."""
        if not name1 or not name2:
            return 0.0

        # Normalize names
        n1 = self._normalize_name(name1)
        n2 = self._normalize_name(name2)

        if not n1 or not n2:
            return 0.0

        # Use SequenceMatcher for fuzzy matching
        return SequenceMatcher(None, n1, n2).ratio()

    def _normalize_name(self, name: str) -> str:
        """Normalize a name for comparison."""
        # Lowercase
        name = name.lower()

        # Remove common prefixes/suffixes
        remove_patterns = [
            r"\bas\b", r"\basa\b", r"\bab\b", r"\bltd\b", r"\binc\b",
            r"\*", r"\d{4,}",  # Card numbers
            r"norway", r"norge",
        ]
        for pattern in remove_patterns:
            name = re.sub(pattern, "", name)

        # Remove non-alphanumeric
        name = re.sub(r"[^a-zæøå0-9\s]", "", name)

        # Collapse whitespace
        name = re.sub(r"\s+", " ", name).strip()

        return name

    def _generate_explanation(
        self,
        factors: list[MatchFactor],
        bilag: Bilag,
        transaction: BankTransaction,
    ) -> str:
        """Generate a Norwegian explanation for the match."""
        explanations = []

        for factor in factors:
            if not factor.matched:
                continue

            if factor.name == "exact_amount":
                explanations.append(f"Beløpet på kr {abs(transaction.amount):,.2f} matcher nøyaktig")
            elif factor.name == "reference_match":
                explanations.append(f"Referansen matcher bilag {bilag.bilag_number}")
            elif factor.name == "amount_tolerance":
                diff = factor.details.get("difference", 0)
                explanations.append(f"Beløpet er innenfor toleranse (avvik: kr {diff:,.2f})")
            elif factor.name == "name_similarity":
                sim = factor.details.get("similarity", 0)
                if sim >= 0.8:
                    explanations.append("Leverandørnavnet stemmer godt overens")
                else:
                    explanations.append("Leverandørnavnet ligner")
            elif factor.name == "date_proximity":
                days = factor.details.get("days_difference", 0)
                if days == 0:
                    explanations.append("Samme dato som bilag")
                elif days <= 3:
                    explanations.append(f"Dato er {days} dager fra bilag")

        if not explanations:
            return "Mulig match basert på analyse"

        return ". ".join(explanations) + "."

    async def apply_rules(
        self,
        transaction: BankTransaction,
    ) -> Optional[dict]:
        """
        Apply reconciliation rules to a transaction.

        Returns:
            Action dict if a rule matches, None otherwise
        """
        # Get active rules for this company (cached to avoid N+1 in batch loops)
        company_id = transaction.company_id
        if company_id not in self._rules_cache:
            query = select(ReconciliationRule).where(
                and_(
                    ReconciliationRule.company_id == company_id,
                    ReconciliationRule.is_active == True,
                )
            ).order_by(ReconciliationRule.priority.desc())

            result = await self.db.execute(query)
            self._rules_cache[company_id] = result.scalars().all()

        rules = self._rules_cache[company_id]

        for rule in rules:
            if rule.matches_transaction(transaction):
                return {
                    "rule_id": rule.id,
                    "rule_name": rule.name,
                    "rule_type": rule.rule_type.value,
                    "action": rule.apply_action(transaction),
                    "_rule_obj": rule,
                }

        return None

    async def auto_reconcile(
        self,
        transaction: BankTransaction,
        autonomy_level: AutonomyLevel,
    ) -> Optional[ReconciliationMatch]:
        """
        Attempt automatic reconciliation based on autonomy level.

        Args:
            transaction: Transaction to reconcile
            autonomy_level: Company's autonomy level

        Returns:
            ReconciliationMatch if auto-reconciled, None otherwise
        """
        # First, try to apply rules
        rule_action = await self.apply_rules(transaction)
        if rule_action:
            result = await self._apply_rule_action(transaction, rule_action)
            if result is not None:
                return result
            # Rule applied hints but didn't fully resolve — check if transaction
            # is already terminal (e.g. IGNORE set status to IGNORED)
            if transaction.reconciliation_status not in (
                ReconciliationStatus.UNMATCHED,
                ReconciliationStatus.SUGGESTED,
            ):
                return None
            # Otherwise fall through to bilag matching

        # Then, find matches
        candidates = await self.find_matches(transaction)

        if not candidates:
            return None

        best_match = candidates[0]

        # ── Cluster readiness assessment ──
        # Consult cluster data before making the auto-confirm decision.
        # A strong cluster can promote a MEDIUM match to auto-confirm;
        # a weak/unknown cluster can demote a HIGH match to suggested.
        from services.cluster_service import (
            get_cluster_summaries,
            compute_readiness_tier,
            score_transaction_cluster_fit,
            ReadinessTier,
        )

        clusters = await get_cluster_summaries(self.db, transaction.company_id)

        # Determine suggested account/category from rule hints or bilag
        suggested_account = transaction.suggested_account
        suggested_category = transaction.category.value if transaction.category != TransactionCategory.UKATEGORISERT else None

        readiness = compute_readiness_tier(
            transaction=transaction,
            rule_action=rule_action,
            clusters=clusters,
            bilag_match_score=best_match.total_score,
            suggested_account=suggested_account,
            suggested_category=suggested_category,
        )

        logger.info(
            f"Readiness for tx {transaction.id}: tier={readiness.tier} "
            f"({readiness.tier_label}), score={readiness.confidence_score:.3f}, "
            f"match_score={best_match.total_score:.3f}"
        )

        # ── Auto-confirm decision (cluster is MANDATORY gatekeeper) ──
        # Rules only provide hints (account/category) — they NEVER authorize
        # posting on their own. The cluster's historical confidence is the sole
        # gatekeeper for ALL auto-posting decisions:
        #   Strong cluster + high fit   → MEDIUM match is enough
        #   Strong cluster + partial fit → HIGH match required
        #   Growing cluster             → HIGH match required
        #   Weak / no cluster           → NEVER auto-post
        should_auto_confirm = False

        # Evaluate cluster support directly for this transaction
        desc_key = self._extract_key_pattern(transaction.raw_description or "")
        tx_direction = "debit" if (transaction.amount and float(transaction.amount) < 0) else "credit"

        best_cluster_fit = None
        best_cluster = None

        for cluster in clusters:
            if suggested_account and cluster.account_number != suggested_account:
                continue
            if suggested_category and cluster.category != suggested_category:
                continue

            fit = score_transaction_cluster_fit(
                desc_key, float(transaction.amount), tx_direction, cluster
            )
            if best_cluster_fit is None or fit.total_fit > best_cluster_fit.total_fit:
                best_cluster_fit = fit
                best_cluster = cluster

        if best_cluster and best_cluster_fit:
            cluster_level = best_cluster.strength_level
            fit_level = best_cluster_fit.fit_level

            if cluster_level == "strong" and fit_level == "high":
                # Strong cluster + high fit → MEDIUM match is sufficient
                should_auto_confirm = best_match.confidence in [
                    MatchConfidence.HIGH, MatchConfidence.MEDIUM
                ]
            elif cluster_level == "strong" and fit_level == "partial":
                # Strong cluster but only partial fit → require HIGH match
                should_auto_confirm = best_match.confidence == MatchConfidence.HIGH
            elif cluster_level == "growing" and fit_level in ("high", "partial"):
                # Growing cluster → only HIGH match qualifies
                should_auto_confirm = best_match.confidence == MatchConfidence.HIGH
            # else: weak cluster or no fit → should_auto_confirm stays False
        # else: no cluster found → should_auto_confirm stays False (never auto-post)

        if should_auto_confirm:
            logger.info(
                f"Cluster gatekeeper APPROVED auto-confirm for tx {transaction.id}: "
                f"cluster={best_cluster.account_number}/{best_cluster.category} "
                f"strength={best_cluster.strength_level}, fit={best_cluster_fit.fit_level}, "
                f"match={best_match.confidence.value}"
            )
        else:
            cluster_info = (
                f"cluster={best_cluster.account_number}/{best_cluster.category} "
                f"strength={best_cluster.strength_level}, fit={best_cluster_fit.fit_level}"
                if best_cluster and best_cluster_fit
                else "no cluster found"
            )
            logger.info(
                f"Cluster gatekeeper BLOCKED auto-confirm for tx {transaction.id}: "
                f"{cluster_info}, match={best_match.confidence.value}"
            )

        # Build match factors including cluster gatekeeper info
        match_factors = {
            f.name: {"score": f.score, "matched": f.matched, **f.details}
            for f in best_match.factors
        }
        match_factors["cluster_gatekeeper"] = {
            "decision": "approved" if should_auto_confirm else "blocked",
            "cluster_found": best_cluster is not None,
        }
        if best_cluster and best_cluster_fit:
            match_factors["cluster_gatekeeper"]["cluster"] = {
                "account": best_cluster.account_number,
                "category": best_cluster.category,
                "strength": best_cluster.strength,
                "strength_level": best_cluster.strength_level,
                "total_points": best_cluster.total_points,
                "overridden_count": best_cluster.overridden_count,
            }
            match_factors["cluster_gatekeeper"]["fit"] = {
                "direction": best_cluster_fit.direction_fit,
                "amount": best_cluster_fit.amount_fit,
                "description": best_cluster_fit.description_similarity,
                "total": best_cluster_fit.total_fit,
                "level": best_cluster_fit.fit_level,
            }
        # Keep readiness tier as informational metadata
        match_factors["readiness_tier"] = {
            "tier": readiness.tier,
            "tier_label": readiness.tier_label,
            "readiness_score": readiness.confidence_score,
        }

        # Create match record
        match = ReconciliationMatch(
            company_id=transaction.company_id,
            bank_transaction_id=transaction.id,
            bilag_id=best_match.bilag_id,
            match_type=MatchType.ONE_TO_ONE,
            confidence=best_match.confidence,
            confidence_score=best_match.total_score,
            status=MatchStatus.AUTO_CONFIRMED if should_auto_confirm else MatchStatus.SUGGESTED,
            transaction_amount=transaction.amount,
            matched_amount=best_match.bilag_amount,
            difference=abs(transaction.amount) - abs(best_match.bilag_amount),
            match_factors=match_factors,
            ciri_explanation=best_match.explanation,
        )

        if should_auto_confirm:
            match.confirmed_at = datetime.utcnow()
            transaction.reconciliation_status = ReconciliationStatus.MATCHED
            transaction.reconciled_at = datetime.utcnow()
            transaction.reconciled_by_ciri = True
            # Post the bilag when auto-confirmed
            bilag_result = await self.db.execute(
                select(Bilag).where(Bilag.id == best_match.bilag_id)
            )
            bilag_obj = bilag_result.scalar_one_or_none()
            if bilag_obj and bilag_obj.status != BilagStatus.POSTED:
                from services.invoice_processor import post_bilag_with_entries
                try:
                    await post_bilag_with_entries(bilag_obj, self.db)
                except Exception as e:
                    logger.warning(f"Auto-post failed for bilag {best_match.bilag_number}: {e}")
        else:
            transaction.reconciliation_status = ReconciliationStatus.SUGGESTED

        self.db.add(match)
        await self.db.flush()  # ensure match.id is available for cluster data point FK

        # Record cluster data point for auto-confirmed match (after flush so match.id exists)
        if should_auto_confirm and bilag_obj:
            from services.cluster_service import record_data_point
            from models.cluster_data_point import DataPointSource
            desc_key = self._extract_key_pattern(transaction.raw_description or "")
            tx_direction = "debit" if (transaction.amount and float(transaction.amount) < 0) else "credit"
            await record_data_point(
                self.db,
                company_id=transaction.company_id,
                account_number=bilag_obj.suggested_account or "0000",
                category=bilag_obj.category or "ukategorisert",
                merchant_name=transaction.merchant_name,
                description_key=desc_key,
                amount=float(transaction.amount),
                direction=tx_direction,
                source=DataPointSource.AUTO_CONFIRMED,
                match_id=match.id,
                transaction_id=transaction.id,
            )

        return match

    async def _apply_rule_action(
        self,
        transaction: BankTransaction,
        rule_action: dict,
    ) -> Optional[ReconciliationMatch]:
        """Apply a rule action to a transaction. Only records application when
        the rule actually changes the transaction state."""
        from services.cluster_service import record_data_point
        from models.cluster_data_point import DataPointSource

        action = rule_action["action"]
        rule_type = rule_action["rule_type"]
        rule_obj = rule_action.get("_rule_obj")

        if rule_type == "ignore":
            # Mark as private/ignored — this changes state, so record it
            transaction.is_private = action.get("mark_private", True)
            transaction.private_marked_at = datetime.utcnow()
            transaction.private_marked_by_ciri = True
            transaction.reconciliation_status = ReconciliationStatus.IGNORED
            if rule_obj:
                rule_obj.record_application()
                # Record cluster data point for successful rule application
                desc_key = self._extract_key_pattern(transaction.raw_description or "")
                tx_direction = "debit" if (transaction.amount and float(transaction.amount) < 0) else "credit"
                await record_data_point(
                    self.db,
                    company_id=transaction.company_id,
                    account_number=action.get("account", "0000"),
                    category=action.get("category", "privat"),
                    merchant_name=transaction.merchant_name,
                    description_key=desc_key,
                    amount=float(transaction.amount) if transaction.amount else 0,
                    direction=tx_direction,
                    source=DataPointSource.RULE_APPLIED,
                    rule_id=rule_obj.id,
                    transaction_id=transaction.id,
                )
            return None

        if rule_type == "auto_category":
            # Apply category — this changes state, so record it
            applied = False
            category = action.get("category")
            if category:
                try:
                    transaction.category = TransactionCategory(category)
                    applied = True
                except ValueError:
                    pass

            account = action.get("account")
            if account:
                transaction.suggested_account = account
                applied = True

            if applied and rule_obj:
                rule_obj.record_application()
                # Record cluster data point for successful rule application
                desc_key = self._extract_key_pattern(transaction.raw_description or "")
                tx_direction = "debit" if (transaction.amount and float(transaction.amount) < 0) else "credit"
                await record_data_point(
                    self.db,
                    company_id=transaction.company_id,
                    account_number=account or "0000",
                    category=category or "ukategorisert",
                    merchant_name=transaction.merchant_name,
                    description_key=desc_key,
                    amount=float(transaction.amount) if transaction.amount else 0,
                    direction=tx_direction,
                    source=DataPointSource.RULE_APPLIED,
                    rule_id=rule_obj.id,
                    transaction_id=transaction.id,
                )

            # Still needs bilag matching
            return None

        # auto_match rules: apply category/account hints but don't count as
        # a full "application" since we can't actually create a match without a bilag
        if rule_type == "auto_match":
            category = action.get("category")
            if category:
                try:
                    transaction.category = TransactionCategory(category)
                except ValueError:
                    pass
            account = action.get("account")
            if account:
                transaction.suggested_account = account
            # Don't record_application — the rule hasn't fully resolved the transaction
            return None

        return None

    async def learn_from_feedback(
        self,
        match: ReconciliationMatch,
        feedback: str,
        correct_bilag_id: Optional[uuid.UUID] = None,
        reject_reason: Optional[str] = None,
    ) -> Optional[ReconciliationRule]:
        """
        Learn from user feedback on a match.

        Creates rules only when appropriate based on the structured reject reason:
        - private_expense → IGNORE rule (mark as private)
        - wrong_match / wrong_amount → no rule (Ciri got pairing wrong, not the transaction type)
        - duplicate → no rule needed
        - other → no rule (just logged as feedback)
        """
        # Get the transaction
        query = select(BankTransaction).where(BankTransaction.id == match.bank_transaction_id)
        result = await self.db.execute(query)
        transaction = result.scalar_one_or_none()

        if not transaction:
            return None

        # Prefer merchant_name for rule criteria (see learn_from_confirmation)
        if transaction.merchant_name and len(transaction.merchant_name) > 2:
            key_pattern = transaction.merchant_name.upper().split()[0]
        else:
            key_pattern = self._extract_key_pattern(transaction.raw_description)

        # CASE 1: PRIVATE EXPENSE — create IGNORE rule
        if reject_reason == "private_expense":
            rule = ReconciliationRule(
                company_id=transaction.company_id,
                name=f"Ignorer: {transaction.merchant_name or key_pattern}",
                description=f"Markert som privat utgift av bruker. {feedback}".strip(),
                rule_type=RuleType.IGNORE,
                criteria={"description_contains": key_pattern},
                action={"mark_private": True, "reason": feedback or "Privat utgift"},
                learned_from_user=True,
                source_match_id=match.id,
            )
            self.db.add(rule)
            return rule

        # CASE 2: WRONG MATCH / WRONG AMOUNT — no rule (Ciri got the pairing wrong)
        if reject_reason in ("wrong_match", "wrong_amount"):
            return None

        # CASE 3: DUPLICATE — no rule needed
        if reject_reason == "duplicate":
            return None

        # CASE 4: OTHER / no reason — no rule, feedback is stored on the match itself
        return None

    async def learn_from_confirmation(
        self,
        match: ReconciliationMatch,
        feedback: Optional[str] = None,
    ) -> Optional[ReconciliationRule]:
        """Create a positive AUTO_MATCH rule when user confirms a match."""
        transaction = (await self.db.execute(
            select(BankTransaction).where(BankTransaction.id == match.bank_transaction_id)
        )).scalar_one_or_none()
        if not transaction:
            return None

        # Prefer merchant_name for the rule criteria — it's already cleaned
        # by the bank/Tink and identifies the actual company, not the
        # transaction type (e.g. "Subsea 7" instead of "BETALING").
        if transaction.merchant_name and len(transaction.merchant_name) > 2:
            key_pattern = transaction.merchant_name.upper().split()[0]
        else:
            key_pattern = self._extract_key_pattern(transaction.raw_description)

        # Check if a similar rule already exists
        existing = await self.db.execute(
            select(ReconciliationRule).where(
                and_(
                    ReconciliationRule.company_id == transaction.company_id,
                    ReconciliationRule.rule_type.in_([RuleType.AUTO_MATCH, RuleType.AUTO_CATEGORY]),
                    ReconciliationRule.is_active == True,
                )
            )
        )
        for rule in existing.scalars():
            if rule.criteria.get("description_contains", "").upper() == key_pattern.upper():
                # Existing rule covers this — just bump times_applied
                rule.record_application()
                return rule

        # Get bilag info for category/account hints
        bilag = None
        if match.bilag_id:
            bilag = (await self.db.execute(
                select(Bilag).where(Bilag.id == match.bilag_id)
            )).scalar_one_or_none()

        # Build action based on available info
        action: dict = {}
        if bilag and hasattr(bilag, "suggested_account") and bilag.suggested_account:
            action["account"] = bilag.suggested_account
        if bilag and hasattr(bilag, "category") and bilag.category:
            action["category"] = bilag.category

        rule = ReconciliationRule(
            company_id=transaction.company_id,
            name=f"Auto-match: {transaction.merchant_name or key_pattern}",
            description=f"Lært fra brukerbekreftelse. {feedback or ''}".strip(),
            rule_type=RuleType.AUTO_MATCH,
            criteria={"description_contains": key_pattern},
            action=action if action else {"auto_match": True},
            learned_from_user=True,
            source_match_id=match.id,
            confidence_threshold=0.6,
        )
        self.db.add(rule)
        return rule

    def _extract_key_pattern(self, description: str) -> str:
        """Extract a key pattern from a description for rule matching."""
        return ReconciliationMatcher._extract_key_pattern_static(description)

    # Generic Norwegian banking terms that should never be used as key patterns.
    # These appear in raw descriptions but identify the transaction TYPE, not the merchant.
    _STOPWORDS = {
        # Transaction types
        "BETALING", "OVERFØRING", "OVERFORSEL", "INNBETALING", "UTBETALING",
        "TILBAKEBETALING", "AVTALEGIRO", "EFAKTURA", "FAKTURA", "FAKTURABETALING",
        "NETTGIRO", "MOBILBETALING", "AUTOTREKK", "TREKK", "GEBYR",
        "FORSIKRING", "HUSLEIE", "STRØM", "ABONNEMENT",
        # Interest/fees
        "RENTER", "RENTE", "KREDITRENTE", "DEBETRENTE",
        # Prepositions / filler
        "FRA", "TIL", "FOR", "VED", "MED", "OG", "AVD", "KTO", "KONTO",
        # Time words
        "DATO", "PERIODE", "MÅNED", "TERMIN",
        "JANUAR", "FEBRUAR", "MARS", "APRIL", "MAI", "JUNI",
        "JULI", "AUGUST", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
        "JAN", "FEB", "MAR", "APR", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DES",
        # Payroll / tax
        "LØNN", "SKATTETREKK", "FERIEPENGER", "ARBEIDSGIVERAVGIFT",
        "MVA", "MOMS", "AVGIFT",
        # Currencies
        "NOK", "USD", "EUR", "SEK", "DKK", "GBP",
    }

    @staticmethod
    def _extract_key_pattern_static(description: str) -> str:
        """Extract a key pattern from a description for rule matching (static version).

        Skips generic banking stopwords to find the actual merchant/company name.
        """
        desc = description.upper()

        # Remove common transaction prefixes
        for prefix in ["VIPPS*", "VIPPS ", "KORTBETALING ", "NETTBANK ", "GIRO ",
                        "NETTGIRO ", "AVTALEGIRO ", "MOBILEPAY*", "MOBILEPAY "]:
            if desc.startswith(prefix):
                desc = desc[len(prefix):]

        # Take first significant word that isn't a stopword or number
        words = desc.split()
        if words:
            key_words = [
                w for w in words[:5]
                if not w.isdigit()
                and len(w) > 2
                and w not in ReconciliationMatcher._STOPWORDS
            ]
            if key_words:
                return key_words[0]

        return desc[:20]


# Factory function
def create_matcher(db: AsyncSession) -> ReconciliationMatcher:
    """Create a reconciliation matcher instance."""
    return ReconciliationMatcher(db)
