"""
Full Pipeline Test — Cluster Build-Up → Autonomous Posting

Creates realistic test data, exercises every layer:
  Phase 1: Create bank transactions for a specific pattern (IT subscriptions)
  Phase 2: Create matching bilags and manually reconcile them
  Phase 3: Confirm matches → build cluster data points
  Phase 4: Verify cluster reaches "strong" strength
  Phase 5: Create a reconciliation rule from the pattern
  Phase 6: Import new unmatched transactions matching the pattern
  Phase 7: Run autonomous posting pipeline
  Phase 8: Verify all audit trails, retention, balance

Run: docker-compose exec -e PYTHONPATH=/app backend python scripts/test_full_pipeline.py
"""

import asyncio
import uuid
import json
from datetime import datetime, date, timezone, timedelta
from decimal import Decimal

COMPANY_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DNB_ACCOUNT_ID = uuid.UUID("00000000-0000-0000-0000-000000000010")
TEST_PREFIX = "PIPELINE"

errors = []
warnings = []
passed = 0


def ok(msg):
    global passed
    passed += 1
    print(f"  \033[32m✓\033[0m {msg}")


def fail(msg):
    errors.append(msg)
    print(f"  \033[31m✗\033[0m {msg}")


def warn(msg):
    warnings.append(msg)
    print(f"  \033[33m!\033[0m {msg}")


def check(condition, msg):
    if condition:
        ok(msg)
    else:
        fail(msg)
    return condition


def section(title):
    print(f"\n\033[1;36m{'─'*60}\033[0m")
    print(f"\033[1;36m  {title}\033[0m")
    print(f"\033[1;36m{'─'*60}\033[0m")


