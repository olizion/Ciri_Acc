# API Test Specification — Ciri Backend

> **This file is the single source of truth for API regression testing.**
> The Backend Architect (B personality) MUST read this file before implementing or modifying any API endpoint.
> After implementation, ALL relevant test categories below MUST pass before the work is considered done.

## Run Tests

```bash
docker-compose exec backend pytest tests/ -v --tb=short
```

---

## 1. Contract Tests (Response Schema)

Every API endpoint must have a contract test that validates:

- **Status codes** — correct codes for success, validation error, not found, conflict
- **Response shape** — all documented fields present, correct types, no extra fields leaking
- **Pagination** — `items`, `total`, `page`, `page_size` structure when paginated
- **Error format** — `{"detail": "..."}` for HTTPException, `{"detail": [{"loc":[], "msg":"", "type":""}]}` for validation

```
tests/
  contracts/
    test_bilag_contract.py
    test_bank_contract.py
    test_invoices_contract.py
    test_employees_contract.py
    test_mva_contract.py
    test_amelding_contract.py
    test_reports_contract.py
    test_ocr_contract.py
```

### What to assert per endpoint:

| Method | Assert |
|---|---|
| GET (list) | 200 + array shape, pagination fields, filter params work |
| GET (detail) | 200 + full object shape, 404 for missing UUID |
| POST | 201 + created object returned, 422 for bad payload |
| PATCH | 200 + updated fields reflected, 404 for missing, 422 for bad payload |
| DELETE | 200/204 + soft-delete (record still in DB with `deleted_at` set) |

---

## 2. Bokføringsloven Compliance Tests

**CRITICAL.** These tests enforce Norwegian bookkeeping law. They are non-negotiable.

```
tests/
  compliance/
    test_reversal_repost.py      # § 13 — no mutation, only reversal + new entry
    test_audit_trail.py          # § 13a — every change traced
    test_bilag_linkage.py        # § 10 — every postering has a bilag
    test_timeliness.py           # § 7 — deadline warnings
    test_completeness.py         # § 6 — no silent failures
    test_soft_delete_only.py     # § 13 — nothing truly deleted
```

### § 13 — Reversal & Repost (test_reversal_repost.py)

For each financial endpoint (bilag, posteringer, invoices, bank reconciliation):

1. **PATCH must NOT mutate the original record.**
   - Create a record → PATCH it → assert original row unchanged in DB
   - Assert a reversal entry exists (negating the original amounts)
   - Assert a new corrected entry exists with the updated values
   - Assert all three entries share a `correction_chain_id` or equivalent link

2. **DELETE must soft-delete, never hard-delete.**
   - Create a record → DELETE it → assert `deleted_at IS NOT NULL`
   - Assert the record is excluded from GET list responses
   - Assert the record is still retrievable via admin/audit queries

3. **Amounts must net to zero after correction.**
   - Create postering (debit 1000) → correct to 1500 → assert: original(1000) + reversal(-1000) + new(1500) = net 1500

### § 13a — Audit Trail (test_audit_trail.py)

- Every POST/PATCH/DELETE on financial data must produce an audit log entry
- Audit entry contains: `actor`, `timestamp`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `reason`
- `timestamp` is server-generated, immutable, UTC
- Audit records themselves can NEVER be deleted or modified

### § 10 — Bilag Linkage (test_bilag_linkage.py)

- Creating a postering without a valid `bilag_id` must fail (422)
- Deleting a bilag that has linked posteringer must fail (409 Conflict)
- Orphan detection: query for posteringer with null/invalid bilag_id returns empty

### § 6 — Completeness (test_completeness.py)

- API errors must never silently swallow financial data
- If a batch operation partially fails, successful items are committed, failed items are returned with error details
- Transaction boundaries: multi-step financial operations use DB transactions — if step 3 of 4 fails, steps 1-2 roll back

---

## 3. Idempotency Tests

```
tests/
  idempotency/
    test_idempotent_creates.py
```

- POST with same `Idempotency-Key` header twice → returns same response, creates only one record
- POST with same body but different key → creates two records
- POST with same key but different body → returns 409 Conflict
- Idempotency keys expire after 24h

---

## 4. Data Integrity Tests

```
tests/
  integrity/
    test_uuid_primary_keys.py    # All PKs are UUIDs
    test_decimal_money.py        # All monetary fields are Decimal, never float
    test_cascade_safety.py       # FK cascades don't accidentally delete financial data
    test_concurrent_access.py    # SELECT FOR UPDATE prevents race conditions
```

### Monetary precision (test_decimal_money.py)

- Create a postering with amount `0.1 + 0.2` → assert stored as `Decimal("0.30")`, not `0.30000000000000004`
- All monetary response fields are strings or Decimal-serialized (never JSON float)

### Cascade safety (test_cascade_safety.py)

- Deleting a company must NOT cascade-delete bilag, posteringer, or bank transactions
- Deleting a bank account must NOT cascade-delete reconciled transactions
- FK violations return 409, not 500

---

## 5. Auth & Access Tests

```
tests/
  auth/
    test_company_isolation.py    # Company A cannot see Company B's data
    test_auth_required.py        # Protected endpoints return 401 without token
```

- Every financial endpoint scoped by `company_id` — cross-company access returns 404 (not 403, to prevent enumeration)
- System-level endpoints (health, auth) do not require company context

---

## 6. Edge Case Tests

```
tests/
  edge_cases/
    test_empty_states.py         # GET list with no data returns [] not error
    test_large_payloads.py       # Upload limits enforced, no OOM
    test_unicode_handling.py     # Norwegian chars (æøå) in all text fields
    test_date_boundaries.py      # Year-end, leap year, timezone edge cases
```

---

## Test Fixtures & Utilities

```
tests/
  conftest.py                    # Shared fixtures: test DB session, test client, seed data
  factories.py                   # Factory functions for creating test entities
```

### conftest.py must provide:

- `async_client` — `httpx.AsyncClient` pointed at test app
- `db_session` — Async SQLAlchemy session with transaction rollback after each test
- `seed_company` — A default test company
- `seed_bilag` — A bilag with linked posteringer
- `auth_headers` — Valid auth headers for the test company

### factories.py must provide:

- `make_bilag(**overrides)` → creates a valid Bilag with all required fields
- `make_postering(**overrides)` → creates a valid Postering linked to a bilag
- `make_bank_transaction(**overrides)` → creates a valid BankTransaction
- `make_invoice(**overrides)` → creates a valid Invoice
- `make_employee(**overrides)` → creates a valid Employee

---

## Regression Gate

Before any API PR is considered complete, the Backend Architect MUST:

1. Run `pytest tests/ -v` — all tests pass
2. Run `pytest tests/compliance/ -v` — all compliance tests pass specifically
3. Confirm no new endpoints lack contract tests
4. Confirm no financial endpoints lack reversal/audit tests

If a test fails, the code is wrong — not the test. Fix the code.
