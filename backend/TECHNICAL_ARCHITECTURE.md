# Ciri Technical Architecture: Reconciliation & Learning System

## Table of Contents

1. [System Overview](#system-overview)
2. [Confidence Scoring & Weighting System](#confidence-scoring--weighting-system)
3. [Autonomy Levels & Auto-Posting](#autonomy-levels--auto-posting)
4. [Rule System](#rule-system)
5. [Learning from Feedback](#learning-from-feedback)
6. [End-to-End Flow](#end-to-end-flow)

---

## System Overview

Ciri's reconciliation engine matches bank transactions to bilags (accounting documents) using a multi-factor weighted scoring algorithm. The system learns from user corrections to create rules that improve accuracy over time.

```
                           ┌──────────────────────┐
                           │   Bank Transaction    │
                           │  (amount, date, ref,  │
                           │   merchant, desc)     │
                           └──────────┬───────────┘
                                      │
                           ┌──────────▼───────────┐
                           │    Rule Engine        │
                           │  (Check learned rules │
                           │   first, by priority) │
                           └──────────┬───────────┘
                                      │
                         ┌────────────┴────────────┐
                    Rule matched?              No match
                         │                         │
                    ┌────▼────┐            ┌───────▼────────┐
                    │  Apply  │            │  Multi-Factor  │
                    │  Action │            │  Matcher       │
                    │(ignore, │            │(6 weighted     │
                    │ categorize,│         │ factors)       │
                    │ match)  │            └───────┬────────┘
                    └─────────┘                    │
                                          ┌───────▼────────┐
                                          │  Score → 0-1   │
                                          │  Confidence:   │
                                          │  HIGH ≥ 0.90   │
                                          │  MED  ≥ 0.70   │
                                          │  LOW  < 0.70   │
                                          └───────┬────────┘
                                                  │
                                     ┌────────────▼────────────┐
                                     │    Autonomy Gate        │
                                     │                         │
                                     │  ASSISTANT: auto HIGH   │
                                     │  AUTONOMOUS: auto H+M   │
                                     └────────────┬────────────┘
                                                  │
                              ┌───────────────────┴───────────────┐
                         Auto-confirmed                       Suggested
                              │                                   │
                    ┌─────────▼──────────┐              ┌─────────▼──────────┐
                    │  Mark as MATCHED   │              │  Show to user      │
                    │  Create posteringer│              │  Await confirmation│
                    └────────────────────┘              └─────────┬──────────┘
                                                                  │
                                                       ┌──────────▼──────────┐
                                                       │  User feedback      │
                                                       │  (confirm / reject  │
                                                       │   / correct)        │
                                                       └──────────┬──────────┘
                                                                  │
                                                       ┌──────────▼──────────┐
                                                       │  Learn from         │
                                                       │  feedback →         │
                                                       │  Create new rule    │
                                                       └─────────────────────┘
```

---

## Confidence Scoring & Weighting System

The matcher evaluates each transaction-bilag pair across **6 independent factors**. Each factor produces a weighted score, and the sum determines the overall confidence.

### Factor Weights

| # | Factor | Weight | What it checks |
|---|--------|--------|----------------|
| 1 | Exact amount | **0.35** | `transaction.amount == bilag.gross_amount` (absolute values) |
| 2 | Reference/KID match | **0.30** | Bank reference contains bilag number or shared numeric sequence |
| 3 | Amount tolerance | **0.20** | Amount within 2% tolerance (only if exact match fails) |
| 4 | Name similarity | **0.15** | Fuzzy match between merchant name and counterparty (SequenceMatcher) |
| 5 | Date proximity | **0.15** | Transaction date within 14 days of bilag date (linear decay) |
| 6 | Historical patterns | **0.10** | Reserved for future rule-based boosting |

> **Note:** Weights sum to 1.25, not 1.0. This is intentional — factors can stack (e.g., exact amount + reference + name = 0.80), but in practice a perfect match across all factors yields ~1.0 because amount tolerance doesn't fire when exact match succeeds.

### Scoring Mechanics

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCORING PIPELINE                             │
│                                                                 │
│  For each (transaction, bilag) pair:                            │
│                                                                 │
│  ┌─────────────────┐                                            │
│  │ Factor 1: Amount │  tx_amt == bilag_amt?                     │
│  │ Weight: 0.35     │  YES → score += 0.35                      │
│  │                  │  NO  → score += 0                         │
│  └─────────────────┘                                            │
│           │                                                     │
│  ┌─────────────────┐                                            │
│  │ Factor 2: Ref    │  KID/reference in bilag_number?           │
│  │ Weight: 0.30     │  YES → score += 0.30                      │
│  │                  │  NO  → score += 0                         │
│  └─────────────────┘                                            │
│           │                                                     │
│  ┌─────────────────┐                                            │
│  │ Factor 3: Tol.   │  |diff| ≤ 2% of bilag_amt?               │
│  │ Weight: 0.20     │  YES (and F1=NO) → score += 0.20          │
│  │                  │  F1=YES → score += 0 (no double count)    │
│  └─────────────────┘                                            │
│           │                                                     │
│  ┌─────────────────┐                                            │
│  │ Factor 4: Name   │  SequenceMatcher(merchant, counterparty)  │
│  │ Weight: 0.15     │  ratio ≥ 0.60 → score += 0.15 × ratio    │
│  │                  │  ratio < 0.60 → score += 0                │
│  └─────────────────┘                                            │
│           │                                                     │
│  ┌─────────────────┐                                            │
│  │ Factor 5: Date   │  days = |tx_date - bilag_date|            │
│  │ Weight: 0.15     │  days ≤ 14 → score += 0.15 × (1-days/14) │
│  │                  │  days > 14 → score += 0                   │
│  └─────────────────┘                                            │
│           │                                                     │
│  ┌─────────────────┐                                            │
│  │ Total Score      │  sum(all factor scores)                   │
│  │                  │  < 0.30 → discard (not a candidate)       │
│  └─────────────────┘                                            │
│                                                                 │
│  CONFIDENCE LEVELS:                                             │
│  ┌────────────────────────────────────────┐                     │
│  │  score ≥ 0.90  →  HIGH   (auto-post)  │                     │
│  │  score ≥ 0.70  →  MEDIUM (review)     │                     │
│  │  score < 0.70  →  LOW    (manual)     │                     │
│  └────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

### Scoring Examples

**Example 1: Perfect match (score = 0.95)**
```
Transaction: kr 12,500.00 from "Telenor Norge AS", ref "F-2025-042", date 2025-03-15
Bilag:       kr 12,500.00, counterparty "Telenor AS", number "F-2025-042", date 2025-03-12

Factor 1 (Exact amount):  0.35  ← amounts identical
Factor 2 (Reference):     0.30  ← "F-2025-042" matches exactly
Factor 3 (Tolerance):     0.00  ← skipped (exact match hit)
Factor 4 (Name):          0.15 × 0.87 = 0.13  ← "telenor" is strong fuzzy match
Factor 5 (Date):          0.15 × (1 - 3/14) = 0.12  ← 3 days apart
                          ─────
                  TOTAL:  0.90 → HIGH confidence
```

**Example 2: Partial match (score = 0.72)**
```
Transaction: kr 4,980.00 from "VIPPS*BYGGMAKKER", no ref, date 2025-04-02
Bilag:       kr 4,980.00, counterparty "Byggmakker Storo", date 2025-03-28

Factor 1 (Exact amount):  0.35  ← amounts identical
Factor 2 (Reference):     0.00  ← no reference
Factor 3 (Tolerance):     0.00  ← skipped
Factor 4 (Name):          0.15 × 0.68 = 0.10  ← "byggmakker" found in both
Factor 5 (Date):          0.15 × (1 - 5/14) = 0.10  ← 5 days apart
                          ─────
                  TOTAL:  0.55 → LOW confidence
```

### Reference Matching (KID System)

Norwegian bank payments use KID numbers — structured payment references. The matcher checks for references in three ways:

```
┌────────────────────────────────────────────────────┐
│             REFERENCE MATCHING                     │
│                                                    │
│  1. Direct substring:                              │
│     tx.reference IN bilag.bilag_number             │
│     "F-2025-042" in "F-2025-042" → TRUE            │
│                                                    │
│  2. Numeric extraction:                            │
│     Extract digits from both, check overlap         │
│     tx.ref = "KID2025042"  → digits: [2025042]     │
│     bilag = "F-2025-042"  → digits: [2025, 042]    │
│     Any match? → TRUE                              │
│                                                    │
│  3. No reference:                                  │
│     tx.reference is null → score = 0 (skip factor) │
└────────────────────────────────────────────────────┘
```

### Name Normalization

Before comparing names, both are normalized:

```
Input:  "VIPPS*TELENOR NORGE AS 1234"
                    ↓
Step 1: Lowercase → "vipps*telenor norge as 1234"
Step 2: Remove patterns (as, asa, ab, ltd, inc, card numbers, norway/norge)
        → "vipps*telenor"
Step 3: Remove non-alphanumeric → "vippstelenor"
Step 4: Collapse whitespace → "vippstelenor"

Then: SequenceMatcher("vippstelenor", "telenor").ratio() = 0.67
Since 0.67 ≥ 0.60 threshold → name_score = 0.15 × 0.67 = 0.10
```

---

## Autonomy Levels & Auto-Posting

The company's autonomy level determines which confidence levels are auto-confirmed vs. presented for review.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AUTONOMY MATRIX                                │
│                                                                    │
│              │  HIGH (≥0.90)  │  MEDIUM (0.70-0.89) │  LOW (<0.70) │
│  ────────────┼────────────────┼─────────────────────┼──────────────│
│  ASSISTANT   │  AUTO-CONFIRM  │  Suggest             │  Suggest     │
│  (Assistent) │  ✓ immediate   │  (user decides)      │  (user decides)│
│  ────────────┼────────────────┼─────────────────────┼──────────────│
│  AUTONOMOUS  │  AUTO-CONFIRM  │  AUTO-CONFIRM        │  Suggest     │
│  (Autonom)   │  ✓ immediate   │  ✓ immediate         │  (user decides)│
└─────────────────────────────────────────────────────────────────────┘
```

### Auto-Posting for Bilags (Invoice Processing)

Separate from reconciliation, incoming bilags can be auto-posted when processed via OCR:

```
┌──────────────────────────────────────────────────────────┐
│              BILAG AUTO-POSTING GATE                     │
│                                                          │
│  Required for auto-post (ALL must be true):              │
│                                                          │
│    ☑ OCR confidence ≥ 90%                                │
│    ☑ supplier_name is present                            │
│    ☑ gross_amount > 0                                    │
│    ☑ invoice_date is present                             │
│    ☑ description is present                              │
│    ☑ suggested_account is present                        │
│    ☑ mva_code is present                                 │
│                                                          │
│  ALL TRUE → status = POSTED + create posteringer         │
│  ANY FALSE → status = PENDING (manual review)            │
│                                                          │
│  If posteringer creation fails:                          │
│    → Revert to PENDING                                   │
│    → Append error to ciri_reasoning                      │
└──────────────────────────────────────────────────────────┘
```

---

## Rule System

Rules automate recurring transaction handling. They are either user-created or learned from user corrections.

### Rule Types

```
┌──────────────────────────────────────────────────────────────┐
│                    RULE TYPES                                │
│                                                              │
│  AUTO_MATCH       Match transaction to a specific bilag      │
│                   pattern automatically                      │
│                                                              │
│  AUTO_CATEGORY    Assign category + account + MVA code       │
│                   Example: "SPOTIFY" → 6540 Kontorkostnad    │
│                                                              │
│  IGNORE           Mark transaction as private/irrelevant     │
│                   Example: "REMA 1000" → personal expense    │
│                                                              │
│  SPLIT            Split transaction across multiple accounts │
│                   Example: 50% kontor + 50% privat           │
└──────────────────────────────────────────────────────────────┘
```

### Rule Criteria (JSONB Pattern Matching)

Each rule has a `criteria` field (JSONB) that defines what transactions it matches:

```json
{
  "description_contains": "SPOTIFY",     // Substring match (case-insensitive)
  "amount_min": 99,                       // Minimum absolute amount
  "amount_max": 199,                      // Maximum absolute amount
  "amount_exact": 119,                    // Exact amount match
  "merchant_name": "Spotify",             // Exact merchant name
  "direction": "debit",                   // Transaction direction
  "bank_account_id": "uuid"              // Specific bank account
}
```

All criteria fields are AND-combined — every present field must match:

```
┌─────────────────────────────────────────────────────┐
│            RULE MATCHING LOGIC                      │
│                                                     │
│  for each criterion in rule.criteria:               │
│    if "description_contains":                       │
│      pattern.lower() IN tx.raw_description.lower()? │
│      NO → return FALSE                              │
│                                                     │
│    if "amount_min":                                  │
│      |tx.amount| ≥ amount_min?                      │
│      NO → return FALSE                              │
│                                                     │
│    if "amount_max":                                  │
│      |tx.amount| ≤ amount_max?                      │
│      NO → return FALSE                              │
│                                                     │
│    if "amount_exact":                                │
│      |tx.amount| == amount_exact?                    │
│      NO → return FALSE                              │
│                                                     │
│    if "direction":                                   │
│      "debit" → tx.amount < 0?                       │
│      "credit" → tx.amount ≥ 0?                      │
│      NO → return FALSE                              │
│                                                     │
│    if "merchant_name":                               │
│      tx.merchant_name == merchant_name?              │
│      NO → return FALSE                              │
│                                                     │
│  All checks passed → return TRUE                    │
└─────────────────────────────────────────────────────┘
```

### Rule Priority & Execution Order

Rules are evaluated in priority order (HIGH → MEDIUM → LOW). The first matching rule wins.

### Rule Effectiveness & Self-Disabling

Each rule tracks its own accuracy:

```
┌──────────────────────────────────────────────────────┐
│          RULE EFFECTIVENESS TRACKING                 │
│                                                      │
│  times_applied:   +1 each time rule fires            │
│  times_overridden: +1 each time user corrects result │
│                                                      │
│  override_rate = times_overridden / times_applied    │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  override_rate < 30%  →  EFFECTIVE (keep)      │  │
│  │  override_rate ≥ 30%  →  INEFFECTIVE (skip)    │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Example:                                            │
│    Rule "Ignorer: REMA 1000"                         │
│    Applied: 50 times                                 │
│    Overridden: 3 times                               │
│    Rate: 6% → EFFECTIVE ✓                            │
│                                                      │
│  Example:                                            │
│    Rule "Kategori: CIRCLE K → Drivstoff"             │
│    Applied: 20 times                                 │
│    Overridden: 8 times                               │
│    Rate: 40% → INEFFECTIVE ✗ (skipped)               │
└──────────────────────────────────────────────────────┘
```

### Rule Cascade (Retroactive Cleanup)

When an IGNORE rule is created, the system retroactively cleans up existing data that matches the rule criteria. This prevents stale private bilags and transactions from lingering in the system.

```
┌──────────────────────────────────────────────────────────────┐
│            RULE CASCADE (IGNORE rules only)                   │
│                                                               │
│  Trigger: User creates rule "Ignorer: REMA 1000"              │
│           criteria: { description_contains: "REMA" }          │
│                                                               │
│  Step 1: Bank Transactions                                    │
│    SELECT * FROM bank_transactions                            │
│    WHERE raw_description ILIKE '%REMA%'                       │
│      AND is_private = false                                   │
│      AND status IN (UNMATCHED, SUGGESTED)                     │
│    → Mark is_private=true, status=IGNORED, category=PRIVAT    │
│                                                               │
│  Step 2: Bilags (PENDING + APPROVED only)                     │
│    SELECT * FROM bilag                                        │
│    WHERE (counterparty_name ILIKE '%REMA%'                    │
│           OR description ILIKE '%REMA%')                      │
│      AND status IN (PENDING, APPROVED)                        │
│    → Set status=REJECTED                                      │
│    ⚠ POSTED bilags are NEVER touched (Bokføringsloven)        │
│                                                               │
│  Step 3: Reconciliation Matches                               │
│    SELECT * FROM reconciliation_matches                       │
│    WHERE (tx_id IN affected_txs OR bilag_id IN affected_bilags)│
│      AND status = SUGGESTED                                   │
│    → Set status=REJECTED                                      │
│                                                               │
│  Returns: { transactions: N, bilags: N, matches: N }          │
└──────────────────────────────────────────────────────────────┘
```

The cascade runs within the same database transaction as the rule creation, so it's atomic — if anything fails, nothing is committed.

---

## Learning from Feedback

The system creates new rules from user corrections. This is how Ciri "trains" — not via neural network weight updates, but via explicit rule extraction from human feedback.

### Feedback Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                  LEARNING FEEDBACK LOOP                         │
│                                                                 │
│  Step 1: Ciri suggests a match                                  │
│  ┌──────────────────────────────┐                               │
│  │ Transaction: REMA 1000 -189  │                               │
│  │ Suggested:   Bilag F-2025-10 │                               │
│  │ Confidence:  72% (MEDIUM)    │                               │
│  └──────────────┬───────────────┘                               │
│                 │                                                │
│  Step 2: User provides feedback                                 │
│  ┌──────────────▼───────────────┐                               │
│  │ User action:                 │                               │
│  │  ○ Confirm  → match accepted │                               │
│  │  ● Reject   → "dette er      │                               │
│  │               privat"         │                               │
│  │  ○ Correct  → pick right     │                               │
│  │               bilag instead   │                               │
│  └──────────────┬───────────────┘                               │
│                 │                                                │
│  Step 3: System extracts pattern                                │
│  ┌──────────────▼───────────────┐                               │
│  │ Input:  "KORTBETALING REMA   │                               │
│  │          1000 TORSHOV"        │                               │
│  │                               │                               │
│  │ Extract: Remove prefixes      │                               │
│  │   "KORTBETALING " → strip     │                               │
│  │   "REMA" ← first significant  │                               │
│  │           word (>2 chars,      │                               │
│  │           not all digits)      │                               │
│  └──────────────┬───────────────┘                               │
│                 │                                                │
│  Step 4: New rule created                                       │
│  ┌──────────────▼───────────────┐                               │
│  │ ReconciliationRule:           │                               │
│  │   name: "Ignorer: REMA 1000" │                               │
│  │   type: IGNORE                │                               │
│  │   criteria: {                 │                               │
│  │     description_contains:     │                               │
│  │       "REMA"                  │                               │
│  │   }                           │                               │
│  │   action: {                   │                               │
│  │     mark_private: true,       │                               │
│  │     reason: "dette er privat" │                               │
│  │   }                           │                               │
│  │   learned_from_user: true     │                               │
│  └──────────────────────────────┘                               │
│                                                                 │
│  Step 5: Future transactions                                    │
│  ┌──────────────────────────────┐                               │
│  │ Next "REMA 1000" transaction │─── Rule fires automatically   │
│  │ → Marked private immediately │    No user interaction needed │
│  └──────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### Pattern Extraction Algorithm

When creating a rule from feedback, the system extracts the most distinctive part of the transaction description:

```
┌────────────────────────────────────────────────────────────┐
│          _extract_key_pattern(description)                 │
│                                                            │
│  Input: "VIPPS*SPOTIFY AB 1234567890"                      │
│                                                            │
│  Step 1: Uppercase → "VIPPS*SPOTIFY AB 1234567890"         │
│                                                            │
│  Step 2: Strip known prefixes:                             │
│    "VIPPS*", "VIPPS ", "KORTBETALING ",                    │
│    "NETTBANK ", "GIRO "                                    │
│    → "SPOTIFY AB 1234567890"                               │
│                                                            │
│  Step 3: Split into words:                                 │
│    ["SPOTIFY", "AB", "1234567890"]                         │
│                                                            │
│  Step 4: Filter (>2 chars, not all digits):                │
│    ["SPOTIFY"] ← first qualifying word                     │
│                                                            │
│  Output: "SPOTIFY"                                         │
│                                                            │
│  This becomes: criteria.description_contains = "SPOTIFY"   │
└────────────────────────────────────────────────────────────┘
```

### Training Lifecycle (Schematic)

```
                    ┌─────────┐
                    │  Day 1  │  No rules exist
                    └────┬────┘
                         │
            ┌────────────▼────────────────┐
            │ Every transaction goes to   │
            │ multi-factor matcher.       │
            │ User reviews all matches.   │
            │ High manual effort.         │
            └────────────┬────────────────┘
                         │
          User corrects 5 transactions as "privat"
          (Rema, Kiwi, Netflix, Spotify, gym)
                         │
                    ┌────▼────┐
                    │ Week 2  │  5 IGNORE rules created
                    └────┬────┘
                         │
            ┌────────────▼────────────────┐
            │ Common personal expenses    │
            │ now auto-ignored.           │
            │ User only reviews business  │
            │ transactions.               │
            │ ~30% less manual work.      │
            └────────────┬────────────────┘
                         │
          User corrects categorizations
          (wrong account codes adjusted)
                         │
                    ┌────▼────┐
                    │ Month 2 │  15+ rules active
                    └────┬────┘
                         │
            ┌────────────▼────────────────┐
            │ Most recurring transactions │
            │ handled by rules.           │
            │ Matcher focuses on new/     │
            │ unusual transactions.       │
            │ ~60% less manual work.      │
            └────────────┬────────────────┘
                         │
          Bad rules accumulate >30% override rate
          → automatically marked ineffective
                         │
                    ┌────▼────┐
                    │ Month 6 │  Stable rule set
                    └────┬────┘
                         │
            ┌────────────▼────────────────┐
            │ Effective rules remain.     │
            │ Poor rules self-disabled.   │
            │ System primarily handles    │
            │ recurring patterns;         │
            │ novel transactions still    │
            │ scored by multi-factor      │
            │ matcher.                    │
            │ ~80% automated.             │
            └─────────────────────────────┘
```

---

## End-to-End Flow

### Transaction Reconciliation

```
  Bank transaction arrives
           │
           ▼
  ┌─ apply_rules() ────────────────────────────────────┐
  │  Query active rules for company, ordered by priority│
  │  For each rule:                                     │
  │    rule.matches_transaction(tx)?                    │
  │      YES → return action + rule reference            │
  │      NO  → try next rule                            │
  │  No rule matched → return None                      │
  │                                                     │
  │  NOTE: record_application() is called later in       │
  │  _apply_rule_action(), only when the rule actually   │
  │  changes transaction state (IGNORE/CATEGORY).        │
  │  AUTO_MATCH rules that can't fully resolve don't     │
  │  inflate times_applied.                              │
  └────────────────────────────┬────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
         Rule matched                      No rule
              │                                 │
    ┌─────────▼──────────┐           ┌──────────▼──────────┐
    │ _apply_rule_action │           │  find_matches()     │
    │                    │           │  Get top 100 bilags │
    │ IGNORE:            │           │  Score each pair    │
    │  mark private      │           │  Sort by score      │
    │                    │           │  Return top 5       │
    │ AUTO_CATEGORY:     │           └──────────┬──────────┘
    │  set category      │                      │
    │  set account       │           ┌──────────▼──────────┐
    └────────────────────┘           │ auto_reconcile()    │
                                     │ Check autonomy      │
                                     │ level:              │
                                     │                     │
                                     │ AUTONOMOUS:         │
                                     │  HIGH+MED → auto    │
                                     │                     │
                                     │ ASSISTANT:          │
                                     │  HIGH → auto        │
                                     │  MED → suggest      │
                                     │                     │
                                     │  LOW → suggest      │
                                     └──────────┬──────────┘
                                                │
                                     ┌──────────▼──────────┐
                                     │ Create              │
                                     │ ReconciliationMatch  │
                                     │ record with:        │
                                     │  - confidence_score  │
                                     │  - match_factors     │
                                     │  - ciri_explanation  │
                                     │  - status (auto/     │
                                     │    suggested)        │
                                     └─────────────────────┘
```

### Source Files

| File | Purpose |
|------|---------|
| `services/reconciliation_matcher.py` | Multi-factor scoring, rule application, learning |
| `services/rule_cascade.py` | Retroactive cleanup when IGNORE rules are created |
| `models/reconciliation_rule.py` | Rule model, criteria matching, effectiveness tracking |
| `services/invoice_processor.py` | OCR processing, auto-posting gate |
| `models/company.py` | AutonomyLevel enum |
| `models/bilag.py` | BilagStatus, confidence fields |
| `models/bank_transaction.py` | ReconciliationStatus, transaction data |

---

## Success Clusters & Autonomous Posting Maturity

### The Problem with Rule-Count Thresholds

The original maturity gate required >20 active rules before Ciri could auto-post. This is
the wrong abstraction. Consider:

- A company with 8 well-tested rules covering 90% of recurring transactions is blocked
- A company with 25 untested single-character rules passes

Rule count measures *volume*, not *competence*. Ciri's readiness to auto-post should be
a function of how deeply she understands the company's transaction patterns — and that
understanding is uneven. She may know software subscriptions perfectly while being blind to
consulting fees.

### Success Clusters: What They Are

A **success cluster** is a statistical profile of transactions that Ciri has correctly
handled in the past, grouped by their posting destination (account + category). Clusters
are not machine-learned embeddings — they are simple aggregations of confirmed outcomes.

```
┌──────────────────────────────────────────────────────────────────┐
│                    SUCCESS CLUSTER                                │
│                                                                   │
│  Cluster: "6540 — IT-kostnader"                                   │
│                                                                   │
│  Built from 18 confirmed postings:                                │
│    ANTHROPIC ×3, GITHUB ×4, VERCEL ×2, SPOTIFY ×6, HEROKU ×3     │
│                                                                   │
│  Statistical profile:                                             │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  Direction:    100% debit                                │     │
│  │  Amount range: kr 49 – kr 2,890                          │     │
│  │  Median:       kr 199                                    │     │
│  │  Merchants:    5 distinct (high diversity)               │     │
│  │  Override rate: 0/18 = 0%                                │     │
│  │  Oldest point: 2025-01-15                                │     │
│  │  Newest point: 2025-06-02                                │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                   │
│  Cluster strength: STRONG                                         │
│    ✓ 18 data points (threshold: ≥8)                               │
│    ✓ 5 distinct merchants (threshold: ≥3)                         │
│    ✓ 0% override rate (threshold: <20%)                           │
│    ✓ Spans 5 months (not a one-time burst)                        │
└──────────────────────────────────────────────────────────────────┘
```

### Cluster Formation

Clusters form passively from confirmed outcomes. Every time a transaction reaches a
terminal state (user-confirmed match, auto-confirmed match with no later override, or
rule-applied posting), a **data point** is recorded:

```
┌──────────────────────────────────────────────────────────────────┐
│                   CLUSTER DATA POINT                              │
│                                                                   │
│  Fields captured from each confirmed transaction:                 │
│                                                                   │
│  account_number:    "6540"            ← posting destination       │
│  category:          "it"              ← transaction category      │
│  merchant_name:     "ANTHROPIC"       ← normalized merchant       │
│  description_key:   "ANTHROPIC"       ← extracted key pattern     │
│  amount:            199.00            ← absolute amount           │
│  direction:         "debit"           ← debit/credit              │
│  confirmed_at:      2025-06-02        ← when confirmed            │
│  source:            "user_confirmed"  ← how it was confirmed      │
│  was_overridden:    false             ← did user later correct?   │
│  rule_id:           uuid | null       ← which rule triggered it   │
│  match_id:          uuid | null       ← which match it came from  │
│                                                                   │
│  Grouping key: (company_id, account_number, category)             │
│  → All points with same key form one cluster                      │
└──────────────────────────────────────────────────────────────────┘
```

Points are **never deleted** — if a user overrides a posting, the original point's
`was_overridden` flag is set to `true`. This preserves the error history for cluster
strength calculation.

### Cluster Strength Scoring

Strength determines whether a cluster is reliable enough to inform autonomous decisions.

```
┌──────────────────────────────────────────────────────────────────┐
│               CLUSTER STRENGTH FORMULA                            │
│                                                                   │
│  Given a cluster with N data points:                              │
│                                                                   │
│  volume_score = min(1.0, N / 15)                                  │
│    Rationale: 15 confirmed postings is sufficient to establish     │
│    a pattern. Below 8 the cluster is too thin to trust.           │
│    Linear ramp from 0.0 at 0 to 1.0 at 15.                       │
│                                                                   │
│  diversity_score = min(1.0, distinct_merchants / 4)               │
│    Rationale: If Ciri has only seen "SPOTIFY" posted to 6540,     │
│    she knows about Spotify — not about IT expenses in general.    │
│    Seeing 4+ distinct merchants confirms it's a category pattern. │
│    1 merchant = 0.25, 2 = 0.50, 3 = 0.75, 4+ = 1.0.             │
│                                                                   │
│  reliability_score = 1.0 - (overridden_count / N)                 │
│    Rationale: Direct measure of accuracy. If 3/18 postings were   │
│    overridden, reliability = 0.83. Must be ≥0.80 to be usable.   │
│                                                                   │
│  recency_score = proportion of points from last 90 days           │
│    Rationale: A cluster built entirely from January data may not  │
│    reflect current patterns. If >50% of points are recent,        │
│    the cluster is current. Minimum 0.3 (old clusters still have   │
│    some value).                                                    │
│                                                                   │
│  cluster_strength =                                               │
│    volume_score    × 0.30 +                                       │
│    diversity_score × 0.30 +                                       │
│    reliability_score × 0.25 +                                     │
│    recency_score   × 0.15                                         │
│                                                                   │
│  STRENGTH LEVELS:                                                 │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  strength ≥ 0.75  →  STRONG   (can inform auto-posting) │     │
│  │  strength ≥ 0.50  →  GROWING  (inform suggestions only) │     │
│  │  strength < 0.50  →  WEAK     (not used in decisions)   │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                   │
│  HARD MINIMUMS (must pass ALL):                                   │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  N ≥ 8                 (minimum data points)             │     │
│  │  distinct_merchants ≥ 3 (not a single-vendor fluke)      │     │
│  │  override_rate < 20%   (must be mostly correct)          │     │
│  │  reliability ≥ 0.80    (same as override, explicit gate) │     │
│  └──────────────────────────────────────────────────────────┘     │
│  If any hard minimum fails → cluster is WEAK regardless of score  │
└──────────────────────────────────────────────────────────────────┘
```

### Cluster Strength Progression Example

```
┌─────────────────────────────────────────────────────────────────┐
│  Cluster: "6540 — IT-kostnader"                                  │
│                                                                   │
│  Week 1:  User confirms ANTHROPIC → 6540                          │
│           Points: 1, Merchants: 1, Strength: WEAK                 │
│           (N < 8 hard minimum fails)                              │
│                                                                   │
│  Week 3:  GITHUB ×2, SPOTIFY ×2, VERCEL ×1 confirmed             │
│           Points: 6, Merchants: 4, Strength: WEAK                 │
│           (N < 8 hard minimum still fails)                        │
│                                                                   │
│  Week 5:  HEROKU ×2, more SPOTIFY confirmed                      │
│           Points: 10, Merchants: 5                                │
│           volume: 10/15 = 0.67                                    │
│           diversity: 5/4 = 1.0 (capped)                           │
│           reliability: 10/10 = 1.0                                │
│           recency: 1.0 (all recent)                               │
│           strength: 0.67×0.30 + 1.0×0.30 + 1.0×0.25 + 1.0×0.15  │
│                   = 0.201 + 0.300 + 0.250 + 0.150 = 0.90         │
│           → STRONG ✓                                              │
│                                                                   │
│  Week 8:  User overrides 1 posting (wrong account)                │
│           Points: 14, Merchants: 5, Overridden: 1                 │
│           reliability: 13/14 = 0.93                               │
│           → Still STRONG (override rate 7% < 20%)                 │
│                                                                   │
│  Month 6: Points: 40, Merchants: 8, Overridden: 2                │
│           → STRONG with deep history. Ciri is highly confident    │
│             about IT expense categorization.                       │
└─────────────────────────────────────────────────────────────────┘
```

### How Clusters Inform Autonomous Posting

When a **stranger transaction** arrives (no rule matches), the system uses clusters
as contextual knowledge for the Claude validation step. Clusters do NOT replace the
multi-factor matcher — they augment Claude's ability to validate the posting.

```
┌──────────────────────────────────────────────────────────────────┐
│           STRANGER TRANSACTION FLOW                               │
│                                                                   │
│  New transaction: "FIGMA INC. -150.00 USD"                        │
│           │                                                       │
│           ▼                                                       │
│  Step 1: Rule engine                                              │
│    No rule matches "FIGMA" → pass through                         │
│           │                                                       │
│           ▼                                                       │
│  Step 2: Multi-factor matcher                                     │
│    Finds bilag candidate: "Figma subscription, kr 1,620"          │
│    Score: 0.78 (MEDIUM — amount match + date proximity)           │
│           │                                                       │
│           ▼                                                       │
│  Step 3: Cluster lookup                                           │
│    If the bilag would be posted to 6540/IT:                       │
│      → Is the 6540/IT cluster STRONG?                             │
│      → Does FIGMA fit the cluster profile?                        │
│        ✓ Direction: debit (cluster: 100% debit)                   │
│        ✓ Amount: kr 1,620 (cluster: kr 49–2,890)                  │
│        ✓ Type: software subscription (similar merchants)          │
│      → Cluster fit score: HIGH                                    │
│           │                                                       │
│           ▼                                                       │
│  Step 4: Decision                                                 │
│    Multi-factor score: 0.78 (MEDIUM)                              │
│    Cluster fit: HIGH on STRONG cluster                            │
│    → Eligible for batch auto-posting with Claude validation       │
│           │                                                       │
│           ▼                                                       │
│  Step 5: Batch + Claude validation (see next section)             │
│    Claude receives the transaction + cluster context              │
│    Claude approves or flags                                       │
└──────────────────────────────────────────────────────────────────┘
```

**Critical safety property**: Clusters NEVER generate matches. They only provide
contextual validation for matches that the multi-factor scorer already found. A
transaction with no bilag candidate is never auto-posted, regardless of cluster
strength.

### Transaction–Cluster Fit Scoring

When checking if a stranger transaction fits a cluster, the system scores the fit
across the cluster's statistical profile:

```
┌──────────────────────────────────────────────────────────────────┐
│              CLUSTER FIT SCORING                                  │
│                                                                   │
│  Given: transaction T, candidate cluster C                        │
│                                                                   │
│  direction_fit:                                                   │
│    T.direction matches C.dominant_direction (>90% of points)?     │
│    YES → 1.0    NO → 0.0                                          │
│                                                                   │
│  amount_fit:                                                      │
│    T.amount within C.amount_range (p5 to p95)?                    │
│    YES → 1.0                                                      │
│    Within 2× range → 0.5                                          │
│    Outside → 0.0                                                  │
│                                                                   │
│  description_similarity:                                          │
│    max(SequenceMatcher(T.description_key, point.description_key)) │
│    across all points in cluster                                   │
│    If any point has similarity > 0.5 → use that score             │
│    Otherwise → 0.0                                                │
│                                                                   │
│  cluster_fit = direction_fit × 0.3                                │
│              + amount_fit × 0.4                                   │
│              + description_similarity × 0.3                       │
│                                                                   │
│  FIT LEVELS:                                                      │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  fit ≥ 0.70  →  HIGH (strong contextual support)        │     │
│  │  fit ≥ 0.40  →  PARTIAL (some support, needs review)    │     │
│  │  fit < 0.40  →  NONE (cluster doesn't help here)        │     │
│  └──────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

### Per-Transaction Readiness (Replaces Global Maturity Threshold)

Instead of a single "is the company mature?" gate, each transaction gets its own
readiness assessment based on how much evidence Ciri has for that specific decision:

```
┌──────────────────────────────────────────────────────────────────┐
│           PER-TRANSACTION READINESS                               │
│                                                                   │
│  TIER 1 — DIRECT RULE MATCH                                      │
│    A tested rule with <20% override rate matches directly.        │
│    Readiness: HIGH                                                │
│    Action: Apply immediately (IGNORE/CATEGORY rules) or           │
│            include in auto-post batch (AUTO_MATCH rules)          │
│                                                                   │
│  TIER 2 — STRONG CLUSTER + BILAG MATCH                            │
│    No rule matches, but:                                          │
│      ✓ Multi-factor matcher found a bilag (score ≥ 0.65)         │
│      ✓ Destination cluster is STRONG (strength ≥ 0.75)           │
│      ✓ Transaction fits the cluster (fit ≥ 0.70)                 │
│    Readiness: MEDIUM-HIGH                                         │
│    Action: Include in auto-post batch. Claude receives cluster    │
│            context for informed validation.                        │
│                                                                   │
│  TIER 3 — GROWING CLUSTER + BILAG MATCH                           │
│    No rule, but:                                                  │
│      ✓ Multi-factor matcher found a bilag (score ≥ 0.65)         │
│      ✓ Destination cluster is GROWING (strength ≥ 0.50)          │
│      ◉ Cluster fit is partial or cluster isn't strong yet         │
│    Readiness: MEDIUM                                              │
│    Action: Suggest to user. Show cluster context as supporting    │
│            evidence ("Ciri har postert 12 lignende transaksjoner  │
│            til 6540 — IT-kostnader").                              │
│                                                                   │
│  TIER 4 — NO CLUSTER SUPPORT                                      │
│    No rule matches. Either:                                       │
│      ✗ No bilag candidate found, OR                               │
│      ✗ Destination cluster is WEAK/non-existent, OR               │
│      ✗ Transaction doesn't fit any cluster                        │
│    Readiness: LOW                                                 │
│    Action: Suggest if bilag found, otherwise flag as unmatched.   │
│            NEVER auto-post. This is novel territory for Ciri.     │
│                                                                   │
│  GLOBAL MINIMUM (safety floor):                                   │
│    Even for Tier 1 and 2, autonomous posting requires:            │
│      ✓ Company in AUTONOMOUS mode                                 │
│      ✓ At least 5 non-overridden rules exist                     │
│      ✓ At least 1 STRONG cluster exists                           │
│      ✓ Claude validation passes (always — never skip this)        │
│    These ensure Ciri doesn't go autonomous from one lucky rule.   │
└──────────────────────────────────────────────────────────────────┘
```

### Batch Auto-Posting with Cluster Context

All autonomous posting happens in **batches**, never one-off. This enables prompt
caching and gives Claude the full picture instead of isolated decisions.

```
┌──────────────────────────────────────────────────────────────────┐
│           BATCH AUTO-POSTING PIPELINE                             │
│                                                                   │
│  Trigger: Scheduled (e.g., daily at 06:00) or manual via API      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐       │
│  │ Phase 1: COLLECT                                       │       │
│  │                                                         │       │
│  │  Query all unmatched, non-private transactions          │       │
│  │  For each, compute readiness tier (1–4)                 │       │
│  │  Collect TIER 1 + TIER 2 into the batch                 │       │
│  │  TIER 3-4 are excluded from batch (suggest only)        │       │
│  └────────────────────────────┬───────────────────────────┘       │
│                               │                                   │
│  ┌────────────────────────────▼───────────────────────────┐       │
│  │ Phase 2: BUILD CLUSTER SUMMARIES                        │       │
│  │                                                         │       │
│  │  For each unique cluster referenced by batch items:     │       │
│  │    Compute cluster summary:                             │       │
│  │      - Total confirmed postings                         │       │
│  │      - Distinct merchants seen                          │       │
│  │      - Amount range (p5–p95)                            │       │
│  │      - Override rate                                    │       │
│  │      - Typical account + category                       │       │
│  │      - 3 example merchants                              │       │
│  │                                                         │       │
│  │  These summaries are STATIC across the batch and are    │       │
│  │  the ideal candidate for prompt caching.                │       │
│  └────────────────────────────┬───────────────────────────┘       │
│                               │                                   │
│  ┌────────────────────────────▼───────────────────────────┐       │
│  │ Phase 3: CLAUDE VALIDATION                              │       │
│  │                                                         │       │
│  │  Prompt structure (optimized for caching):              │       │
│  │                                                         │       │
│  │  ┌─ CACHED (cache_control: ephemeral) ───────────────┐ │       │
│  │  │                                                    │ │       │
│  │  │  System instructions:                              │ │       │
│  │  │    "Du er Ciri, AI-regnskapsfører..."              │ │       │
│  │  │                                                    │ │       │
│  │  │  Cluster summaries:                                │ │       │
│  │  │    Cluster "6540 IT": 18 postings, 5 merchants,    │ │       │
│  │  │      kr 49–2890, 0% override. Ex: ANTHROPIC,       │ │       │
│  │  │      GITHUB, SPOTIFY.                              │ │       │
│  │  │    Cluster "6300 Leie": 12 postings, 2 merchants,  │ │       │
│  │  │      kr 8000–15000, 0% override. Ex: ENTRA EIENDOM │ │       │
│  │  │    Cluster "7700 Privat": ...                       │ │       │
│  │  │                                                    │ │       │
│  │  │  Norwegian accounting rules:                       │ │       │
│  │  │    (Standard kontoplan reference for validation)    │ │       │
│  │  │                                                    │ │       │
│  │  └────────────────────────────────────────────────────┘ │       │
│  │                                                         │       │
│  │  ┌─ NOT CACHED (changes per batch) ──────────────────┐ │       │
│  │  │                                                    │ │       │
│  │  │  Transactions to validate:                         │ │       │
│  │  │    1. FIGMA INC. -1620 → 6540 (cluster fit: HIGH)  │ │       │
│  │  │    2. ADOBE SYSTEMS -599 → 6540 (cluster fit: HIGH)│ │       │
│  │  │    3. MEED AS +45000 → 3000 (rule: "MEED AS")      │ │       │
│  │  │                                                    │ │       │
│  │  │  For each: tier, confidence_score, cluster_fit,    │ │       │
│  │  │           suggested_account, matching_rule or       │ │       │
│  │  │           cluster_name                             │ │       │
│  │  │                                                    │ │       │
│  │  └────────────────────────────────────────────────────┘ │       │
│  │                                                         │       │
│  │  Claude responds with:                                  │       │
│  │    { approved: bool, flagged_indices: [...],            │       │
│  │      corrections: [...], reasoning: "..." }             │       │
│  │                                                         │       │
│  │  Model: claude-haiku-4-5-20251001 (structured task)     │       │
│  │  Cost: ~$0.001/batch (cached) vs $0.01/batch (no cache)│       │
│  └────────────────────────────┬───────────────────────────┘       │
│                               │                                   │
│  ┌────────────────────────────▼───────────────────────────┐       │
│  │ Phase 4: EXECUTE                                        │       │
│  │                                                         │       │
│  │  If Claude approved:                                    │       │
│  │    For each non-flagged transaction in batch:           │       │
│  │      → Create bilag                                     │       │
│  │      → Create posteringer (debit + credit)              │       │
│  │      → Update transaction status to MATCHED             │       │
│  │      → Record data point in cluster                     │       │
│  │      → Update rule times_applied (if Tier 1)            │       │
│  │                                                         │       │
│  │  If Claude flagged specific transactions:               │       │
│  │    → Post the approved ones                             │       │
│  │    → Move flagged ones to SUGGESTED (user review)       │       │
│  │    → Include Claude's concern in ciri_explanation       │       │
│  │                                                         │       │
│  │  If Claude rejected entire batch:                       │       │
│  │    → Post nothing                                       │       │
│  │    → Log reasoning                                      │       │
│  │    → All items become suggestions for user review       │       │
│  └────────────────────────────┬───────────────────────────┘       │
│                               │                                   │
│  ┌────────────────────────────▼───────────────────────────┐       │
│  │ Phase 5: CLUSTER UPDATE                                 │       │
│  │                                                         │       │
│  │  For each successfully posted transaction:              │       │
│  │    → Add data point to its destination cluster          │       │
│  │    → Recompute cluster strength                         │       │
│  │  This means clusters grow stronger over time as Ciri    │       │
│  │  successfully handles more transactions.                │       │
│  └────────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────┘
```

### Prompt Caching Strategy

The batch pipeline is designed for optimal Claude API cost:

```
┌──────────────────────────────────────────────────────────────────┐
│          PROMPT CACHING FOR AUTO-POSTING                          │
│                                                                   │
│  WHAT TO CACHE (cache_control: ephemeral, 5-min TTL):             │
│                                                                   │
│    1. System instructions (~500 tokens, static)                   │
│       "Du er Ciri, AI-regnskapsfører for norske småbedrifter..."  │
│                                                                   │
│    2. Cluster summaries (~200-1000 tokens, changes daily)         │
│       These change slowly — maybe 1 new data point per day.       │
│       Within a single batch run they are completely static.       │
│       Cache hit rate: ~95% within a batch.                        │
│                                                                   │
│    3. Kontoplan reference (~800 tokens, static)                   │
│       Standard Norwegian chart of accounts for validation.        │
│                                                                   │
│  WHAT NOT TO CACHE (varies per batch):                            │
│                                                                   │
│    4. Transaction list (~50-200 tokens per transaction)           │
│       These are unique to each batch. Always fresh.               │
│                                                                   │
│  COST MODEL:                                                      │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │                                                          │     │
│  │  Without caching:                                        │     │
│  │    10 transactions × ~2500 tokens prompt = 25K input     │     │
│  │    Cost: 25K × $0.25/M = $0.006 per batch                │     │
│  │                                                          │     │
│  │  With caching:                                           │     │
│  │    Cached: ~2000 tokens × $0.025/M = $0.00005            │     │
│  │    Fresh:  ~500 tokens × $0.25/M = $0.000125             │     │
│  │    Cost: ~$0.0002 per batch (30× cheaper)                │     │
│  │                                                          │     │
│  │  At 1 batch/day × 365 days:                              │     │
│  │    No cache: $2.19/year                                   │     │
│  │    Cached:   $0.07/year                                   │     │
│  │                                                          │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                   │
│  IMPLEMENTATION NOTE:                                             │
│  Prompt caching only works on the SERVER SIDE — it caches the     │
│  prompt TEXT, not the response. Each batch still gets a fresh      │
│  analysis. No stale data risk. The cluster summaries and system   │
│  instructions are simply re-read from cache instead of being      │
│  re-tokenized.                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Dangerous Edge Cases & Safeguards

```
┌──────────────────────────────────────────────────────────────────┐
│                 EDGE CASES & SAFEGUARDS                            │
│                                                                   │
│  1. FALSE FAMILIARITY                                             │
│     "APPLE" could be Apple Inc. (IT, 6540) or a grocery store.    │
│                                                                   │
│     Safeguard: Cluster fit checks AMOUNT RANGE. An Apple Store    │
│     charge for kr 12,990 does not fit the IT cluster's typical    │
│     kr 49–2,890 range → fit score drops → excluded from batch.    │
│     Claude also catches this: "Beløpet er uvanlig høyt for       │
│     IT-abonnement — kan dette være maskinvare?"                   │
│                                                                   │
│  2. AMOUNT ANOMALIES                                              │
│     Recurring vendor at unusual amount (TELIA -12,000 instead     │
│     of usual -399).                                               │
│                                                                   │
│     Safeguard: Even if a DIRECT RULE matches, cluster fit         │
│     scoring flags the amount as outside p5–p95 range.             │
│     This transaction gets downgraded from Tier 1 to Tier 3        │
│     (suggest only). Claude also reviews amount reasonableness.    │
│                                                                   │
│  3. CLUSTER CONTAMINATION                                         │
│     A wrong categorization slips through, polluting a cluster.    │
│                                                                   │
│     Safeguard: When user later corrects the posting, the data     │
│     point's was_overridden flag is set. If overrides accumulate,  │
│     cluster strength drops. At >20% override rate, the cluster    │
│     falls below the hard minimum and becomes WEAK → no longer     │
│     used for auto-posting. Self-healing.                          │
│                                                                   │
│  4. ONE-OFF TRANSACTIONS                                          │
│     A unique consulting fee from a new vendor. Doesn't fit any    │
│     pattern.                                                       │
│                                                                   │
│     Safeguard: No cluster match + no rule → Tier 4 (NEVER         │
│     auto-post). One-offs are inherently unpredictable. Ciri       │
│     suggests if a bilag is found, otherwise flags as unmatched.   │
│                                                                   │
│  5. CATEGORY BLEEDING                                             │
│     Rule for "REMA 1000 → privat" shouldn't make Ciri think      │
│     ALL grocery stores are private (business catering at Meny).   │
│                                                                   │
│     Safeguard: Clusters are keyed by (account, category), not     │
│     by merchant name. The "privat" cluster contains Rema, Kiwi,   │
│     Netflix — all confirmed private expenses. A new Meny charge   │
│     would need to match on cluster FIT (description similarity    │
│     to known private merchants). If the bilag says "Catering      │
│     for kundemøte", it won't match the private cluster's          │
│     description patterns, and Claude will catch the mismatch.     │
│                                                                   │
│  6. NEWLY AUTONOMOUS COMPANY                                      │
│     Company just switched to AUTONOMOUS mode with few clusters.   │
│                                                                   │
│     Safeguard: Global minimum requires ≥1 STRONG cluster and      │
│     ≥5 non-overridden rules. Even in AUTONOMOUS mode, Tier 3-4   │
│     transactions are NEVER auto-posted. The company starts with   │
│     a small set of auto-postable transactions and grows.          │
└──────────────────────────────────────────────────────────────────┘
```

### Database Schema (New Table)

```sql
-- Success cluster data points
CREATE TABLE cluster_data_points (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),

    -- Cluster grouping key
    account_number  VARCHAR(10) NOT NULL,
    category        VARCHAR(50) NOT NULL,

    -- Transaction snapshot
    merchant_name   VARCHAR(200),
    description_key VARCHAR(100),      -- extracted key pattern
    amount          NUMERIC(15,2) NOT NULL,
    direction       VARCHAR(10) NOT NULL,  -- 'debit' or 'credit'

    -- Source tracking
    source          VARCHAR(30) NOT NULL,  -- 'user_confirmed', 'auto_confirmed', 'rule_applied'
    match_id        UUID REFERENCES reconciliation_matches(id),
    rule_id         UUID REFERENCES reconciliation_rules(id),
    transaction_id  UUID REFERENCES bank_transactions(id),

    -- Lifecycle
    confirmed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    was_overridden  BOOLEAN NOT NULL DEFAULT FALSE,
    overridden_at   TIMESTAMPTZ,

    -- Indexes
    -- CREATE INDEX idx_cdp_company_cluster ON cluster_data_points(company_id, account_number, category);
    -- CREATE INDEX idx_cdp_company_recent ON cluster_data_points(company_id, confirmed_at DESC);
);
```

### Computed Cluster View (Materialized or Query)

```sql
-- Computed cluster summaries (refresh periodically or on demand)
SELECT
    company_id,
    account_number,
    category,
    COUNT(*) AS total_points,
    COUNT(DISTINCT merchant_name) AS distinct_merchants,
    COUNT(*) FILTER (WHERE was_overridden) AS overridden_count,
    MIN(amount) AS amount_min,
    MAX(amount) AS amount_max,
    PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY amount) AS amount_p5,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY amount) AS amount_p95,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY amount) AS amount_median,
    MODE() WITHIN GROUP (ORDER BY direction) AS dominant_direction,
    COUNT(*) FILTER (WHERE confirmed_at > NOW() - INTERVAL '90 days')::FLOAT
        / GREATEST(COUNT(*), 1) AS recency_ratio,
    MAX(confirmed_at) AS last_confirmed_at,
    MIN(confirmed_at) AS first_confirmed_at
FROM cluster_data_points
WHERE company_id = :company_id
GROUP BY company_id, account_number, category;
```

### Implementation Plan

| Priority | Task | File(s) | Notes |
|----------|------|---------|-------|
| 1 | Create `ClusterDataPoint` model | `models/cluster_data_point.py` | New SQLAlchemy model matching schema above |
| 2 | Create `ClusterService` | `services/cluster_service.py` | `record_data_point()`, `get_cluster_summary()`, `compute_strength()`, `score_fit()` |
| 3 | Hook into confirm/reject flow | `api/bank.py` | On confirm → `record_data_point()`. On override → set `was_overridden` |
| 4 | Hook into rule application | `services/reconciliation_matcher.py` | When IGNORE/CATEGORY rule fires → record data point |
| 5 | Add readiness tier computation | `services/autonomous_posting.py` | Replace `maturity_checker()` with per-transaction `compute_readiness_tier()` |
| 6 | Rewrite `create_posting_bundle()` | `services/autonomous_posting.py` | Tier-based collection instead of global maturity gate |
| 7 | Update Claude validation prompt | `services/autonomous_posting.py` | Add cluster summaries to cached prompt section |
| 8 | Add cluster stats to regler page | `api/bank.py`, `frontend/.../regler/page.tsx` | Show cluster strength visualization |
| 9 | Backfill existing confirmations | Migration script | Create data points from existing `reconciliation_matches` with status CONFIRMED/AUTO_CONFIRMED |