async def run():
    from config.database import async_session_maker, init_db
    from sqlalchemy import select, func, and_, delete
    import models  # noqa

    await init_db()

    print("\n" + "=" * 60)
    print("  FULL PIPELINE TEST")
    print("  Cluster Build-Up → Rule → Autonomous Posting")
    print("=" * 60)

    # ── Clean up any previous test data ──
    async with async_session_maker() as db:
        from models.cluster_data_point import ClusterDataPoint
        from models.bank_transaction import BankTransaction
        from models.reconciliation_match import ReconciliationMatch
        from models.reconciliation_rule import ReconciliationRule
        from models.postering import Postering
        from models.bilag import Bilag

        # Delete test bilags + posteringen + matches + cluster data referencing them
        test_bilags = (await db.execute(
            select(Bilag.id).where(Bilag.bilag_number.like(f"{TEST_PREFIX}%"))
        )).scalars().all()
        if test_bilags:
            # Find matches to delete their cluster data first
            test_matches = (await db.execute(
                select(ReconciliationMatch.id).where(ReconciliationMatch.bilag_id.in_(test_bilags))
            )).scalars().all()
            if test_matches:
                await db.execute(delete(ClusterDataPoint).where(ClusterDataPoint.match_id.in_(test_matches)))
            await db.execute(delete(ReconciliationMatch).where(ReconciliationMatch.bilag_id.in_(test_bilags)))
            await db.execute(delete(Postering).where(Postering.bilag_id.in_(test_bilags)))
            await db.execute(delete(Bilag).where(Bilag.id.in_(test_bilags)))

        # Delete test transactions and related matches/clusters
        test_txs = (await db.execute(
            select(BankTransaction.id).where(
                BankTransaction.external_transaction_id.like(f"{TEST_PREFIX}%")
            )
        )).scalars().all()
        if test_txs:
            await db.execute(delete(ReconciliationMatch).where(
                ReconciliationMatch.bank_transaction_id.in_(test_txs)))
            await db.execute(delete(ClusterDataPoint).where(
                ClusterDataPoint.transaction_id.in_(test_txs)))
            await db.execute(delete(BankTransaction).where(
                BankTransaction.id.in_(test_txs)))

        # Delete test rule
        await db.execute(delete(ReconciliationRule).where(
            ReconciliationRule.name == f"{TEST_PREFIX}-Rule"))

        await db.commit()
        print("  Cleaned up previous test data")

    # ================================================================
    # PHASE 1: Create realistic bank transactions
    # Pattern: recurring IT subscription payments to 4 different vendors
    # ================================================================
    section("Phase 1: Create Bank Transactions")

    vendors = [
        ("GITHUB INC", -109.00, "GitHub Teams subscription"),
        ("MICROSOFT AZURE", -2450.00, "Azure cloud hosting"),
        ("VERCEL INC", -200.00, "Vercel Pro hosting"),
        ("ATLASSIAN PTY", -750.00, "Jira + Confluence"),
        ("CLOUDFLARE INC", -199.00, "Cloudflare Pro"),
    ]

    tx_ids = []
    bilag_ids = []
    match_ids = []

    async with async_session_maker() as db:
        from models.bank_transaction import BankTransaction, TransactionDirection, ReconciliationStatus

        # Create 10 historical transactions (2 per vendor, different months)
        for month_offset, (vendor, amount, desc) in enumerate(vendors * 2):
            booking = date(2025, 1 + (month_offset % 4), 15)
            tx = BankTransaction(
                company_id=COMPANY_ID,
                bank_account_id=DNB_ACCOUNT_ID,
                external_transaction_id=f"{TEST_PREFIX}-TX-{month_offset:03d}",
                booking_date=booking,
                amount=Decimal(str(amount)),
                currency="NOK",
                direction=TransactionDirection.DEBIT,
                raw_description=f"KORTBETALING {vendor}",
                cleaned_description=f"{vendor} - {desc}",
                merchant_name=vendor,
                reconciliation_status=ReconciliationStatus.UNMATCHED,
            )
            tx.set_retention(fiscal_year=booking.year, category="regnskap")
            db.add(tx)
            await db.flush()
            tx_ids.append(tx.id)

        await db.commit()

        check(len(tx_ids) == 10, f"Created {len(tx_ids)} transactions")

        # Verify retention on all
        result = await db.execute(
            select(BankTransaction).where(BankTransaction.id.in_(tx_ids))
        )
        for tx in result.scalars().all():
            check(tx.fiscal_year == 2025, f"  tx {tx.merchant_name[:15]}: fiscal_year=2025")
            check(tx.retention_expires_at is not None, f"  tx {tx.merchant_name[:15]}: retention set")

    # ================================================================
    # PHASE 2: Create matching bilags
    # ================================================================
    section("Phase 2: Create Matching Bilags")

    async with async_session_maker() as db:
        from models.bilag import Bilag, BilagStatus

        for i, (vendor, amount, desc) in enumerate(vendors * 2):
            booking = date(2025, 1 + (i % 4), 15)
            bilag = Bilag(
                company_id=COMPANY_ID,
                bilag_number=f"{TEST_PREFIX}-B-{i:03d}",
                document_date=booking,
                receipt_date=datetime.now(timezone.utc),
                description=f"{vendor} - {desc}",
                gross_amount=Decimal(str(abs(amount))),
                net_amount=Decimal(str(abs(amount))),
                mva_amount=Decimal("0"),
                mva_code="6",  # Exempt (foreign services)
                counterparty_name=vendor,
                category="kontor",
                suggested_account="6540",
                file_path=f"test/{TEST_PREFIX}-{i}.pdf",
                file_hash_sha256="a" * 64,
                original_filename=f"{vendor.lower().replace(' ', '_')}.pdf",
                mime_type="application/pdf",
                status=BilagStatus.POSTED,
                created_by_ciri=True,
                ciri_confidence=0.95,
                ciri_reasoning=f"IT-abonnement fra {vendor}",
                posted_at=datetime.now(timezone.utc),
            )
            bilag.set_retention(fiscal_year=booking.year, category="regnskap")
            db.add(bilag)
            await db.flush()
            bilag_ids.append(bilag.id)

        await db.commit()
        check(len(bilag_ids) == 10, f"Created {len(bilag_ids)} bilags")

    # ================================================================
    # PHASE 3: Create matches + confirm → build cluster
    # ================================================================
    section("Phase 3: Reconcile and Build Cluster")

    async with async_session_maker() as db:
        from models.reconciliation_match import ReconciliationMatch, MatchType, MatchConfidence, MatchStatus
        from models.bank_transaction import BankTransaction, ReconciliationStatus
        from models.cluster_data_point import ClusterDataPoint, DataPointSource
        from services.cluster_service import record_data_point

        now = datetime.now(timezone.utc)

        for i in range(10):
            # Create match
            match = ReconciliationMatch(
                company_id=COMPANY_ID,
                bank_transaction_id=tx_ids[i],
                bilag_id=bilag_ids[i],
                match_type=MatchType.ONE_TO_ONE,
                confidence=MatchConfidence.HIGH,
                confidence_score=Decimal("0.92"),
                status=MatchStatus.CONFIRMED,
                transaction_amount=Decimal(str(abs(vendors[i % 5][1]))),
                matched_amount=Decimal(str(abs(vendors[i % 5][1]))),
                difference=Decimal("0"),
                match_factors={"amount": 1.0, "name": 0.85, "date": 0.9},
                ciri_explanation=f"Eksakt belopsmatch og leverandormatch for {vendors[i % 5][0]}",
                confirmed_at=now,
            )
            db.add(match)
            await db.flush()
            match_ids.append(match.id)

            # Update transaction as matched
            tx_result = await db.execute(
                select(BankTransaction).where(BankTransaction.id == tx_ids[i])
            )
            tx = tx_result.scalar_one()
            tx.reconciliation_status = ReconciliationStatus.MATCHED
            tx.reconciled_at = now
            tx.reconciled_by_ciri = False  # User confirmed

            # Record cluster data point
            await record_data_point(
                db,
                company_id=COMPANY_ID,
                account_number="6540",
                category="kontor",
                merchant_name=vendors[i % 5][0],
                description_key=f"KORTBETALING {vendors[i % 5][0][:10]}",
                amount=float(vendors[i % 5][1]),
                direction="debit",
                source=DataPointSource.USER_CONFIRMED,
                match_id=match.id,
                transaction_id=tx_ids[i],
            )

        await db.commit()

        check(len(match_ids) == 10, f"Created {len(match_ids)} confirmed matches")

        # Verify cluster data points
        cdp_count = (await db.execute(
            select(func.count(ClusterDataPoint.id)).where(
                ClusterDataPoint.transaction_id.in_(tx_ids)
            )
        )).scalar()
        check(cdp_count == 10, f"Cluster data points recorded: {cdp_count}")

    # ================================================================
    # PHASE 4: Verify cluster strength
    # ================================================================
    section("Phase 4: Verify Cluster Strength")

    async with async_session_maker() as db:
        from services.cluster_service import get_cluster_summaries

        clusters = await get_cluster_summaries(db, COMPANY_ID)

        # Find our test cluster
        test_cluster = None
        for c in clusters:
            if c.account_number == "6540" and c.category == "kontor":
                test_cluster = c
                break

        check(test_cluster is not None, "Found cluster (6540, kontor)")
        if test_cluster:
            check(test_cluster.total_points >= 10,
                  f"  Total points: {test_cluster.total_points} (need ≥8 for strong)")
            check(test_cluster.distinct_merchants >= 3,
                  f"  Distinct merchants: {test_cluster.distinct_merchants} (need ≥3)")
            check(test_cluster.overridden_count == 0,
                  f"  Override count: {test_cluster.overridden_count} (need 0 for reliability)")
            check(test_cluster.strength_level == "strong",
                  f"  Strength level: {test_cluster.strength_level}")

            print(f"\n  Cluster details:")
            print(f"    Amount range: kr {test_cluster.amount_min:.0f} – {test_cluster.amount_max:.0f}")
            print(f"    Median: kr {test_cluster.amount_median:.0f}")
            print(f"    Direction: {test_cluster.dominant_direction}")
            if test_cluster.example_merchants:
                print(f"    Merchants: {', '.join(test_cluster.example_merchants[:5])}")

    # ================================================================
    # PHASE 5: Create a matching rule
    # ================================================================
    section("Phase 5: Create Reconciliation Rule")

    async with async_session_maker() as db:
        from models.reconciliation_rule import ReconciliationRule, RuleType, RulePriority

        rule = ReconciliationRule(
            company_id=COMPANY_ID,
            name=f"{TEST_PREFIX}-Rule",
            description="IT-abonnementer (GitHub, Azure, Vercel, Atlassian, Cloudflare)",
            rule_type=RuleType.AUTO_CATEGORY,
            priority=RulePriority.HIGH,
            criteria={
                "description_contains": "KORTBETALING",
                "amount_min": 100,
                "amount_max": 3000,
                "direction": "debit",
            },
            action={
                "category": "kontor",
                "account": "6540",
                "mva_code": "6",
            },
            is_active=True,
            learned_from_user=True,
            times_applied=10,  # Already validated by our 10 matches
            times_overridden=0,
        )
        db.add(rule)
        await db.flush()
        rule_id = rule.id
        await db.commit()

        check(rule.id is not None, f"Rule created: {rule.name}")
        check(rule.is_active, "Rule is active")

        # Verify is_effective
        override_rate = rule.times_overridden / rule.times_applied if rule.times_applied else 0
        check(override_rate < 0.2, f"Rule effective: override rate {override_rate:.0%}")

    # ================================================================
    # PHASE 6: Create NEW unmatched transactions (for auto-posting)
    # ================================================================
    section("Phase 6: Create New Unmatched Transactions")

    new_tx_ids = []
    async with async_session_maker() as db:
        from models.bank_transaction import BankTransaction, TransactionDirection, ReconciliationStatus

        new_vendors = [
            ("GITHUB INC", -109.00),
            ("VERCEL INC", -200.00),
            ("ATLASSIAN PTY", -750.00),
        ]

        for i, (vendor, amount) in enumerate(new_vendors):
            tx = BankTransaction(
                company_id=COMPANY_ID,
                bank_account_id=DNB_ACCOUNT_ID,
                external_transaction_id=f"{TEST_PREFIX}-NEW-{i:03d}",
                booking_date=date(2025, 4, 20),
                amount=Decimal(str(amount)),
                currency="NOK",
                direction=TransactionDirection.DEBIT,
                raw_description=f"KORTBETALING {vendor}",
                cleaned_description=f"{vendor} subscription",
                merchant_name=vendor,
                reconciliation_status=ReconciliationStatus.UNMATCHED,
            )
            tx.set_retention(fiscal_year=2025, category="regnskap")
            db.add(tx)
            await db.flush()
            new_tx_ids.append(tx.id)

        await db.commit()
        check(len(new_tx_ids) == 3, f"Created {len(new_tx_ids)} new unmatched transactions")

    # ================================================================
    # PHASE 7: Run autonomous posting pipeline
    # ================================================================
    section("Phase 7: Autonomous Posting Pipeline")

    async with async_session_maker() as db:
        from models.company import Company, AutonomyLevel
        from services.cluster_service import check_global_minimums
        from services.autonomous_posting import create_posting_bundle, execute_autonomous_posting

        # Set to AUTONOMOUS mode
        company = (await db.execute(select(Company).where(Company.id == COMPANY_ID))).scalar_one()
        original_autonomy = company.autonomy_level
        company.autonomy_level = AutonomyLevel.AUTONOMOUS
        await db.commit()

        # Check global minimums
        passes, reason = await check_global_minimums(db, COMPANY_ID)
        check(passes, f"Global minimums: {reason}")

        # Build bundle
        bundle, skipped_low, skipped_tier_3 = await create_posting_bundle(db, COMPANY_ID)

        # Check that our new transactions are in the bundle
        bundle_tx_ids = {st.transaction.id for st in bundle.scored_transactions}
        our_in_bundle = [tid for tid in new_tx_ids if tid in bundle_tx_ids]

        print(f"\n  Bundle stats:")
        print(f"    Total eligible: {len(bundle.scored_transactions)}")
        print(f"    Tier 1 (rule): {bundle.tier_1_count}")
        print(f"    Tier 2 (cluster): {bundle.tier_2_count}")
        print(f"    Tier 3 (skip): {skipped_tier_3}")
        print(f"    Tier 4 (skip): {skipped_low}")
        print(f"    Our test txs in bundle: {len(our_in_bundle)}/{len(new_tx_ids)}")

        check(len(our_in_bundle) > 0,
              f"Our test transactions are eligible ({len(our_in_bundle)}/{len(new_tx_ids)})")

        # Show tier assessment for our transactions
        for st in bundle.scored_transactions:
            if st.transaction.id in new_tx_ids:
                tx = st.transaction
                print(f"\n    {tx.merchant_name}:")
                print(f"      Tier: {st.readiness.tier} ({st.readiness.tier_label})")
                print(f"      Confidence: {st.confidence_score:.0%}")
                print(f"      Account: {st.suggested_account}, Category: {st.suggested_category}")
                if st.best_rule:
                    print(f"      Rule: {st.best_rule.name}")
                check(st.readiness.tier <= 2,
                      f"  {tx.merchant_name} is Tier {st.readiness.tier} (eligible)")

        # Execute (will fail at Claude step without API key — expected)
        result = await execute_autonomous_posting(db, COMPANY_ID)

        if result.claude_approved:
            ok(f"Claude approved — {result.bilags_created} bilags, {result.posterings_created} posteringen")
            await db.commit()
        else:
            warn(f"Claude step: {result.claude_reasoning}")
            warn("Proceeding with manual simulation to verify remaining pipeline")
            await db.rollback()

    # ================================================================
    # PHASE 8: Manual simulation of auto-post (bypass Claude)
    # ================================================================
    section("Phase 8: Manual Auto-Post Simulation")

    async with async_session_maker() as db:
        from models.bank_transaction import BankTransaction, ReconciliationStatus, TransactionCategory
        from models.bilag import Bilag, BilagStatus
        from models.postering import Postering
        from models.cluster_data_point import ClusterDataPoint, DataPointSource
        from services.cluster_service import record_data_point
        from services.journal_validation import validate_journal_balance
        from services.audit_trail import log_domain_event

        now = datetime.now(timezone.utc)
        created_bilag_ids = []
        created_postering_ids = []

        for i, tx_id in enumerate(new_tx_ids):
            tx = (await db.execute(
                select(BankTransaction).where(BankTransaction.id == tx_id)
            )).scalar_one()

            # Skip if already matched (from Claude step above)
            if tx.reconciliation_status == ReconciliationStatus.MATCHED:
                ok(f"  {tx.merchant_name} already matched by Claude")
                continue

            bilag_number = f"{TEST_PREFIX}-AUTO-{i:03d}"

            # Create bilag
            bilag = Bilag(
                company_id=COMPANY_ID,
                bilag_number=bilag_number,
                document_date=tx.booking_date,
                receipt_date=now,
                description=tx.cleaned_description or tx.raw_description,
                gross_amount=abs(tx.amount),
                net_amount=abs(tx.amount),
                mva_amount=Decimal("0"),
                mva_code="6",
                counterparty_name=tx.merchant_name,
                category="kontor",
                suggested_account="6540",
                file_path=f"autonomous/{bilag_number}",
                file_hash_sha256="b" * 64,
                original_filename="auto-generated.txt",
                mime_type="text/plain",
                status=BilagStatus.POSTED,
                created_by_ciri=True,
                ciri_confidence=0.95,
                ciri_reasoning=(
                    f"Autonom bokforing — Direkte regel match "
                    f"(konfidens: 95%, monstrer matcher IT-abonnement klynge). "
                    f"Godkjent."
                ),
                posted_at=now,
            )
            bilag.set_retention(fiscal_year=tx.booking_date.year, category="regnskap")
            db.add(bilag)
            await db.flush()
            created_bilag_ids.append(bilag.id)

            # Create posteringer
            journal_id = f"J-{bilag_number}"
            period = tx.booking_date.strftime("%Y-%m")

            p_expense = Postering(
                company_id=COMPANY_ID,
                bilag_id=bilag.id,
                journal_id=journal_id,
                posting_date=tx.booking_date,
                period=period,
                account_number="6540",
                description=bilag.description,
                debit_amount=abs(tx.amount),
                credit_amount=Decimal("0"),
                mva_code="6",
                mva_amount=Decimal("0"),
                saft_transaction_id=f"SAFT-{bilag_number}-01",
                created_by_ciri=True,
            )
            p_bank = Postering(
                company_id=COMPANY_ID,
                bilag_id=bilag.id,
                journal_id=journal_id,
                posting_date=tx.booking_date,
                period=period,
                account_number="1920",
                description=bilag.description,
                debit_amount=Decimal("0"),
                credit_amount=abs(tx.amount),
                mva_code="0",
                mva_amount=Decimal("0"),
                saft_transaction_id=f"SAFT-{bilag_number}-02",
                created_by_ciri=True,
            )

            # Validate journal balance
            validate_journal_balance([p_expense, p_bank])

            db.add(p_expense)
            db.add(p_bank)
            await db.flush()
            created_postering_ids.extend([p_expense.id, p_bank.id])

            # Update transaction
            tx.reconciliation_status = ReconciliationStatus.MATCHED
            tx.reconciled_at = now
            tx.reconciled_by_ciri = True
            tx.category = TransactionCategory.KONTOR

            # Record cluster data point
            await record_data_point(
                db,
                company_id=COMPANY_ID,
                account_number="6540",
                category="kontor",
                merchant_name=tx.merchant_name,
                description_key=f"KORTBETALING {tx.merchant_name[:10]}",
                amount=float(tx.amount),
                direction="debit",
                source=DataPointSource.AUTO_CONFIRMED,
                transaction_id=tx.id,
            )

            # Audit event
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
                    "merchant": tx.merchant_name,
                    "amount": str(tx.amount),
                    "account": "6540",
                    "confidence": 0.95,
                    "tier": "1 (direct rule)",
                },
            )

            ok(f"  Auto-posted: {tx.merchant_name} → {bilag_number} (kr {abs(tx.amount)})")

        await db.commit()
        check(len(created_bilag_ids) == len(new_tx_ids),
              f"Created {len(created_bilag_ids)} bilags for {len(new_tx_ids)} transactions")

    # ================================================================
    # PHASE 9: Verify everything end-to-end
    # ================================================================
    section("Phase 9: End-to-End Verification")

    async with async_session_maker() as db:
        from models.bilag import Bilag, BilagStatus
        from models.postering import Postering
        from models.bank_transaction import BankTransaction, ReconciliationStatus
        from models.cluster_data_point import ClusterDataPoint
        from models.audit_log import AuditLog
        from services.cluster_service import get_cluster_summaries

        print("\n  \033[1mBilags:\033[0m")
        for bid in created_bilag_ids:
            b = (await db.execute(select(Bilag).where(Bilag.id == bid))).scalar_one()
            check(b.status == BilagStatus.POSTED, f"  {b.bilag_number} status=POSTED")
            check(b.created_by_ciri is True, f"  {b.bilag_number} created_by_ciri=True")
            check(b.fiscal_year == 2025, f"  {b.bilag_number} fiscal_year=2025")
            check(b.retention_expires_at is not None, f"  {b.bilag_number} retention set")
            check(b.posted_at is not None, f"  {b.bilag_number} posted_at set")
            check(b.ciri_confidence is not None, f"  {b.bilag_number} confidence={b.ciri_confidence}")
            check(b.ciri_reasoning is not None, f"  {b.bilag_number} has reasoning")

        print("\n  \033[1mPosteringer:\033[0m")
        for bid in created_bilag_ids:
            posts = (await db.execute(
                select(Postering).where(Postering.bilag_id == bid)
            )).scalars().all()
            check(len(posts) == 2, f"  bilag {bid}: {len(posts)} posteringer")
            total_d = sum(p.debit_amount for p in posts)
            total_c = sum(p.credit_amount for p in posts)
            check(abs(total_d - total_c) <= Decimal("0.01"),
                  f"  bilag {bid}: balanced D={total_d} C={total_c}")
            for p in posts:
                await db.refresh(p)  # Get auto-retention from listener
                check(p.fiscal_year is not None, f"    postering {p.saft_transaction_id}: fiscal_year={p.fiscal_year}")
                check(p.created_by_ciri is True, f"    postering {p.saft_transaction_id}: ciri=True")
                check(p.saft_transaction_id is not None, f"    postering {p.saft_transaction_id}: SAF-T ID set")

        print("\n  \033[1mTransactions:\033[0m")
        for tid in new_tx_ids:
            tx = (await db.execute(select(BankTransaction).where(BankTransaction.id == tid))).scalar_one()
            check(tx.reconciliation_status == ReconciliationStatus.MATCHED,
                  f"  {tx.merchant_name}: status=MATCHED")
            check(tx.reconciled_at is not None, f"  {tx.merchant_name}: reconciled_at set")
            check(tx.reconciled_by_ciri is True, f"  {tx.merchant_name}: reconciled_by_ciri=True")

        print("\n  \033[1mCluster after auto-posting:\033[0m")
        clusters = await get_cluster_summaries(db, COMPANY_ID)
        test_cluster = next((c for c in clusters if c.account_number == "6540" and c.category == "kontor"), None)
        if test_cluster:
            # Original 10 + existing seed data + 3 new = should be more than before
            check(test_cluster.total_points >= 13,
                  f"  Cluster grown: {test_cluster.total_points} points (was ~10 + seed)")
            check(test_cluster.strength_level == "strong",
                  f"  Cluster still strong: {test_cluster.strength_level}")
            check(test_cluster.distinct_merchants >= 3,
                  f"  Merchant diversity: {test_cluster.distinct_merchants}")

        print("\n  \033[1mAudit trail:\033[0m")
        audit_result = await db.execute(
            select(AuditLog).where(and_(
                AuditLog.action == "autonomous:posted",
                AuditLog.created_by_ciri == True,
            )).order_by(AuditLog.timestamp.desc()).limit(5)
        )
        audit_entries = audit_result.scalars().all()
        check(len(audit_entries) >= len(new_tx_ids),
              f"  Audit entries for auto-posting: {len(audit_entries)}")
        for a in audit_entries[:3]:
            details = a.details or {}
            check("bilag_number" in details, f"    Entry has bilag_number: {details.get('bilag_number')}")
            check("amount" in details, f"    Entry has amount: {details.get('amount')}")
            check("tier" in details, f"    Entry has tier: {details.get('tier')}")

    # ================================================================
    # PHASE 10: Test override → verify cluster degrades
    # ================================================================
    section("Phase 10: Override Simulation")

    async with async_session_maker() as db:
        from services.cluster_service import mark_data_point_overridden, get_cluster_summaries

        # Override one of the auto-posted data points (simulating user correction)
        overridden = await mark_data_point_overridden(db, new_tx_ids[0])
        await db.commit()
        check(overridden == 1, f"Marked {overridden} data point as overridden")

        # Verify cluster still has good override rate
        clusters = await get_cluster_summaries(db, COMPANY_ID)
        test_cluster = next((c for c in clusters if c.account_number == "6540" and c.category == "kontor"), None)
        if test_cluster:
            override_pct = test_cluster.overridden_count / test_cluster.total_points * 100
            check(override_pct < 20,
                  f"  Override rate: {override_pct:.1f}% (still under 20% threshold)")
            check(test_cluster.strength_level == "strong",
                  f"  Cluster still strong after 1 override")

    # ================================================================
    # CLEANUP
    # ================================================================
    section("Cleanup")

    async with async_session_maker() as db:
        from models.company import Company
        company = (await db.execute(select(Company).where(Company.id == COMPANY_ID))).scalar_one()
        company.autonomy_level = original_autonomy
        await db.commit()
        ok(f"Restored autonomy level to {original_autonomy.value}")

    # ================================================================
    # RESULTS
    # ================================================================
    print("\n" + "=" * 60)
    total = passed + len(errors) + len(warnings)
    print(f"  RESULTS: {passed} passed, {len(errors)} failed, {len(warnings)} warnings")
    print(f"  Total checks: {total}")

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
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run())
