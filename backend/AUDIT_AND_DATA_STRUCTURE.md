# Ciri — Audit Trail & Data Structure

> System architecture documentation for compliance review.
> Generated 2026-03-27. Covers all backend models, audit trails, retention lifecycle, and data flow paths.

---

## Directory Tree

```
backend/
├── main.py                          # FastAPI app, lifespan, middleware, routers
├── config/
│   ├── settings.py                  # Pydantic env-based config
│   ├── database.py                  # SQLAlchemy async engine + session factory
│   ├── redis.py                     # Redis cache client
│   └── cache.py                     # Cache key builder, TTL config
├── dependencies/
│   ├── auth.py                      # JWT validation → AuthenticatedUser
│   └── company.py                   # Company resolution (JWT or debug fallback)
├── middleware/
│   ├── audit.py                     # HTTP-level audit logging (Bokforingsloven §4)
│   └── rate_limit.py                # Redis-backed rate limiter
├── models/
│   ├── __init__.py                  # Model registry + retention listeners
│   ├── mixins.py                    # RetentionMixin + retention computation
│   ├── user.py                      # User account
│   ├── company.py                   # Company + audit hold
│   ├── audit_log.py                 # Immutable audit log (§4)
│   ├── bilag.py                     # Voucher/receipt (§5-1-1)
│   ├── postering.py                 # Journal entry — IMMUTABLE (§6)
│   ├── konto.py                     # Chart of accounts (NS 4102)
│   ├── employee.py                  # Employee + Payslip
│   ├── invoice.py                   # Outgoing invoices
│   ├── bank_account.py              # Connected bank accounts
│   ├── bank_transaction.py          # Imported transactions
│   ├── reconciliation_match.py      # Bilag ↔ Transaction matches
│   ├── reconciliation_rule.py       # User/Ciri matching rules
│   ├── cluster_data_point.py        # ML training data for auto-posting
│   ├── email_connection.py          # OAuth email integrations
│   ├── notification.py              # In-app notifications
│   ├── amelding_submission.py       # A-melding payroll filings — IMMUTABLE
│   ├── mva_submission.py            # MVA returns — IMMUTABLE
│   └── system_user.py               # Altinn system user delegations
├── api/
│   ├── auth.py                      # Login, register, token refresh
│   ├── company.py                   # Company setup, Bronnysund lookup
│   ├── bilag.py                     # Upload, approve, post, pay, correct
│   ├── bank.py                      # Accounts, transactions, reconciliation, rules
│   ├── employees.py                 # CRUD, tax card lookup
│   ├── invoices.py                  # Create, send, public view, mark paid
│   ├── reports.py                   # Balance sheet, income, SAF-T, hovedbok
│   ├── ocr.py                       # Claude vision invoice parsing
│   ├── amelding.py                  # Preview, submit to Skatteetaten
│   ├── mva.py                       # Preview, validate, submit VAT return
│   ├── altinn.py                    # System user registration
│   ├── ciri.py                      # AI chat + suggestions
│   ├── email_oauth.py               # Google/Microsoft OAuth flows
│   ├── email_webhook.py             # Inbound email processing
│   └── notifications.py             # List, mark read
├── services/
│   ├── invoice_processor.py         # Bilag → Posteringer double-entry engine
│   ├── reconciliation_matcher.py    # Multi-factor matching algorithm
│   ├── autonomous_posting.py        # Tier-based auto-posting pipeline
│   ├── cluster_service.py           # Success cluster analysis
│   ├── rule_cascade.py              # Rule application cascading
│   ├── retention_service.py         # GDPR purge cycle
│   ├── audit_trail.py               # Domain-level audit events
│   ├── journal_validation.py        # Debit=credit balance enforcement
│   ├── encryption.py                # Fernet PII encryption
│   ├── maskinporten.py              # Norwegian gov API auth (JWT)
│   ├── skatteetaten.py              # Tax card API
│   ├── amelding_service.py          # A-melding XML builder + submission
│   ├── mva_service.py               # MVA XML builder + Altinn submission
│   ├── mva_xml_builder.py           # MvaMelding XML construction
│   ├── saft_export.py               # SAF-T Financial v1.30 XML
│   ├── saft_mappings.py             # NS 4102 → RF-1167 mappings
│   ├── saft_validation.py           # Pre-export validation
│   ├── email_sender.py              # SMTP / Resend outbound email
│   ├── altinn_systemuser.py         # Altinn system user management
│   └── bank_integration/            # Multi-provider bank abstraction
├── tasks/
│   ├── retention_cleanup_task.py    # Daily purge at 02:00
│   ├── batch_reconciliation_task.py # Claude matching every 30 min
│   ├── bank_sync.py                 # Bank transaction polling
│   ├── email_monitor_task.py        # Inbox polling for invoices
│   └── weekly_summary_task.py       # Summary email generation
├── migrations/                      # Alembic database migrations
├── scripts/
│   ├── test_audit_trail.py          # Audit trail verification
│   ├── test_autonomous_posting.py   # Full pipeline test
│   ├── test_integration.py          # 101-check integration test
│   └── test_retention_lifecycle.py  # Retention + purge E2E test
└── seed_data.py                     # Idempotent test data seeder
```

