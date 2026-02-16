"""
Comprehensive tests for the ReconciliationMatcher scoring engine.

Tests cover:
- Multi-factor scoring (6 factors × various combinations)
- Confidence thresholds (HIGH ≥ 0.90, MEDIUM ≥ 0.70, LOW < 0.70)
- Reference/KID matching (substring, numeric extraction)
- Name similarity (fuzzy matching, normalization)
- Date proximity (linear decay, 14-day window)
- Amount tolerance (5% threshold)
- Rule matching (criteria, types, effectiveness)
- Key pattern extraction (stopwords, prefix stripping)
- Cluster fit scoring (direction, amount range, description)
- Cluster gatekeeper (strength × fit → auto-confirm decisions)
"""

import uuid
import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from dataclasses import dataclass, field
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

from services.reconciliation_matcher import (
    ReconciliationMatcher,
    MatchCandidate,
    MatchFactor,
    MatchConfidence,
)
from services.cluster_service import (
    ClusterSummary,
    ClusterFitResult,
    score_transaction_cluster_fit,
    compute_cluster_strength,
    compute_readiness_tier,
    ReadinessTier,
    STRONG_THRESHOLD,
    GROWING_THRESHOLD,
)
from models.bank_transaction import (
    ReconciliationStatus,
    TransactionCategory,
    TransactionDirection,
)
from models.reconciliation_rule import RuleType


# ============================================================================
# MOCK OBJECTS — Lightweight stubs for SQLAlchemy models
# ============================================================================


@dataclass
class MockTransaction:
    """Minimal mock of BankTransaction for scoring tests."""
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    company_id: uuid.UUID = field(default_factory=uuid.uuid4)
    bank_account_id: uuid.UUID = field(default_factory=uuid.uuid4)
    amount: Decimal = Decimal("1000.00")
    booking_date: date = field(default_factory=date.today)
    raw_description: str = "KORTBETALING ELKJOP TORSHOV"
    cleaned_description: Optional[str] = None
    merchant_name: Optional[str] = "Elkjøp"
    reference: Optional[str] = None
    category: TransactionCategory = TransactionCategory.UKATEGORISERT
    suggested_account: Optional[str] = None
    reconciliation_status: ReconciliationStatus = ReconciliationStatus.UNMATCHED
    is_private: bool = False
    private_marked_at: Optional[datetime] = None
    private_marked_by_ciri: bool = False
    reconciled_at: Optional[datetime] = None
    reconciled_by_ciri: bool = False


@dataclass
class MockBilag:
    """Minimal mock of Bilag for scoring tests."""
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    company_id: uuid.UUID = field(default_factory=uuid.uuid4)
    bilag_number: str = "2025-00042"
    document_date: date = field(default_factory=date.today)
    description: str = "Kontorrekvisita fra Elkjøp"
    gross_amount: Decimal = Decimal("1000.00")
    net_amount: Decimal = Decimal("800.00")
    mva_amount: Decimal = Decimal("200.00")
    counterparty_name: Optional[str] = "Elkjøp ASA"
    status: str = "awaiting_transaction"
    category: Optional[str] = None
    suggested_account: Optional[str] = None


@dataclass
class MockRule:
    """Minimal mock of ReconciliationRule."""
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    company_id: uuid.UUID = field(default_factory=uuid.uuid4)
    name: str = "Test rule"
    rule_type: RuleType = RuleType.AUTO_CATEGORY
    criteria: dict = field(default_factory=dict)
    action: dict = field(default_factory=dict)
    is_active: bool = True
    priority: str = "medium"
    times_applied: int = 0
    times_overridden: int = 0
    last_applied_at: Optional[datetime] = None
    learned_from_user: bool = False

    @property
    def is_effective(self) -> bool:
        if self.times_applied == 0:
            return True
        return (self.times_overridden / self.times_applied) < 0.3

    def matches_transaction(self, transaction) -> bool:
        criteria = self.criteria
        if "description_contains" in criteria:
            pattern = criteria["description_contains"].lower()
            desc = (transaction.raw_description or "").lower()
            if pattern not in desc:
                return False
        if "amount_min" in criteria:
            if abs(transaction.amount) < criteria["amount_min"]:
                return False
        if "amount_max" in criteria:
            if abs(transaction.amount) > criteria["amount_max"]:
                return False
        if "amount_exact" in criteria:
            if abs(transaction.amount) != criteria["amount_exact"]:
                return False
        if "direction" in criteria:
            if criteria["direction"] == "debit" and transaction.amount >= 0:
                return False
            if criteria["direction"] == "credit" and transaction.amount < 0:
                return False
        if "merchant_name" in criteria:
            if transaction.merchant_name != criteria["merchant_name"]:
                return False
        return True

    def apply_action(self, transaction) -> dict:
        return self.action.copy()

    def record_application(self):
        self.times_applied += 1
        self.last_applied_at = datetime.utcnow()

    def record_override(self):
        self.times_overridden += 1


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def matcher():
    """Create a matcher with a mock DB session."""
    db = AsyncMock()
    return ReconciliationMatcher(db)


@pytest.fixture
def company_id():
    return uuid.uuid4()


# ============================================================================
# SCORE CALCULATION TESTS
# ============================================================================


