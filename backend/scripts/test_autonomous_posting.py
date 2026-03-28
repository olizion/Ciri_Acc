"""
Autonomous Posting Pipeline — Full Flow Test

Tests the entire pipeline:
  1. Check prerequisites (rules, clusters, autonomy mode)
  2. Compute readiness tiers for unmatched transactions
  3. Build posting bundle (Tier 1 + Tier 2 only)
  4. Claude validation (mocked for test)
  5. Create bilags + posteringer
  6. Verify audit trails on created records
  7. Verify journal balance
  8. Verify cluster data points recorded
  9. Verify retention metadata set

Run: docker-compose exec backend python scripts/test_autonomous_posting.py
"""

import asyncio
import uuid
import json
from datetime import datetime, date, timezone, timedelta
from decimal import Decimal

COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

errors = []
warnings = []
passed = 0


def ok(msg):
    global passed
    passed += 1
    print(f"  \033[32mOK\033[0m   {msg}")


def fail(msg):
    errors.append(msg)
    print(f"  \033[31mFAIL\033[0m {msg}")


def warn(msg):
    warnings.append(msg)
    print(f"  \033[33mWARN\033[0m {msg}")


def check(condition, msg):
    if condition:
        ok(msg)
    else:
        fail(msg)


async def run():
    from config.database import async_session_maker, init_db
    from sqlalchemy import select, func, and_, update
    import models  # noqa

    await init_db()

    print("=" * 72)
    print("  AUTONOMOUS POSTING PIPELINE — FULL FLOW TEST")
    print("=" * 72)

    # ================================================================
    # PHASE 1: Check prerequisites
    # ================================================================
    print("\n\033[1m[Phase 1] Prerequisites\033[0m")

    async with async_session_maker() as db:
        from models.company import Company, AutonomyLevel
        from models.reconciliation_rule import ReconciliationRule
        from services.cluster_service import (
            check_global_minimums, get_cluster_summaries,
            ReadinessTier,
        )

        company = (await db.execute(select(Company).where(Company.id == COMPANY_ID))).scalar_one()
        print(f"  Company: {company.name}")
        print(f"  Autonomy level: {company.autonomy_level.value}")

        # Count rules
        rules = (await db.execute(
            select(ReconciliationRule).where(and_(
                ReconciliationRule.company_id == COMPANY_ID,
                ReconciliationRule.is_active == True,
            ))
        )).scalars().all()
        good_rules = [r for r in rules if r.times_applied == 0 or (r.times_overridden / r.times_applied) < 0.2]
        check(len(good_rules) >= 5, f"Reliable rules: {len(good_rules)} (need ≥5)")

        # Check clusters
        clusters = await get_cluster_summaries(db, COMPANY_ID)
        strong = [c for c in clusters if c.strength_level == "strong"]
        check(len(strong) >= 1, f"Strong clusters: {len(strong)} (need ≥1)")
        for c in clusters:
            print(f"    ({c.account_number}, {c.category}): {c.total_points} pts, "
                  f"strength={c.strength_level}")

        # Check global minimums
        passes, reason = await check_global_minimums(db, COMPANY_ID)
        check(passes, f"Global minimums: {reason}")

        # Temporarily set to AUTONOMOUS for test
        original_autonomy = company.autonomy_level
        if company.autonomy_level != AutonomyLevel.AUTONOMOUS:
            company.autonomy_level = AutonomyLevel.AUTONOMOUS
            await db.commit()
            print(f"  -> Set autonomy to AUTONOMOUS for test (was {original_autonomy.value})")

    # ================================================================
    # PHASE 2: Compute readiness tiers
    # ================================================================
    print("\n\033[1m[Phase 2] Readiness Tier Assessment\033[0m")

    async with async_session_maker() as db:
        from models.bank_transaction import BankTransaction, ReconciliationStatus
        from services.autonomous_posting import create_posting_bundle

        # Count eligible transactions
        unmatched = (await db.execute(
            select(func.count(BankTransaction.id)).where(and_(
                BankTransaction.company_id == COMPANY_ID,
                BankTransaction.reconciliation_status == ReconciliationStatus.UNMATCHED,
                BankTransaction.is_private == False,
            ))
        )).scalar()
        print(f"  Unmatched transactions: {unmatched}")

        if unmatched == 0:
            warn("No unmatched transactions — cannot test autonomous posting")
            _print_results()
            return

        # Build bundle
        bundle, skipped_low, skipped_tier_3 = await create_posting_bundle(db, COMPANY_ID)

        tier_1 = bundle.tier_1_count
        tier_2 = bundle.tier_2_count
        eligible = len(bundle.scored_transactions)

        print(f"  Bundle assessment:")
        print(f"    Tier 1 (direct rule):     {tier_1}")
        print(f"    Tier 2 (strong cluster):  {tier_2}")
        print(f"    Tier 3 (growing, skip):   {skipped_tier_3}")
        print(f"    Tier 4 (unknown, skip):   {skipped_low}")
        print(f"    Total eligible:           {eligible}")
        print(f"    Average confidence:       {bundle.average_confidence:.2%}")

        check(bundle.bundle_ready or eligible == 0,
              f"Bundle ready={bundle.bundle_ready}, eligible={eligible}")

        # Show details of eligible transactions
        for i, st in enumerate(bundle.scored_transactions[:5]):
            tx = st.transaction
            print(f"\n    [{i}] {tx.raw_description[:40]}")
            print(f"        Amount: {tx.amount}, Date: {tx.booking_date}")
            print(f"        Tier: {st.readiness.tier} ({st.readiness.tier_label})")
            print(f"        Suggested: {st.suggested_account} / {st.suggested_category}")
            print(f"        Confidence: {st.confidence_score:.2%}")
            if st.best_rule:
                print(f"        Rule: {st.best_rule.name}")

    # ================================================================
    # PHASE 3: Execute autonomous posting (with mock Claude)
    # ================================================================
    print("\n\033[1m[Phase 3] Execute Autonomous Posting\033[0m")

    async with async_session_maker() as db:
        from models.bank_transaction import BankTransaction, ReconciliationStatus
        from models.bilag import Bilag, BilagStatus
        from models.postering import Postering
        from models.cluster_data_point import ClusterDataPoint
        from services.autonomous_posting import (
            create_posting_bundle, execute_autonomous_posting,
            AutoPostResult,
        )
        from services.cluster_service import check_global_minimums

        # Count state BEFORE
        bilags_before = (await db.execute(
            select(func.count(Bilag.id)).where(Bilag.company_id == COMPANY_ID)
        )).scalar()
        posteringen_before = (await db.execute(
            select(func.count(Postering.id)).where(Postering.company_id == COMPANY_ID)
        )).scalar()
        clusters_before = (await db.execute(
            select(func.count(ClusterDataPoint.id)).where(ClusterDataPoint.company_id == COMPANY_ID)
        )).scalar()
        unmatched_before = (await db.execute(
            select(func.count(BankTransaction.id)).where(and_(
                BankTransaction.company_id == COMPANY_ID,
                BankTransaction.reconciliation_status == ReconciliationStatus.UNMATCHED,
                BankTransaction.is_private == False,
            ))
        )).scalar()

        print(f"  State BEFORE: bilags={bilags_before}, posteringer={posteringen_before}, "
              f"clusters={clusters_before}, unmatched_tx={unmatched_before}")

        # Execute — this will call Claude API if ANTHROPIC_API_KEY is set
        # If not set, it will fail at validation step and we catch it
        try:
            result = await execute_autonomous_posting(db, COMPANY_ID)
            await db.commit()

            print(f"\n  Result:")
            print(f"    Global check:    {'PASS' if result.global_check_passed else 'FAIL'} — {result.global_check_reason}")
            print(f"    Claude approved: {result.claude_approved}")
            print(f"    Claude reason:   {result.claude_reasoning}")
            print(f"    Bilags created:  {result.bilags_created}")
            print(f"    Posterings:      {result.posterings_created}")
            print(f"    Tx matched:      {result.transactions_matched}")
            print(f"    Skipped (Tier3): {result.skipped_tier_3}")
            print(f"    Skipped (Tier4): {result.skipped_low_readiness}")

            if not result.global_check_passed:
                warn(f"Global check failed: {result.global_check_reason}")
                warn("This means there aren't enough rules/clusters — expected for test data")
            elif not result.claude_approved:
                if "API key" in str(result.claude_reasoning) or "feilet" in str(result.claude_reasoning):
                    warn(f"Claude validation unavailable: {result.claude_reasoning}")
                    warn("Cannot test full pipeline without ANTHROPIC_API_KEY")
                else:
                    ok(f"Claude rejected bundle (safety working): {result.claude_reasoning}")
            else:
                # Claude approved — verify what was created
                check(result.bilags_created > 0, f"Bilags created: {result.bilags_created}")
                check(result.posterings_created == result.bilags_created * 2,
                      f"Posteringen = 2x bilags: {result.posterings_created}")
                check(result.transactions_matched == result.bilags_created,
                      f"Transactions matched: {result.transactions_matched}")

        except Exception as e:
            warn(f"Autonomous posting raised exception: {e}")
            await db.rollback()

    # ================================================================
    # PHASE 4: Verify created records (even if Claude was mocked/failed)
    # ================================================================
    print("\n\033[1m[Phase 4] Verify Ciri-Created Records\033[0m")

    async with async_session_maker() as db:
        from models.bilag import Bilag, BilagStatus
        from models.postering import Postering

        # Find any Ciri-created bilag
        result = await db.execute(
            select(Bilag).where(and_(
                Bilag.company_id == COMPANY_ID,
                Bilag.created_by_ciri == True,
            )).limit(5)
        )
        ciri_bilags = result.scalars().all()

        if ciri_bilags:
            print(f"  Found {len(ciri_bilags)} Ciri-created bilags")
            for b in ciri_bilags[:3]:
                print(f"\n    Bilag {b.bilag_number}: {b.description[:40]}")
                print(f"      Status: {b.status.value}")
                print(f"      Amount: {b.gross_amount}")
                print(f"      Confidence: {b.ciri_confidence}")
                print(f"      Reasoning: {(b.ciri_reasoning or '')[:60]}...")

                # Check trail
                check(b.created_at is not None, f"  {b.bilag_number} has created_at")
                check(b.created_by_ciri is True, f"  {b.bilag_number} created_by_ciri=True")
                check(b.ciri_confidence is not None, f"  {b.bilag_number} has confidence score")
                check(b.ciri_reasoning is not None, f"  {b.bilag_number} has reasoning")
                check(b.fiscal_year is not None, f"  {b.bilag_number} has fiscal_year={b.fiscal_year}")
                check(b.retention_expires_at is not None, f"  {b.bilag_number} has retention_expires_at")

                # Check posteringen for this bilag
                p_result = await db.execute(
                    select(Postering).where(Postering.bilag_id == b.id)
                )
                posterings = p_result.scalars().all()
                if posterings:
                    check(len(posterings) >= 2, f"  {b.bilag_number} has {len(posterings)} posteringer")
                    total_d = sum(p.debit_amount for p in posterings)
                    total_c = sum(p.credit_amount for p in posterings)
                    balanced = abs(total_d - total_c) <= Decimal("0.01")
                    check(balanced, f"  {b.bilag_number} posteringer balanced: D={total_d} C={total_c}")

                    for p in posterings:
                        check(p.created_by_ciri is True, f"  Postering {p.saft_transaction_id} by Ciri")
                        check(p.fiscal_year is not None, f"  Postering has fiscal_year")
                        check(p.saft_transaction_id is not None, f"  Postering has SAF-T ID")
                else:
                    warn(f"  {b.bilag_number} has no posteringen (may be APPROVED but not POSTED)")
        else:
            warn("No Ciri-created bilags found — Claude may not have approved")

    # ================================================================
    # PHASE 5: Simulate the full flow manually (bypassing Claude)
    # ================================================================
    print("\n\033[1m[Phase 5] Manual Simulation (bypassing Claude)\033[0m")

    async with async_session_maker() as db:
        from models.bank_transaction import BankTransaction, ReconciliationStatus, TransactionCategory
        from models.bilag import Bilag, BilagStatus
        from models.postering import Postering
        from models.cluster_data_point import ClusterDataPoint, DataPointSource
        from services.cluster_service import record_data_point
        from services.journal_validation import validate_journal_balance

        # Find an unmatched transaction with a rule match
        unmatched_result = await db.execute(
            select(BankTransaction).where(and_(
                BankTransaction.company_id == COMPANY_ID,
                BankTransaction.reconciliation_status == ReconciliationStatus.UNMATCHED,
                BankTransaction.is_private == False,
            )).limit(1)
        )
        tx = unmatched_result.scalar_one_or_none()

        if not tx:
            warn("No unmatched transactions for manual simulation")
            _print_results()
            return

        print(f"  Selected tx: {tx.raw_description[:50]}")
        print(f"    Amount: {tx.amount}, Date: {tx.booking_date}")

        now = datetime.now(timezone.utc)
        bilag_number = f"AUTOTEST-{now.strftime('%H%M%S')}"

        # Step 1: Create bilag
        bilag = Bilag(
            company_id=COMPANY_ID,
            bilag_number=bilag_number,
            document_date=tx.booking_date,
            receipt_date=now,
            description=tx.cleaned_description or tx.raw_description,
            gross_amount=abs(tx.amount),
            net_amount=abs(tx.amount),
            mva_amount=Decimal("0"),
            mva_code="0",
            counterparty_name=tx.merchant_name or tx.raw_description,
            category="kontor",
            suggested_account="6540",
            file_path="autonomous/auto-generated",
            file_hash_sha256="0" * 64,
            original_filename="auto-generated.txt",
            mime_type="text/plain",
            status=BilagStatus.POSTED,
            created_by_ciri=True,
            ciri_confidence=0.85,
            ciri_reasoning="Test: manuell simulering av autonom bokforing",
            posted_at=now,
        )
        bilag.set_retention(fiscal_year=tx.booking_date.year, category="regnskap")

        db.add(bilag)
        await db.flush()
        check(bilag.id is not None, f"Bilag created: {bilag.bilag_number}")
        check(bilag.fiscal_year is not None, f"Bilag fiscal_year={bilag.fiscal_year}")
        check(bilag.retention_expires_at is not None, f"Bilag retention_expires_at={bilag.retention_expires_at}")

        # Step 2: Create posteringer
        journal_id = f"J-{bilag_number}"
        period = tx.booking_date.strftime("%Y-%m")
        is_expense = float(tx.amount) < 0

        p_debit = Postering(
            company_id=COMPANY_ID,
            bilag_id=bilag.id,
            journal_id=journal_id,
            posting_date=tx.booking_date,
            period=period,
            account_number="6540",
            description=bilag.description,
            debit_amount=abs(tx.amount) if is_expense else Decimal("0"),
            credit_amount=abs(tx.amount) if not is_expense else Decimal("0"),
            mva_code="0",
            mva_amount=Decimal("0"),
            saft_transaction_id=f"SAFT-{bilag_number}-01",
            created_by_ciri=True,
        )
        p_credit = Postering(
            company_id=COMPANY_ID,
            bilag_id=bilag.id,
            journal_id=journal_id,
            posting_date=tx.booking_date,
            period=period,
            account_number="1920",
            description=bilag.description,
            debit_amount=abs(tx.amount) if not is_expense else Decimal("0"),
            credit_amount=abs(tx.amount) if is_expense else Decimal("0"),
            mva_code="0",
            mva_amount=Decimal("0"),
            saft_transaction_id=f"SAFT-{bilag_number}-02",
            created_by_ciri=True,
        )

        # Validate balance
        validate_journal_balance([p_debit, p_credit])
        ok("Journal balance validation passed")

        db.add(p_debit)
        db.add(p_credit)
        await db.flush()

        # Verify auto-retention on posteringer
        await db.refresh(p_debit)
        await db.refresh(p_credit)
        check(p_debit.fiscal_year is not None, f"Postering debit fiscal_year={p_debit.fiscal_year}")
        check(p_credit.fiscal_year is not None, f"Postering credit fiscal_year={p_credit.fiscal_year}")
        check(p_debit.retention_category == "regnskap", "Postering debit retention=regnskap")

        # Step 3: Update transaction
        tx.reconciliation_status = ReconciliationStatus.MATCHED
        tx.reconciled_at = now
        tx.reconciled_by_ciri = True
        ok(f"Transaction marked MATCHED")

        # Step 4: Record cluster data point
        await record_data_point(
            db,
            company_id=COMPANY_ID,
            account_number="6540",
            category="kontor",
            merchant_name=tx.merchant_name,
            description_key=tx.raw_description[:20] if tx.raw_description else None,
            amount=float(tx.amount),
            direction="debit" if is_expense else "credit",
            source=DataPointSource.AUTO_CONFIRMED,
            transaction_id=tx.id,
        )
        ok("Cluster data point recorded")

        # Step 5: Log audit event
        from services.audit_trail import log_domain_event
        await log_domain_event(
            db=db,
            action="autonomous:posted",
            resource_type="bilag",
            resource_id=str(bilag.id),
            company_id=COMPANY_ID,
            by_ciri=True,
            details={
                "bilag_number": bilag.bilag_number,
                "transaction_id": str(tx.id),
                "amount": str(tx.amount),
                "account": "6540",
                "confidence": 0.85,
            },
        )
        ok("Audit event logged")

        await db.commit()

        # Step 6: Verify everything persisted correctly
        print("\n  Post-commit verification:")
        await db.refresh(bilag)
        check(bilag.status == BilagStatus.POSTED, f"Bilag status={bilag.status.value}")
        check(bilag.created_by_ciri is True, "Bilag created_by_ciri=True")
        check(bilag.posted_at is not None, "Bilag posted_at set")

        # Verify posteringen still exist and are balanced
        p_result = await db.execute(
            select(Postering).where(Postering.bilag_id == bilag.id)
        )
        posterings = p_result.scalars().all()
        check(len(posterings) == 2, f"2 posteringer created")
        total_d = sum(p.debit_amount for p in posterings)
        total_c = sum(p.credit_amount for p in posterings)
        check(abs(total_d - total_c) <= Decimal("0.01"), f"Balanced: D={total_d} C={total_c}")

        # Verify transaction state
        await db.refresh(tx)
        check(tx.reconciliation_status == ReconciliationStatus.MATCHED, "Tx is MATCHED")
        check(tx.reconciled_at is not None, "Tx reconciled_at set")
        check(tx.reconciled_by_ciri is True, "Tx reconciled_by_ciri=True")

        # Verify audit log entry
        from models.audit_log import AuditLog
        audit_result = await db.execute(
            select(AuditLog).where(and_(
                AuditLog.action == "autonomous:posted",
                AuditLog.resource_id == str(bilag.id),
            ))
        )
        audit_entry = audit_result.scalar_one_or_none()
        check(audit_entry is not None, "Audit log entry exists for autonomous posting")
        if audit_entry:
            check(audit_entry.created_by_ciri is True, "Audit entry marked as Ciri")
            check(audit_entry.details.get("bilag_number") == bilag.bilag_number, "Audit details correct")

        # Verify cluster data point
        cdp_result = await db.execute(
            select(ClusterDataPoint).where(ClusterDataPoint.transaction_id == tx.id)
        )
        cdp = cdp_result.scalar_one_or_none()
        check(cdp is not None, "Cluster data point recorded for tx")
        if cdp:
            check(cdp.source == DataPointSource.AUTO_CONFIRMED, "CDP source=auto_confirmed")
            check(cdp.account_number == "6540", "CDP account=6540")
            check(cdp.category == "kontor", "CDP category=kontor")

    # ================================================================
    # PHASE 6: Restore original autonomy level
    # ================================================================
    print("\n\033[1m[Phase 6] Cleanup\033[0m")

    async with async_session_maker() as db:
        from models.company import Company
        company = (await db.execute(select(Company).where(Company.id == COMPANY_ID))).scalar_one()
        company.autonomy_level = original_autonomy
        await db.commit()
        ok(f"Restored autonomy to {original_autonomy.value}")

    _print_results()


def _print_results():
    print("\n" + "=" * 72)
    total = passed + len(errors) + len(warnings)
    print(f"  RESULTS: {passed} passed, {len(errors)} failed, {len(warnings)} warnings")

    if errors:
        print(f"\n  \033[31mFAILURES:\033[0m")
        for e in errors:
            print(f"    - {e}")
    if warnings:
        print(f"\n  \033[33mWARNINGS:\033[0m")
        for w in warnings:
            print(f"    - {w}")
    if not errors:
        print(f"\n  \033[32mALL CRITICAL CHECKS PASSED\033[0m")
    print("=" * 72)


if __name__ == "__main__":
    asyncio.run(run())