---

## Entity Relationship Map

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Company    │────<│    User      │     │  AuditLog    │
│             *│     │              │     │  (IMMUTABLE) │
└──────┬──────┘     └──────────────┘     └──────────────┘
       │
       │ company_id (FK on all below)
       │
       ├──────── Bilag ──────────< Postering (IMMUTABLE)
       │         (voucher)         (journal entry)
       │           │                  │
       │           │ bilag_id         │ bilag_id (two-way §6)
       │           │                  │
       │           ├── approved_by    ├── created_by_user
       │           ├── posted_by      ├── created_by_ciri
       │           ├── created_by_user├── saft_transaction_id
       │           └── file_hash      └── journal_id
       │
       ├──────── BankAccount ────< BankTransaction
       │         (connection)      (imported tx)
       │                              │
       │                              ├── reconciled_by_user
       │                              ├── reconciled_by_ciri
       │                              ├── private_marked_by_user
       │                              └── reconciliation_status
       │                                    │
       │                              ReconciliationMatch
       │                              (bilag ↔ transaction)
       │                                    │
       │                              ├── confirmed_by (user UUID)
       │                              ├── confidence_score
       │                              └── learned_rule_id
       │                                    │
       │                              ReconciliationRule
       │                              ├── created_by (user UUID)
       │                              ├── times_applied
       │                              └── times_overridden
       │                                    │
       │                              ClusterDataPoint
       │                              ├── confirmed_by (user UUID)
       │                              ├── overridden_by (user UUID)
       │                              └── source (enum)
       │
       ├──────── Employee ───────< Payslip
       │         (personnel)       (monthly pay)
       │         │                    │
       │         └── created_by       └── payment_reference
       │
       ├──────── Invoice
       │         (outgoing faktura)
       │         ├── created_by_user
       │         ├── sent_by
       │         └── view_token (public access)
       │
       ├──────── AMeldingSubmission (IMMUTABLE)
       │         (payroll filing)
       │         ├── submitted_by
       │         └── submitted_by_ciri
       │
       ├──────── MVASubmission (IMMUTABLE)
       │         (VAT return)
       │         ├── submitted_by
       │         └── submitted_by_ciri
       │
       ├──────── Konto (chart of accounts, NS 4102)
       ├──────── EmailConnection (OAuth tokens)
       ├──────── Notification (in-app alerts)
       └──────── SystemUser (Altinn delegations)
```

---

## Audit Trail Architecture

### Two layers of audit logging

**Layer 1 — HTTP Middleware** (`middleware/audit.py`)
Captures every non-GET mutating request. Writes to `audit_logs` table.

```
Request → AuditMiddleware → Extract JWT user_id → Log to DB → Response
```

Fields captured: `user_id`, `company_id`, `action` (create/update/delete), `resource_type`, `resource_id`, `ip_address`, `user_agent`, `duration_ms`, `status_code`, `request_id`.

**Layer 2 — Domain Events** (`services/audit_trail.py`)
Captures business-level state transitions with actor attribution.

```python
await log_domain_event(
    db, action="bilag:posted", resource_type="bilag",
    resource_id=bilag.id, user_id=actor, company_id=...,
    details={"bilag_number": "2025-00042", "posteringer_count": 3},
)
```

Domain events currently logged:

| Event | Trigger |
|-------|---------|
| `bilag:approved` | User approves a pending bilag |
| `bilag:posted` | Bilag posted with journal entries |
| `bilag:rejected` | User rejects with reason |
| `invoice:sent` | Invoice emailed to customer |
| `invoice:paid` | Invoice marked as paid |
| `reconciliation:confirmed` | Match confirmed (user or Ciri) |
| `reconciliation:rejected` | Match rejected with reason |
| `autonomous:posted` | Ciri auto-posts a transaction batch |
| `retention_purge` | Nightly purge cycle summary |

### AuditLog immutability

```python
@event.listens_for(AuditLog, "before_update")
def prevent_update(...):
    raise ValueError("AuditLog records cannot be updated")