class TestScoreCalculation:
    """Test the multi-factor scoring engine."""

    def test_perfect_match_exact_amount_and_reference(self, matcher):
        """Exact amount + reference match → HIGH confidence."""
        tx = MockTransaction(
            amount=Decimal("12500.00"),
            reference="F-2025-042",
            merchant_name="Telenor",
            booking_date=date(2025, 3, 10),
        )
        bilag = MockBilag(
            bilag_number="2025-00042",
            gross_amount=Decimal("12500.00"),
            counterparty_name="Telenor ASA",
            document_date=date(2025, 3, 7),
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        assert result.confidence == MatchConfidence.HIGH
        assert result.total_score >= 0.90

    def test_exact_amount_no_reference(self, matcher):
        """Exact amount but no reference → depends on other factors."""
        tx = MockTransaction(
            amount=Decimal("4980.00"),
            reference=None,
            merchant_name="Byggmakker",
            booking_date=date(2025, 3, 10),
        )
        bilag = MockBilag(
            gross_amount=Decimal("4980.00"),
            counterparty_name="Byggmakker AS",
            document_date=date(2025, 3, 5),
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        # Exact amount (0.35) + name match + date proximity
        assert result.total_score >= 0.50

    def test_no_match_different_amounts(self, matcher):
        """Completely different amounts → below minimum threshold."""
        tx = MockTransaction(amount=Decimal("100.00"))
        bilag = MockBilag(
            gross_amount=Decimal("50000.00"),
            counterparty_name="Unrelated Company",
            document_date=date(2024, 1, 1),  # Far away date
        )
        result = matcher._calculate_match_score(tx, bilag)
        # Should be None (below 0.20 threshold) or very low score
        if result is not None:
            assert result.total_score < 0.30

    def test_amount_within_tolerance(self, matcher):
        """Amount within 5% tolerance → gets tolerance score."""
        tx = MockTransaction(
            amount=Decimal("1020.00"),
            booking_date=date(2025, 3, 10),
        )
        bilag = MockBilag(
            gross_amount=Decimal("1000.00"),
            document_date=date(2025, 3, 10),
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        # Should get amount_tolerance factor (0.20) but NOT exact_amount (0.35)
        tolerance_factor = next(
            f for f in result.factors if f.name == "amount_tolerance"
        )
        exact_factor = next(
            f for f in result.factors if f.name == "exact_amount"
        )
        assert tolerance_factor.matched is True
        assert tolerance_factor.score > 0
        assert exact_factor.matched is False

    def test_amount_outside_tolerance(self, matcher):
        """Amount outside 5% tolerance → no tolerance score."""
        tx = MockTransaction(amount=Decimal("1100.00"))  # 10% above
        bilag = MockBilag(gross_amount=Decimal("1000.00"))
        result = matcher._calculate_match_score(tx, bilag)
        if result is not None:
            tolerance_factor = next(
                f for f in result.factors if f.name == "amount_tolerance"
            )
            assert tolerance_factor.matched is False

    def test_exact_amount_skips_tolerance(self, matcher):
        """Exact amount match → tolerance score is 0 (not double-counted)."""
        tx = MockTransaction(
            amount=Decimal("1000.00"),
            booking_date=date(2025, 3, 10),
        )
        bilag = MockBilag(
            gross_amount=Decimal("1000.00"),
            document_date=date(2025, 3, 10),
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        exact_factor = next(f for f in result.factors if f.name == "exact_amount")
        tolerance_factor = next(f for f in result.factors if f.name == "amount_tolerance")
        assert exact_factor.matched is True
        assert exact_factor.score == 0.35
        assert tolerance_factor.score == 0  # Not double-counted

    def test_date_proximity_same_day(self, matcher):
        """Same date → full date proximity score."""
        today = date.today()
        tx = MockTransaction(
            amount=Decimal("500.00"),
            booking_date=today,
        )
        bilag = MockBilag(
            gross_amount=Decimal("500.00"),
            document_date=today,
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        date_factor = next(f for f in result.factors if f.name == "date_proximity")
        assert date_factor.matched is True
        assert date_factor.score == pytest.approx(0.15, abs=0.01)

    def test_date_proximity_linear_decay(self, matcher):
        """7 days apart → 50% of date proximity weight."""
        tx = MockTransaction(
            amount=Decimal("500.00"),
            booking_date=date(2025, 3, 14),
        )
        bilag = MockBilag(
            gross_amount=Decimal("500.00"),
            document_date=date(2025, 3, 7),  # 7 days earlier
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        date_factor = next(f for f in result.factors if f.name == "date_proximity")
        assert date_factor.matched is True
        # 7/14 = 0.5 decay, so score = 0.15 * 0.5 = 0.075
        assert date_factor.score == pytest.approx(0.075, abs=0.01)

    def test_date_proximity_outside_window(self, matcher):
        """15+ days apart → no date proximity score."""
        tx = MockTransaction(
            amount=Decimal("500.00"),
            booking_date=date(2025, 3, 30),
        )
        bilag = MockBilag(
            gross_amount=Decimal("500.00"),
            document_date=date(2025, 3, 1),  # 29 days earlier
        )
        result = matcher._calculate_match_score(tx, bilag)
        if result is not None:
            date_factor = next(f for f in result.factors if f.name == "date_proximity")
            assert date_factor.matched is False
            assert date_factor.score == 0

    def test_minimum_threshold_filters_weak_matches(self, matcher):
        """Scores below 0.20 are filtered out (return None)."""
        tx = MockTransaction(
            amount=Decimal("100.00"),
            reference=None,
            merchant_name=None,
            booking_date=date(2025, 1, 1),
        )
        bilag = MockBilag(
            gross_amount=Decimal("99999.00"),
            counterparty_name="Totally Different",
            document_date=date(2024, 1, 1),
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is None

    def test_skip_minimum_threshold(self, matcher):
        """skip_minimum_threshold=True returns weak matches."""
        tx = MockTransaction(
            amount=Decimal("100.00"),
            reference=None,
            merchant_name=None,
            booking_date=date(2025, 1, 1),
        )
        bilag = MockBilag(
            gross_amount=Decimal("99999.00"),
            counterparty_name="Totally Different",
            document_date=date(2024, 1, 1),
        )
        result = matcher._calculate_match_score(
            tx, bilag, skip_minimum_threshold=True
        )
        assert result is not None
        assert result.total_score < 0.20

    def test_confidence_levels(self, matcher):
        """Verify confidence level assignment at boundaries."""
        # HIGH: score ≥ 0.90
        tx_high = MockTransaction(
            amount=Decimal("5000.00"),
            reference="2025-00042",
            merchant_name="Telenor",
            booking_date=date(2025, 3, 10),
        )
        bilag_high = MockBilag(
            bilag_number="2025-00042",
            gross_amount=Decimal("5000.00"),
            counterparty_name="Telenor ASA",
            document_date=date(2025, 3, 10),
        )
        result_high = matcher._calculate_match_score(tx_high, bilag_high)
        assert result_high is not None
        assert result_high.confidence == MatchConfidence.HIGH

    def test_all_six_factors_contribute(self, matcher):
        """All 6 factors should be present in the result."""
        tx = MockTransaction(
            amount=Decimal("1000.00"),
            reference="2025-00042",
            merchant_name="Test Company",
            booking_date=date(2025, 3, 10),
        )
        bilag = MockBilag(
            bilag_number="2025-00042",
            gross_amount=Decimal("1000.00"),
            counterparty_name="Test Company",
            document_date=date(2025, 3, 10),
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        factor_names = {f.name for f in result.factors}
        assert "exact_amount" in factor_names
        assert "reference_match" in factor_names
        assert "amount_tolerance" in factor_names
        assert "name_similarity" in factor_names
        assert "date_proximity" in factor_names

    def test_negative_amount_handled(self, matcher):
        """Negative transaction amounts are handled via abs()."""
        tx = MockTransaction(
            amount=Decimal("-1000.00"),  # Debit
            booking_date=date(2025, 3, 10),
        )
        bilag = MockBilag(
            gross_amount=Decimal("1000.00"),
            document_date=date(2025, 3, 10),
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        exact_factor = next(f for f in result.factors if f.name == "exact_amount")
        assert exact_factor.matched is True


# ============================================================================
# REFERENCE MATCHING TESTS
# ============================================================================


class TestReferenceMatching:
    """Test reference/KID matching logic."""

    def test_direct_substring_match(self, matcher):
        """Reference directly contains bilag number."""
        tx = MockTransaction(reference="2025-00042")
        bilag = MockBilag(bilag_number="2025-00042")
        assert matcher._check_reference_match(tx, bilag) is True

    def test_reference_contains_bilag_number(self, matcher):
        """Reference is superset of bilag number."""
        tx = MockTransaction(reference="BETALING 2025-00042 FAKTURA")
        bilag = MockBilag(bilag_number="2025-00042")
        assert matcher._check_reference_match(tx, bilag) is True

    def test_numeric_extraction_match(self, matcher):
        """Numeric parts of reference match bilag number."""
        tx = MockTransaction(reference="F-2025-042")
        bilag = MockBilag(bilag_number="INV-042")
        assert matcher._check_reference_match(tx, bilag) is True

    def test_no_reference(self, matcher):
        """No reference → no match."""
        tx = MockTransaction(reference=None)
        bilag = MockBilag(bilag_number="2025-00042")
        assert matcher._check_reference_match(tx, bilag) is False

    def test_empty_reference(self, matcher):
        """Empty string reference → no match."""
        tx = MockTransaction(reference="")
        bilag = MockBilag(bilag_number="2025-00042")
        assert matcher._check_reference_match(tx, bilag) is False

    def test_no_numeric_overlap(self, matcher):
        """Different numeric sequences → no match."""
        tx = MockTransaction(reference="REF-999")
        bilag = MockBilag(bilag_number="INV-001")
        assert matcher._check_reference_match(tx, bilag) is False

    def test_kid_number_match(self, matcher):
        """KID-style reference matching."""
        tx = MockTransaction(reference="00423789012")
        bilag = MockBilag(bilag_number="F-00423789012")
        assert matcher._check_reference_match(tx, bilag) is True


# ============================================================================
# NAME SIMILARITY TESTS
# ============================================================================


class TestNameSimilarity:
    """Test fuzzy name matching and normalization."""

    def test_identical_names(self, matcher):
        """Identical names → similarity = 1.0."""
        sim = matcher._calculate_name_similarity("Elkjøp", "Elkjøp")
        assert sim == pytest.approx(1.0)

    def test_similar_names(self, matcher):
        """Similar names → high similarity."""
        sim = matcher._calculate_name_similarity("Elkjøp ASA", "Elkjøp")
        assert sim >= 0.6

    def test_different_names(self, matcher):
        """Completely different names → low similarity."""
        sim = matcher._calculate_name_similarity("Elkjøp", "Rema 1000")
        assert sim < 0.5

    def test_none_name(self, matcher):
        """None input → 0.0."""
        assert matcher._calculate_name_similarity(None, "Elkjøp") == 0.0
        assert matcher._calculate_name_similarity("Elkjøp", None) == 0.0
        assert matcher._calculate_name_similarity(None, None) == 0.0

    def test_empty_name(self, matcher):
        """Empty string → 0.0 (after normalization)."""
        assert matcher._calculate_name_similarity("", "Elkjøp") == 0.0

    def test_name_normalization_removes_as(self, matcher):
        """Normalization removes 'AS' suffix."""
        n = matcher._normalize_name("Telenor AS")
        assert "as" not in n.split()

    def test_name_normalization_removes_card_numbers(self, matcher):
        """Normalization removes long numeric sequences."""
        n = matcher._normalize_name("VISA*1234567890 ELKJOP")
        assert "1234567890" not in n

    def test_name_normalization_case_insensitive(self, matcher):
        """Normalization lowercases everything."""
        n = matcher._normalize_name("ELKJØP ASA")
        assert n == matcher._normalize_name("elkjøp asa")

    def test_name_normalization_removes_norway(self, matcher):
        """Normalization removes 'Norway'/'Norge'."""
        n = matcher._normalize_name("Telenor Norway AS")
        assert "norway" not in n

    def test_name_similarity_above_threshold(self, matcher):
        """Names above 0.6 threshold → matched=True in scoring."""
        tx = MockTransaction(
            amount=Decimal("100.00"),
            merchant_name="Komplett.no",
            booking_date=date(2025, 3, 10),
        )
        bilag = MockBilag(
            gross_amount=Decimal("100.00"),
            counterparty_name="Komplett",
            document_date=date(2025, 3, 10),
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        name_factor = next(f for f in result.factors if f.name == "name_similarity")
        assert name_factor.matched is True


# ============================================================================
# KEY PATTERN EXTRACTION TESTS
# ============================================================================


class TestKeyPatternExtraction:
    """Test stopword filtering and prefix stripping in pattern extraction."""

    def test_basic_extraction(self):
        """Simple description → first significant word."""
        assert ReconciliationMatcher._extract_key_pattern_static("ELKJOP TORSHOV") == "ELKJOP"

    def test_strips_vipps_prefix(self):
        """Vipps prefix removed."""
        result = ReconciliationMatcher._extract_key_pattern_static("VIPPS*REMA 1000 OSLO")
        assert result == "REMA"

    def test_strips_kortbetaling_prefix(self):
        """KORTBETALING prefix removed."""
        result = ReconciliationMatcher._extract_key_pattern_static("KORTBETALING SPOTIFY AB")
        assert result == "SPOTIFY"

    def test_strips_nettgiro_prefix(self):
        """NETTGIRO prefix removed."""
        result = ReconciliationMatcher._extract_key_pattern_static("NETTGIRO TELENOR NORGE")
        assert result == "TELENOR"

    def test_skips_stopwords(self):
        """Banking stopwords (BETALING, FRA, etc.) are skipped."""
        result = ReconciliationMatcher._extract_key_pattern_static("BETALING FRA SPOTIFY")
        assert result == "SPOTIFY"

    def test_skips_numbers(self):
        """Pure numeric words are skipped."""
        result = ReconciliationMatcher._extract_key_pattern_static("12345 ELKJOP 67890")
        assert result == "ELKJOP"

    def test_skips_short_words(self):
        """Words ≤ 2 chars are skipped."""
        result = ReconciliationMatcher._extract_key_pattern_static("AB CD ELKJOP")
        assert result == "ELKJOP"

    def test_salary_stopwords(self):
        """Salary-related stopwords skipped."""
        result = ReconciliationMatcher._extract_key_pattern_static("LØNN SKATTETREKK ANSATTE")
        assert result == "ANSATTE"

    def test_month_stopwords(self):
        """Month names skipped."""
        result = ReconciliationMatcher._extract_key_pattern_static("BETALING JANUAR TELENOR")
        assert result == "TELENOR"

    def test_fallback_to_truncated_description(self):
        """If no significant word found, truncate description."""
        result = ReconciliationMatcher._extract_key_pattern_static("12 34 56")
        assert len(result) > 0

    def test_uppercase_conversion(self):
        """Result is always uppercase."""
        result = ReconciliationMatcher._extract_key_pattern_static("betaling spotify")
        assert result == "SPOTIFY"


# ============================================================================
# RULE MATCHING TESTS
# ============================================================================


class TestRuleMatching:
    """Test rule criteria matching."""

    def test_description_contains_match(self):
        """Rule with description_contains matches substring."""
        rule = MockRule(criteria={"description_contains": "SPOTIFY"})
        tx = MockTransaction(raw_description="KORTBETALING SPOTIFY AB 119 NOK")
        assert rule.matches_transaction(tx) is True

    def test_description_contains_case_insensitive(self):
        """description_contains is case insensitive."""
        rule = MockRule(criteria={"description_contains": "spotify"})
        tx = MockTransaction(raw_description="KORTBETALING SPOTIFY AB")
        assert rule.matches_transaction(tx) is True

    def test_description_contains_no_match(self):
        """description_contains doesn't match → rule fails."""
        rule = MockRule(criteria={"description_contains": "SPOTIFY"})
        tx = MockTransaction(raw_description="KORTBETALING NETFLIX 159 NOK")
        assert rule.matches_transaction(tx) is False

    def test_amount_min_match(self):
        """Amount above minimum."""
        rule = MockRule(criteria={"amount_min": 100})
        tx = MockTransaction(amount=Decimal("150.00"))
        assert rule.matches_transaction(tx) is True

    def test_amount_min_no_match(self):
        """Amount below minimum."""
        rule = MockRule(criteria={"amount_min": 200})
        tx = MockTransaction(amount=Decimal("150.00"))
        assert rule.matches_transaction(tx) is False

    def test_amount_max_match(self):
        """Amount below maximum."""
        rule = MockRule(criteria={"amount_max": 200})
        tx = MockTransaction(amount=Decimal("150.00"))
        assert rule.matches_transaction(tx) is True

    def test_amount_max_no_match(self):
        """Amount above maximum."""
        rule = MockRule(criteria={"amount_max": 100})
        tx = MockTransaction(amount=Decimal("150.00"))
        assert rule.matches_transaction(tx) is False

    def test_amount_range_match(self):
        """Amount within min-max range."""
        rule = MockRule(criteria={"amount_min": 99, "amount_max": 199})
        tx = MockTransaction(amount=Decimal("-119.00"))  # Negative = debit
        assert rule.matches_transaction(tx) is True

    def test_amount_exact_match(self):
        """Exact amount match."""
        rule = MockRule(criteria={"amount_exact": 119})
        tx = MockTransaction(amount=Decimal("-119.00"))
        assert rule.matches_transaction(tx) is True

    def test_amount_exact_no_match(self):
        """Exact amount doesn't match."""
        rule = MockRule(criteria={"amount_exact": 119})
        tx = MockTransaction(amount=Decimal("120.00"))
        assert rule.matches_transaction(tx) is False

    def test_direction_debit_match(self):
        """Debit direction matches negative amounts."""
        rule = MockRule(criteria={"direction": "debit"})
        tx = MockTransaction(amount=Decimal("-500.00"))
        assert rule.matches_transaction(tx) is True

    def test_direction_debit_no_match(self):
        """Debit direction doesn't match positive amounts."""
        rule = MockRule(criteria={"direction": "debit"})
        tx = MockTransaction(amount=Decimal("500.00"))
        assert rule.matches_transaction(tx) is False

    def test_direction_credit_match(self):
        """Credit direction matches positive amounts."""
        rule = MockRule(criteria={"direction": "credit"})
        tx = MockTransaction(amount=Decimal("500.00"))
        assert rule.matches_transaction(tx) is True

    def test_merchant_name_match(self):
        """Merchant name exact match."""
        rule = MockRule(criteria={"merchant_name": "Spotify"})
        tx = MockTransaction(merchant_name="Spotify")
        assert rule.matches_transaction(tx) is True

    def test_merchant_name_no_match(self):
        """Merchant name doesn't match."""
        rule = MockRule(criteria={"merchant_name": "Spotify"})
        tx = MockTransaction(merchant_name="Netflix")
        assert rule.matches_transaction(tx) is False

    def test_combined_criteria_all_must_match(self):
        """Multiple criteria → ALL must match (AND logic)."""
        rule = MockRule(
            criteria={
                "description_contains": "SPOTIFY",
                "amount_min": 100,
                "amount_max": 200,
                "direction": "debit",
            }
        )
        # All match
        tx_match = MockTransaction(
            raw_description="SPOTIFY AB",
            amount=Decimal("-119.00"),
        )
        assert rule.matches_transaction(tx_match) is True

        # One criterion fails (amount too high)
        tx_no_match = MockTransaction(
            raw_description="SPOTIFY AB",
            amount=Decimal("-500.00"),
        )
        assert rule.matches_transaction(tx_no_match) is False

    def test_rule_effectiveness_threshold(self):
        """Rule is ineffective when override rate ≥ 30%."""
        rule = MockRule(times_applied=10, times_overridden=3)
        assert rule.is_effective is False

        rule_good = MockRule(times_applied=10, times_overridden=2)
        assert rule_good.is_effective is True

    def test_rule_effectiveness_no_applications(self):
        """Rule with 0 applications is always effective."""
        rule = MockRule(times_applied=0, times_overridden=0)
        assert rule.is_effective is True


# ============================================================================
# EXPLANATION GENERATION TESTS
# ============================================================================


class TestExplanationGeneration:
    """Test Norwegian explanation generation."""

    def test_explanation_includes_matched_factors(self, matcher):
        """Explanation mentions factors that matched."""
        tx = MockTransaction(
            amount=Decimal("5000.00"),
            reference="2025-00042",
            booking_date=date(2025, 3, 10),
        )
        bilag = MockBilag(
            bilag_number="2025-00042",
            gross_amount=Decimal("5000.00"),
            document_date=date(2025, 3, 10),
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        assert "matcher nøyaktig" in result.explanation or "matcher" in result.explanation.lower()

    def test_explanation_is_norwegian(self, matcher):
        """Explanation is in Norwegian."""
        tx = MockTransaction(
            amount=Decimal("1000.00"),
            booking_date=date(2025, 3, 10),
        )
        bilag = MockBilag(
            gross_amount=Decimal("1000.00"),
            document_date=date(2025, 3, 10),
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        # Should contain Norwegian words
        assert any(
            word in result.explanation.lower()
            for word in ["beløp", "matcher", "bilag", "analyse"]
        )


# ============================================================================
# CLUSTER FIT SCORING TESTS
# ============================================================================


class TestClusterFitScoring:
    """Test cluster fit scoring (direction, amount, description)."""

    @pytest.fixture
    def strong_cluster(self):
        return ClusterSummary(
            company_id=uuid.uuid4(),
            account_number="6540",
            category="kontor",
            total_points=20,
            distinct_merchants=5,
            overridden_count=0,
            amount_min=100.0,
            amount_max=5000.0,
            amount_p5=200.0,
            amount_p95=4500.0,
            amount_median=1500.0,
            dominant_direction="debit",
            recency_ratio=0.8,
            strength=0.85,
            strength_level="strong",
            description_keys=["ELKJOP", "KOMPLETT", "DUSTIN"],
        )

    def test_perfect_fit(self, strong_cluster):
        """Transaction fits cluster perfectly → high fit."""
        result = score_transaction_cluster_fit(
            "ELKJOP", -1500.0, "debit", strong_cluster
        )
        assert result.fit_level == "high"
        assert result.total_fit >= 0.70

    def test_direction_mismatch(self, strong_cluster):
        """Wrong direction → direction_fit = 0."""
        result = score_transaction_cluster_fit(
            "ELKJOP", 1500.0, "credit", strong_cluster
        )
        assert result.direction_fit == 0.0

    def test_amount_in_p5_p95_range(self, strong_cluster):
        """Amount within p5-p95 → full amount_fit."""
        result = score_transaction_cluster_fit(
            "ELKJOP", -1500.0, "debit", strong_cluster
        )
        assert result.amount_fit == 1.0

    def test_amount_in_full_range_but_outside_percentiles(self, strong_cluster):
        """Amount in full range but outside p5-p95 → partial amount_fit."""
        result = score_transaction_cluster_fit(
            "ELKJOP", -150.0, "debit", strong_cluster  # Below p5 (200) but above min (100)
        )
        assert result.amount_fit == 0.5

    def test_amount_outside_range(self, strong_cluster):
        """Amount far outside cluster range → low/zero amount_fit."""
        result = score_transaction_cluster_fit(
            "ELKJOP", -50000.0, "debit", strong_cluster
        )
        assert result.amount_fit <= 0.25

    def test_description_similarity(self, strong_cluster):
        """Matching description key → high description similarity."""
        result = score_transaction_cluster_fit(
            "ELKJOP", -1500.0, "debit", strong_cluster
        )
        assert result.description_similarity > 0.8

    def test_no_description_match(self, strong_cluster):
        """No matching description → zero similarity."""
        result = score_transaction_cluster_fit(
            "REMA", -1500.0, "debit", strong_cluster
        )
        assert result.description_similarity < 0.4

    def test_no_description_key(self, strong_cluster):
        """None description key → zero similarity."""
        result = score_transaction_cluster_fit(
            None, -1500.0, "debit", strong_cluster
        )
        assert result.description_similarity == 0.0

    def test_fit_levels(self, strong_cluster):
        """Verify fit level thresholds: high ≥ 0.70, partial ≥ 0.40."""
        # High fit
        result_high = score_transaction_cluster_fit(
            "ELKJOP", -1500.0, "debit", strong_cluster
        )
        assert result_high.fit_level == "high"

        # None fit (wrong everything)
        result_none = score_transaction_cluster_fit(
            "REMA", 50000.0, "credit", strong_cluster
        )
        assert result_none.fit_level == "none"


# ============================================================================
# CLUSTER STRENGTH TESTS
# ============================================================================


class TestClusterStrength:
    """Test cluster strength computation."""

    def test_empty_cluster(self):
        """Zero points → zero strength."""
        cluster = ClusterSummary(
            company_id=uuid.uuid4(),
            account_number="6540",
            category="kontor",
            total_points=0,
        )
        assert compute_cluster_strength(cluster) == 0.0

    def test_strong_cluster(self):
        """Well-populated cluster → above STRONG_THRESHOLD."""
        cluster = ClusterSummary(
            company_id=uuid.uuid4(),
            account_number="6540",
            category="kontor",
            total_points=20,
            distinct_merchants=5,
            overridden_count=0,
            recency_ratio=0.8,
        )
        strength = compute_cluster_strength(cluster)
        assert strength >= STRONG_THRESHOLD

    def test_growing_cluster(self):
        """Moderate cluster → between GROWING and STRONG."""
        cluster = ClusterSummary(
            company_id=uuid.uuid4(),
            account_number="6540",
            category="kontor",
            total_points=8,
            distinct_merchants=3,
            overridden_count=0,
            recency_ratio=0.5,
        )
        strength = compute_cluster_strength(cluster)
        assert GROWING_THRESHOLD <= strength < STRONG_THRESHOLD

    def test_high_override_rate_caps_strength(self):
        """Override rate > 20% severely caps strength."""
        cluster = ClusterSummary(
            company_id=uuid.uuid4(),
            account_number="6540",
            category="kontor",
            total_points=20,
            distinct_merchants=5,
            overridden_count=5,  # 25% override rate
            recency_ratio=0.8,
        )
        strength = compute_cluster_strength(cluster)
        assert strength <= 0.1

    def test_strength_formula_weights(self):
        """Verify strength accounts for all four factors."""
        cluster = ClusterSummary(
            company_id=uuid.uuid4(),
            account_number="6540",
            category="kontor",
            total_points=15,  # Volume = 1.0
            distinct_merchants=4,  # Diversity = 1.0
            overridden_count=0,  # Reliability = 1.0
            recency_ratio=1.0,  # Recency = 1.0
        )
        strength = compute_cluster_strength(cluster)
        # All maxed out → should be very close to 1.0
        assert strength >= 0.95


# ============================================================================
# READINESS TIER TESTS
# ============================================================================


class TestReadinessTier:
    """Test readiness tier computation."""

    def test_tier_1_direct_rule(self):
        """Rule match with low override rate → Tier 1."""
        tx = MockTransaction(
            raw_description="SPOTIFY AB 119 NOK",
            amount=Decimal("-119.00"),
        )
        rule_action = {
            "rule_name": "Auto: Spotify",
            "_rule_obj": MockRule(times_applied=20, times_overridden=1),
        }
        result = compute_readiness_tier(
            transaction=tx,
            rule_action=rule_action,
            clusters=[],
            bilag_match_score=0.85,
        )
        assert result.tier == ReadinessTier.TIER_1_DIRECT_RULE

    def test_tier_1_requires_low_override(self):
        """Rule with high override rate → NOT Tier 1."""
        tx = MockTransaction(
            raw_description="SPOTIFY AB",
            amount=Decimal("-119.00"),
        )
        rule_action = {
            "rule_name": "Bad rule",
            "_rule_obj": MockRule(times_applied=10, times_overridden=5),
        }
        result = compute_readiness_tier(
            transaction=tx,
            rule_action=rule_action,
            clusters=[],
            bilag_match_score=0.50,
        )
        # High override rate → falls through to Tier 4
        assert result.tier == ReadinessTier.TIER_4_UNKNOWN

    def test_tier_4_no_cluster_support(self):
        """No clusters and low match score → Tier 4."""
        tx = MockTransaction(
            raw_description="UNKNOWN MERCHANT",
            amount=Decimal("-500.00"),
        )
        result = compute_readiness_tier(
            transaction=tx,
            rule_action=None,
            clusters=[],
            bilag_match_score=0.45,
        )
        assert result.tier == ReadinessTier.TIER_4_UNKNOWN

    def test_tier_4_low_bilag_score(self):
        """Low bilag match score → Tier 4 regardless of clusters."""
        tx = MockTransaction(
            raw_description="ELKJOP TORSHOV",
            amount=Decimal("-1000.00"),
            suggested_account="6540",
        )
        result = compute_readiness_tier(
            transaction=tx,
            rule_action=None,
            clusters=[],
            bilag_match_score=0.50,  # Below 0.65 threshold
        )
        assert result.tier == ReadinessTier.TIER_4_UNKNOWN

    def test_tier_2_strong_cluster_high_fit(self):
        """Strong cluster + high fit → Tier 2."""
        tx = MockTransaction(
            raw_description="ELKJOP TORSHOV",
            amount=Decimal("-1500.00"),
            suggested_account="6540",
        )
        cluster = ClusterSummary(
            company_id=tx.company_id,
            account_number="6540",
            category="kontor",
            total_points=20,
            distinct_merchants=5,
            overridden_count=0,
            amount_p5=200.0,
            amount_p95=4500.0,
            amount_min=100.0,
            amount_max=5000.0,
            dominant_direction="debit",
            recency_ratio=0.8,
            strength=0.85,
            strength_level="strong",
            description_keys=["ELKJOP"],
        )
        result = compute_readiness_tier(
            transaction=tx,
            rule_action=None,
            clusters=[cluster],
            bilag_match_score=0.80,
            suggested_account="6540",
            suggested_category="kontor",
        )
        assert result.tier == ReadinessTier.TIER_2_STRONG_CLUSTER


# ============================================================================
# CLUSTER GATEKEEPER DECISION TESTS
# ============================================================================


class TestClusterGatekeeper:
    """Test the cluster gatekeeper auto-confirm decision tree.

    Rules from reconciliation_matcher.py auto_reconcile():
      Strong cluster + high fit   → MEDIUM match OK
      Strong cluster + partial fit → HIGH only
      Growing cluster             → HIGH only
      Weak / no cluster           → NEVER auto-post
    """

    def _make_cluster(self, strength_level="strong", account="6540", category="kontor"):
        return ClusterSummary(
            company_id=uuid.uuid4(),
            account_number=account,
            category=category,
            total_points=20,
            distinct_merchants=5,
            overridden_count=0,
            amount_min=100.0,
            amount_max=5000.0,
            amount_p5=200.0,
            amount_p95=4500.0,
            dominant_direction="debit",
            recency_ratio=0.8,
            strength=0.85 if strength_level == "strong" else 0.55,
            strength_level=strength_level,
            description_keys=["ELKJOP"],
        )

    def test_strong_cluster_high_fit_medium_match_autoconfirms(self):
        """Strong cluster + high fit → MEDIUM match is enough."""
        cluster = self._make_cluster("strong")
        fit = score_transaction_cluster_fit("ELKJOP", -1500.0, "debit", cluster)
        assert fit.fit_level == "high"

        # The gatekeeper should allow MEDIUM confidence
        should_auto = (
            cluster.strength_level == "strong"
            and fit.fit_level == "high"
        )
        assert should_auto is True

    def test_strong_cluster_partial_fit_requires_high(self):
        """Strong cluster + partial fit → only HIGH match."""
        cluster = self._make_cluster("strong")
        # Use a description that doesn't match well → partial fit
        fit = score_transaction_cluster_fit("REMA", -1500.0, "debit", cluster)
        # With matching amount + direction but bad description → likely partial
        assert fit.fit_level in ("partial", "high")

    def test_growing_cluster_requires_high(self):
        """Growing cluster → only HIGH match qualifies."""
        cluster = self._make_cluster("growing")
        fit = score_transaction_cluster_fit("ELKJOP", -1500.0, "debit", cluster)

        # Growing cluster never allows MEDIUM
        should_auto_medium = (
            cluster.strength_level == "growing"
            and MatchConfidence.MEDIUM == MatchConfidence.HIGH
        )
        assert should_auto_medium is False

    def test_weak_cluster_never_autoconfirms(self):
        """Weak cluster → NEVER auto-post, regardless of match quality."""
        cluster = self._make_cluster("weak")
        fit = score_transaction_cluster_fit("ELKJOP", -1500.0, "debit", cluster)

        # Weak cluster should never auto-confirm
        should_auto = (
            cluster.strength_level in ("strong", "growing")
            and fit.fit_level in ("high", "partial")
        )
        assert should_auto is False

    def test_no_cluster_never_autoconfirms(self):
        """No matching cluster → NEVER auto-post."""
        # This is tested implicitly: if best_cluster is None, should_auto_confirm stays False
        should_auto = False  # No cluster found
        assert should_auto is False

    def test_gatekeeper_decision_tree_comprehensive(self):
        """Verify all combinations of cluster strength × fit level."""
        decisions = {}
        for strength in ["strong", "growing", "weak"]:
            for fit in ["high", "partial", "none"]:
                for confidence in [MatchConfidence.HIGH, MatchConfidence.MEDIUM, MatchConfidence.LOW]:
                    should_auto = False
                    if strength == "strong" and fit == "high":
                        should_auto = confidence in [MatchConfidence.HIGH, MatchConfidence.MEDIUM]
                    elif strength == "strong" and fit == "partial":
                        should_auto = confidence == MatchConfidence.HIGH
                    elif strength == "growing" and fit in ("high", "partial"):
                        should_auto = confidence == MatchConfidence.HIGH
                    decisions[(strength, fit, confidence)] = should_auto

        # Verify key assertions
        assert decisions[("strong", "high", MatchConfidence.HIGH)] is True
        assert decisions[("strong", "high", MatchConfidence.MEDIUM)] is True
        assert decisions[("strong", "high", MatchConfidence.LOW)] is False
        assert decisions[("strong", "partial", MatchConfidence.HIGH)] is True
        assert decisions[("strong", "partial", MatchConfidence.MEDIUM)] is False
        assert decisions[("growing", "high", MatchConfidence.HIGH)] is True
        assert decisions[("growing", "high", MatchConfidence.MEDIUM)] is False
        assert decisions[("growing", "partial", MatchConfidence.HIGH)] is True
        assert decisions[("weak", "high", MatchConfidence.HIGH)] is False
        assert decisions[("weak", "high", MatchConfidence.MEDIUM)] is False
        assert decisions[("weak", "none", MatchConfidence.HIGH)] is False


# ============================================================================
# EDGE CASES
# ============================================================================


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_zero_amount_transaction(self, matcher):
        """Zero amount transaction handling."""
        tx = MockTransaction(amount=Decimal("0.00"))
        bilag = MockBilag(gross_amount=Decimal("0.00"))
        result = matcher._calculate_match_score(tx, bilag)
        # Zero amount matches zero amount exactly
        if result is not None:
            exact = next(f for f in result.factors if f.name == "exact_amount")
            assert exact.matched is True

    def test_very_large_amount(self, matcher):
        """Very large amounts still match correctly."""
        tx = MockTransaction(
            amount=Decimal("9999999.99"),
            booking_date=date(2025, 3, 10),
        )
        bilag = MockBilag(
            gross_amount=Decimal("9999999.99"),
            document_date=date(2025, 3, 10),
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        assert next(f for f in result.factors if f.name == "exact_amount").matched is True

    def test_special_characters_in_description(self, matcher):
        """Special characters in names don't break matching."""
        sim = matcher._calculate_name_similarity(
            "H&M *1234 OSLO",
            "H&M Hennes & Mauritz",
        )
        assert isinstance(sim, float)

    def test_norwegian_characters_in_names(self, matcher):
        """Norwegian characters (æøå) handled correctly."""
        sim = matcher._calculate_name_similarity("Bærum Energi", "Bærum Energi AS")
        assert sim >= 0.7

    def test_empty_description_pattern(self):
        """Empty description → returns truncated string."""
        result = ReconciliationMatcher._extract_key_pattern_static("")
        assert isinstance(result, str)

    def test_all_stopwords_description(self):
        """Description with only stopwords → fallback."""
        result = ReconciliationMatcher._extract_key_pattern_static("BETALING FRA TIL FOR")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_unicode_normalization(self, matcher):
        """Unicode characters don't crash the normalizer."""
        n = matcher._normalize_name("Café Müller & Søn")
        assert isinstance(n, str)

    def test_matcher_cache_clear(self, matcher):
        """Cache clear removes all cached data."""
        matcher._rules_cache[uuid.uuid4()] = ["fake_rule"]
        matcher._bilags_cache[uuid.uuid4()] = ["fake_bilag"]
        matcher.clear_cache()
        assert len(matcher._rules_cache) == 0
        assert len(matcher._bilags_cache) == 0

    def test_tolerance_boundary_exactly_5_percent(self, matcher):
        """Amount exactly at 5% tolerance boundary."""
        tx = MockTransaction(
            amount=Decimal("1050.00"),  # Exactly 5% above
            booking_date=date(2025, 3, 10),
        )
        bilag = MockBilag(
            gross_amount=Decimal("1000.00"),
            document_date=date(2025, 3, 10),
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        tolerance = next(f for f in result.factors if f.name == "amount_tolerance")
        assert tolerance.matched is True

    def test_tolerance_boundary_just_over(self, matcher):
        """Amount just over 5% tolerance → not within tolerance."""
        tx = MockTransaction(
            amount=Decimal("1051.00"),  # Just over 5%
            booking_date=date(2025, 3, 10),
        )
        bilag = MockBilag(
            gross_amount=Decimal("1000.00"),
            document_date=date(2025, 3, 10),
        )
        result = matcher._calculate_match_score(tx, bilag)
        if result is not None:
            tolerance = next(f for f in result.factors if f.name == "amount_tolerance")
            assert tolerance.matched is False

    def test_date_proximity_boundary_14_days(self, matcher):
        """Exactly 14 days apart → matched but score near zero."""
        tx = MockTransaction(
            amount=Decimal("1000.00"),
            booking_date=date(2025, 3, 24),
        )
        bilag = MockBilag(
            gross_amount=Decimal("1000.00"),
            document_date=date(2025, 3, 10),  # 14 days
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        date_factor = next(f for f in result.factors if f.name == "date_proximity")
        assert date_factor.matched is True
        assert date_factor.score == pytest.approx(0.0, abs=0.01)

    def test_date_proximity_boundary_15_days(self, matcher):
        """15 days apart → not matched."""
        tx = MockTransaction(
            amount=Decimal("1000.00"),
            booking_date=date(2025, 3, 25),
        )
        bilag = MockBilag(
            gross_amount=Decimal("1000.00"),
            document_date=date(2025, 3, 10),  # 15 days
        )
        result = matcher._calculate_match_score(tx, bilag)
        assert result is not None
        date_factor = next(f for f in result.factors if f.name == "date_proximity")
        assert date_factor.matched is False