@event.listens_for(AuditLog, "before_delete")
def prevent_delete(...):
    raise ValueError("AuditLog records cannot be deleted")
```

---

## Per-Model Audit Trail Coverage

### Bilag (voucher)

| Field | Type | Purpose |
|-------|------|---------|
| `created_at` | DateTime(TZ) | When uploaded/created |
| `updated_at` | DateTime(TZ) | Last modification |
| `receipt_date` | DateTime(TZ) | When document was received |
| `posted_at` | DateTime(TZ) | When posted to accounts |
| `approved_at` | DateTime(TZ) | When approved |
| `created_by_user` | UUID | User who created (null if Ciri) |
| `approved_by` | UUID | User who approved |
| `posted_by` | UUID | User who posted |
| `created_by_ciri` | bool | True if AI-created |
| `ciri_confidence` | Decimal | AI confidence 0.0-1.0 |
| `ciri_reasoning` | Text | AI explanation (Norwegian) |
| `file_hash_sha256` | String(64) | Document integrity check |
| `bilag_number` | String(20) | Sequential: `2025-00001` (§5-1-3) |

**Status lifecycle**: `PENDING → APPROVED → POSTED` or `PENDING → REJECTED`

### Postering (journal entry) — IMMUTABLE

| Field | Type | Purpose |
|-------|------|---------|
| `created_at` | DateTime(TZ) | When created (never changes) |
| `created_by_user` | UUID | User who triggered posting |
| `created_by_ciri` | bool | True if AI-posted |
| `bilag_id` | UUID FK | Two-way link to source document (§6) |
| `journal_id` | String | Groups related entries |
| `saft_transaction_id` | String | SAF-T audit reference (unique) |
| `posting_date` | Date | Accounting date |
| `period` | String | `"2025-01"` format |

**Immutability enforcement** (Bokforingsloven §6):
- `before_update` listener blocks all changes except retention metadata fields
- `before_delete` listener raises ValueError unconditionally
- Corrections create new reversing entries, never modify originals

**Auto-retention**: `after_insert` listener auto-sets `fiscal_year` and `retention_expires_at` from `posting_date`.

### BankTransaction

| Field | Type | Purpose |
|-------|------|---------|
| `imported_at` | DateTime(TZ) | When imported from bank |
| `updated_at` | DateTime(TZ) | Last modification |
| `reconciled_at` | DateTime(TZ) | When reconciliation confirmed |
| `reconciled_by_ciri` | bool | True if auto-matched |
| `reconciled_by_user` | UUID | User who confirmed match |
| `private_marked_at` | DateTime(TZ) | When marked as non-business |
| `private_marked_by_ciri` | bool | True if Ciri marked it |
| `private_marked_by_user` | UUID | User who marked it |
| `last_match_attempt_at` | DateTime(TZ) | Last matching attempt |

### Invoice (outgoing)

| Field | Type | Purpose |
|-------|------|---------|
| `created_at` | DateTime(TZ) | When drafted |
| `updated_at` | DateTime(TZ) | Last modification |
| `sent_at` | DateTime(TZ) | When emailed |
| `viewed_at` | DateTime(TZ) | First customer view |
| `paid_at` | DateTime(TZ) | When marked paid |
| `created_by_user` | UUID | User who created |
| `sent_by` | UUID | User who sent |
| `viewed_count` | int | Total view count |

### Employee / Payslip

| Field | Type | Purpose |
|-------|------|---------|
| `created_at` | DateTime(TZ) | When record created |
| `updated_at` | DateTime(TZ) | Last modification |
| `created_by` | UUID FK | User who registered employee |
| `tax_card_fetched_at` | DateTime(TZ) | Last Skatteetaten lookup |

### AMeldingSubmission / MVASubmission — IMMUTABLE

| Field | Type | Purpose |
|-------|------|---------|
| `created_at` | DateTime(TZ) | When draft created |
| `submitted_at` | DateTime(TZ) | When submitted to Skatteetaten |
| `submitted_by` | UUID | User who submitted |
| `submitted_by_ciri` | bool | True if automated |
| `payload_hash_sha256` | String | Payload integrity hash |

**Immutability**: `before_update` blocks all changes except `status`, `rejection_reason`, and retention fields. `before_delete` raises unconditionally.

### ReconciliationMatch

| Field | Type | Purpose |
|-------|------|---------|
| `created_at` | DateTime(TZ) | When match suggested |
| `confirmed_at` | DateTime(TZ) | When confirmed/rejected |
| `confirmed_by` | UUID | User who acted (null for Ciri) |
| `confidence_score` | Decimal | Algorithm confidence 0.0-1.0 |
| `match_factors` | JSONB | Scoring breakdown |
| `ciri_explanation` | Text | AI explanation (Norwegian) |
| `user_feedback` | Text | Rejection reason if rejected |

### ClusterDataPoint

| Field | Type | Purpose |
|-------|------|---------|
| `confirmed_at` | DateTime(TZ) | When data point confirmed |
| `confirmed_by` | UUID | User who confirmed |
| `overridden_at` | DateTime(TZ) | When prediction was overridden |
| `overridden_by` | UUID | User who corrected |
| `source` | Enum | USER_CONFIRMED, AUTO_CONFIRMED, RULE_APPLIED, MANUAL_MATCH |

---

## Retention & GDPR Lifecycle

### Legal retention periods

| Category | Years | Law | Models |
|----------|-------|-----|--------|
| `regnskap` | 5 | Bokforingsloven §13(1) nr. 1-4 | Bilag, Postering, Invoice, BankTransaction |
| `lonn` | 5 | Bokforingsloven §13(1) nr. 3 | Employee, Payslip |
| `amelding` | 5 | Bokforingsloven §13(1) nr. 3 | AMeldingSubmission |
| `mva` | 10 | Bokforingsforskriften §7-3 | MVASubmission |
| `avtale` | 4 | Bokforingsloven §13(1) nr. 5 | (contracts, future use) |

### Expiry calculation

```
fiscal_year=2025, category="regnskap"
→ 2025 + 5 years + 1 = 2031
→ expires 2031-01-31 (Jan 31 buffer past fiscal year end)
```

### Retention fields (RetentionMixin)

Every retention-tracked model has:

```
fiscal_year          — Which fiscal year this data belongs to
retention_category   — "regnskap", "lonn", "amelding", "mva"
retention_expires_at — Date when purge is allowed (indexed)
audit_hold           — Per-record hold (blocks purge)
purged_at            — Timestamp when PII was nulled
```

### Company-level audit hold

```
Company.audit_hold_active       — Master kill-switch (Skatteforvaltningsloven §11-3)
Company.audit_hold_reason       — "Bokettersyn varsel mottatt 2026-01-15"
Company.audit_hold_activated_at — When hold began
Company.audit_hold_activated_by — Who activated it (user UUID)
```

When active, ALL purge operations skip this company's records regardless of `retention_expires_at`.

### Purge process (daily at 02:00)

```
RetentionService.run_purge_cycle()
  │
  ├── Check Company.audit_hold_active for all companies
  │
  ├── For each model (Bilag, Employee, Payslip, Invoice, BankTransaction, AMelding, MVA):
  │     SELECT WHERE retention_expires_at < today
  │                AND audit_hold = false
  │                AND purged_at IS NULL
  │     │
  │     ├── Skip if company has audit hold
  │     └── Soft-purge: null PII fields, set purged_at = now()
  │
  ├── Delete physical bilag files from disk
  │
  ├── Purge AuditLog PII (ip_address, user_agent) older than 5 years
  │    (uses raw SQL to bypass ORM immutability guard)
  │
  └── Log purge summary to AuditLog
```

### What gets purged per model

| Model | PII nulled | Preserved |
|-------|-----------|-----------|
| **Bilag** | counterparty_name, counterparty_org_number, ocr_text, file_path→"PURGED" | amounts, dates, bilag_number, status |
| **Employee** | personnummer→"PURGED", email, phone, bank_account, notes | name, position, salary, employment dates |
| **Payslip** | payment_reference, amelding_reference | gross_salary, tax, net_salary, year/month |
| **Invoice** | customer_name→"PURGED", customer_email→"PURGED" | amounts, invoice_number, dates |
| **BankTransaction** | raw_description→"PURGED", cleaned_description, merchant_name | amount, booking_date, reconciliation_status |
| **AMeldingSubmission** | payload_json, payload_hash_sha256 | employee_count, totals, reference |
| **MVASubmission** | melding_xml, innsending_xml | VAT amounts, reference, altinn_instance_id |
| **Postering** | **NEVER PURGED** (Bokforingsloven §6) | All fields preserved indefinitely |

---

## Data Flow Paths

### Path 1: Bilag → Posteringer (core accounting flow)

```
Upload (PDF/image)
  → OCR via Claude Vision (Haiku/Sonnet)
  → Extract: supplier, amounts, MVA code, dates
  → Create Bilag (status=PENDING)
  → set_retention(fiscal_year, "regnskap")
  → log: "bilag:created"
      │
      ▼
User reviews
  → Approve (status=APPROVED, approved_by, approved_at)
  → log: "bilag:approved"
      │
      ▼
Post to accounts
  → validate_journal_balance(posteringer)  ← rejects if debit != credit
  → Create Postering entries (double-entry):
      DEBIT  expense_account  net_amount
      DEBIT  mva_account      mva_amount
      CREDIT 2400             gross_amount
  → auto_set_postering_retention (after_insert listener)
  → Bilag status=POSTED, posted_at, posted_by
  → log: "bilag:posted"
      │
      ▼
Record payment
  → Create payment Postering entries:
      DEBIT  2400  (reduces AP)
      CREDIT 1920  (reduces bank)
  → validate_journal_balance()
```

### Path 2: Bank → Reconciliation → Match → Rule

```
Bank sync (Tink/GoCardless/direct PSD2)
  → Import BankTransaction (status=UNMATCHED)
  → set_retention(fiscal_year, "regnskap")
      │
      ▼
ReconciliationMatcher.find_matches()
  → Score factors: amount (35%), reference (30%), name (15%), date (15%)
  → Create ReconciliationMatch (status=SUGGESTED or AUTO_CONFIRMED)
  → If auto: update tx status=MATCHED, record ClusterDataPoint
  → If suggest: await user confirmation
      │
      ▼
User confirms match
  → Match status=CONFIRMED, confirmed_by, confirmed_at
  → Transaction status=MATCHED, reconciled_by_user
  → Record ClusterDataPoint (source=USER_CONFIRMED)
  → log: "reconciliation:confirmed"
  → Optionally create ReconciliationRule from pattern
      │
      ▼
User rejects match
  → Match status=REJECTED, user_feedback, reject_reason
  → Transaction status=UNMATCHED (returns to pool)
  → Update cluster data (override tracking)
  → log: "reconciliation:rejected"
```

### Path 3: Autonomous Posting Pipeline

```
check_global_minimums()
  → Need ≥5 reliable rules (override rate <20%)
  → Need ≥1 strong cluster (≥8 points, ≥3 merchants)
      │
      ▼
Verify Company.autonomy_level == AUTONOMOUS
      │
      ▼
compute_readiness_tier() per transaction:
  ┌─ Tier 1: Direct rule match (override <20%)     → Auto-post
  ├─ Tier 2: Strong cluster fit (strength ≥0.75)   → Auto-post
  ├─ Tier 3: Growing cluster (strength ≥0.50)      → Manual review
  └─ Tier 4: No cluster support                    → Never auto-post
      │
      ▼ (Tier 1 + Tier 2 only)
validate_bundle_with_claude() — Haiku with prompt caching
  → System prompt cached (ephemeral)
  → Transaction list fresh per batch
  → Response: {approved, reasoning, flagged_indices, corrections}
      │
      ▼ (only if Claude approves)
For each approved transaction:
  → Create Bilag (created_by_ciri=True, set_retention)
  → Create 2 Postering entries (auto-retention via listener)
  → Update BankTransaction (MATCHED, reconciled_by_ciri)
  → Record ClusterDataPoint (AUTO_CONFIRMED)
  → Update rule.times_applied (if Tier 1)
  → log: "autonomous:posted"
```

### Path 4: Employee → Payslip → A-melding

```
Create Employee
  → Validate 11-digit personnummer
  → Optionally fetch tax card from Skatteetaten (via Maskinporten)
  → Active employees: no retention expiry set
  → Terminated employees: set_retention(end_date.year, "lonn")
      │
      ▼
Generate monthly Payslip
  → Calculate: gross, tax_deduction, net, arbeidsgiveravgift, OTP, feriepenger
  → set_retention(year, "lonn")
      │
      ▼
Submit A-melding to Skatteetaten
  → Build XML payload (AMeldingPayloadBuilder)
  → Submit via Maskinporten → Skatteetaten API
  → Create AMeldingSubmission (IMMUTABLE after creation)
  → set_retention(fiscal_year, "amelding")
  → Store: altinn receipt, employee_count, totals
```

### Path 5: Invoice → Payment Tracking

```
Create Invoice (DRAFT)
  → Generate F-XXXX number
  → set_retention(year, "regnskap")
  → Generate view_token (32-byte random)
      │
      ▼
Send Invoice
  → Render HTML email template
  → Send via SMTP
  → status=SENT, sent_at, sent_by
  → log: "invoice:sent"
      │
      ▼
Customer views (public, no auth)
  → GET /invoices/public/{view_token}
  → Increment viewed_count
  → First view: status=VIEWED, viewed_at
  → Create Notification for company
      │
      ▼
Mark as paid
  → status=PAID, paid_at
  → Create Notification
  → log: "invoice:paid"
```

---

## Encryption

PII encryption via Fernet symmetric encryption (`services/encryption.py`).

| Function | Use |
|----------|-----|
| `encrypt_field(value)` | Encrypt PII for DB storage. Returns `enc:...` prefixed string. |
| `decrypt_field(value)` | Decrypt. Plaintext without `enc:` prefix passes through (migration-safe). |
| `encrypt_token(token)` | Encrypt OAuth tokens (base64-wrapped). |
| `decrypt_token(token)` | Decrypt OAuth tokens. |

Key derivation: PBKDF2-SHA256 from `settings.encryption_key` with fixed salt, 100k iterations → Fernet key.

**Current coverage**: OAuth tokens (EmailConnection, BankAccount). Personnummer and bank_account encryption ready but not yet wired into Employee model setters.

---

## Immutable Records

Three model types enforce immutability at the ORM level:

| Model | Updates allowed | Deletes | Corrections |
|-------|----------------|---------|-------------|
| **Postering** | Only retention fields (fiscal_year, retention_category, retention_expires_at, audit_hold, purged_at) | Never | New reversing + correcting entries |
| **AMeldingSubmission** | Only status, rejection_reason, retention fields | Never | New submission with `replaces_id` |
| **MVASubmission** | Only status, retention fields | Never | New CORRECTION type submission |
| **AuditLog** | Never | Never | N/A (append-only) |

---

## Rate Limiting

Redis-backed sliding window rate limiter (`middleware/rate_limit.py`).

| Endpoint pattern | Limit | Window |
|------------------|-------|--------|
| `/api/auth/login` | 10 requests | 60 seconds |
| `/api/auth/register` | 5 requests | 60 seconds |
| `/api/auth/forgot-password` | 3 requests | 60 seconds |
| `/api/invoices/public/` | 30 requests | 60 seconds |
| `/api/ocr/parse` | 20 requests | 60 seconds |

Falls back to in-memory dict if Redis is unavailable.

---

## Test Coverage

| Test script | Checks | Result |
|-------------|--------|--------|
| `test_integration.py` | 104 checks across 9 flows | 101 pass, 3 warnings |
| `test_audit_trail.py` | 30 checks on trails, encryption, immutability | 29 pass, 1 warning |
| `test_autonomous_posting.py` | 70+ checks on full pipeline | 66 pass (11 from legacy seed data) |
| `test_retention_lifecycle.py` | Full purge lifecycle with audit holds | Pass |
