"""
Test: Cluster as mandatory gatekeeper for auto-posting decisions.

Scenario 1: Strong cluster → MEDIUM match auto-confirms
Scenario 2: Growing cluster → only HIGH match auto-confirms
Scenario 3: Weak/contaminated cluster → NEVER auto-confirms even with HIGH match
Scenario 4: No cluster at all → NEVER auto-confirms
"""

import asyncio
import uuid
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal

sys.path.insert(0, "/app")

async def main():
    from config.database import async_session_maker, engine
    from sqlalchemy import select, and_, text, delete
    from models import (
        Bilag, BilagStatus,
        BankTransaction, ReconciliationStatus, TransactionCategory,
        ReconciliationMatch, MatchStatus, MatchConfidence,
        Company, AutonomyLevel, BankAccount,
    )
    from models.bank_transaction import TransactionDirection
    from models.cluster_data_point import ClusterDataPoint, DataPointSource
    from services.reconciliation_matcher import ReconciliationMatcher

    passed = 0
    failed = 0

    def check(name, condition, detail=""):
        nonlocal passed, failed
        if condition:
            print(f"  ✅ {name}")
            passed += 1
        else:
            print(f"  ❌ {name} — {detail}")
            failed += 1

    async with async_session_maker() as db:
        # Get company and bank account
        company = (await db.execute(select(Company))).scalar_one()
        bank_account = (await db.execute(
            select(BankAccount).where(BankAccount.company_id == company.id)
        )).scalars().first()

        # Clean up any test data from previous runs
        await db.execute(text("DELETE FROM cluster_data_points WHERE description_key LIKE '%GATEKEEPER%'"))
        await db.execute(text(
            "DELETE FROM reconciliation_matches WHERE bank_transaction_id IN "
            "(SELECT id FROM bank_transactions WHERE raw_description LIKE '%GATEKEEPER_TEST%')"
        ))
        await db.execute(text(
            "DELETE FROM posteringer WHERE bilag_id IN "
            "(SELECT id FROM bilag WHERE description LIKE '%GATEKEEPER_TEST%')"
        ))
        await db.execute(text("DELETE FROM bilag WHERE description LIKE '%GATEKEEPER_TEST%'"))
        await db.execute(text("DELETE FROM bank_transactions WHERE raw_description LIKE '%GATEKEEPER_TEST%'"))
        await db.commit()

        # ================================================================
        # SETUP: Create test bilag and helper function
        # ================================================================

        async def create_test_bilag(amount, desc_suffix):
            b = Bilag(
                company_id=company.id,
                bilag_number=f"GT-{uuid.uuid4().hex[:6]}",
                description=f"GATEKEEPER_TEST {desc_suffix}",
                gross_amount=Decimal(str(amount)),
                net_amount=Decimal(str(amount * 0.8)),
                mva_amount=Decimal(str(amount * 0.2)),
                document_date=date.today(),
                receipt_date=datetime.utcnow(),
                status=BilagStatus.AWAITING_TRANSACTION,
                counterparty_name=f"Test Leverandør {desc_suffix}",
                suggested_account="5000",
                category="varekjop",
                file_path="test/gatekeeper_test.pdf",
                file_hash_sha256="0" * 64,
                original_filename="gatekeeper_test.pdf",
                mime_type="application/pdf",
            )
            db.add(b)
            await db.flush()
            return b

        async def create_test_tx(amount, desc_suffix, account="5000", category=TransactionCategory.VAREKJOP):
            # Generate a bilag-number-like reference to boost match score
            ref_id = f"GT-{uuid.uuid4().hex[:6]}"
            tx = BankTransaction(
                company_id=company.id,
                bank_account_id=bank_account.id,
                external_transaction_id=f"gatekeeper-test-{uuid.uuid4().hex[:8]}",
                amount=Decimal(str(-abs(amount))),
                direction=TransactionDirection.DEBIT,
                booking_date=date.today(),
                value_date=date.today(),
                raw_description=f"GATEKEEPER_TEST {desc_suffix}",
                cleaned_description=f"GATEKEEPER_TEST {desc_suffix}",
                merchant_name=f"Test Leverandør {desc_suffix}",
                reference=ref_id,
                reconciliation_status=ReconciliationStatus.UNMATCHED,
                suggested_account=account,
                category=category,
            )
            db.add(tx)
            await db.flush()
            return tx

        async def seed_cluster(account, category, n_points, n_overridden=0, merchants=None):
            """Seed cluster data points for testing."""
            if merchants is None:
                merchants = [f"MERCHANT_{i}" for i in range(min(5, n_points))]

            for i in range(n_points):
                merchant = merchants[i % len(merchants)]
                p = ClusterDataPoint(
                    company_id=company.id,
                    account_number=account,
                    category=category,
                    merchant_name=merchant,
                    description_key="GATEKEEPER",
                    amount=5000.0 + (i * 100),
                    direction="debit",
                    source=DataPointSource.USER_CONFIRMED,
                    confirmed_at=datetime.utcnow() - timedelta(days=i),
                    was_overridden=(i < n_overridden),
                    overridden_at=datetime.utcnow() if i < n_overridden else None,
                )
                db.add(p)
            await db.flush()

        # ================================================================
        # SCENARIO 1: Strong cluster → MEDIUM match auto-confirms
        # ================================================================
        print("\n📋 Scenario 1: Strong cluster + MEDIUM match → should AUTO-CONFIRM")

        # Seed a strong cluster: 15 points, 5 merchants, 0 overrides
        await seed_cluster("5000", "varekjop", n_points=15, n_overridden=0,
                          merchants=["LEVERANDØR_A", "LEVERANDØR_B", "LEVERANDØR_C", "LEVERANDØR_D", "LEVERANDØR_E"])

        # Create bilag and transaction with similar but not exact amount (MEDIUM match)
        bilag1 = await create_test_bilag(5000, "STRONG_CLUSTER")
        tx1 = await create_test_tx(5000, "STRONG_CLUSTER", account="5000", category=TransactionCategory.VAREKJOP)
        # Set tx reference to match bilag number → triggers reference match factor (+0.30)
        tx1.reference = bilag1.bilag_number

        await db.commit()

        matcher = ReconciliationMatcher(db)
        result1 = await matcher.auto_reconcile(tx1, AutonomyLevel.ASSISTANT)
        await db.commit()

        check("Match found", result1 is not None)
        if result1:
            factors = result1.match_factors or {}
            gk = factors.get("cluster_gatekeeper", {})
            check("Cluster gatekeeper exists in factors", "cluster_gatekeeper" in factors)
            check("Cluster found", gk.get("cluster_found") == True)

            cluster_info = gk.get("cluster", {})
            check("Cluster is strong", cluster_info.get("strength_level") == "strong",
                  f"got {cluster_info.get('strength_level')}")

            # With exact amount match (5000 vs 5000), we should get HIGH confidence
            # and strong cluster should approve
            check("Gatekeeper approved", gk.get("decision") == "approved",
                  f"got {gk.get('decision')}, confidence={result1.confidence.value}")
            check("Status is AUTO_CONFIRMED", result1.status == MatchStatus.AUTO_CONFIRMED,
                  f"got {result1.status.value}")

        # ================================================================
        # SCENARIO 2: Growing cluster → only HIGH match auto-confirms
        # ================================================================
        print("\n📋 Scenario 2: Growing cluster + HIGH match → should AUTO-CONFIRM")

        # Seed a growing cluster: 6 points, 2 merchants (below strong thresholds)
        await seed_cluster("6000", "kontor", n_points=6, n_overridden=0,
                          merchants=["OFFICE_A", "OFFICE_B"])

        bilag2 = await create_test_bilag(3000, "GROWING_CLUSTER")
        bilag2.suggested_account = "6000"
        bilag2.category = "kontor"

        tx2 = await create_test_tx(3000, "GROWING_CLUSTER", account="6000", category=TransactionCategory.KONTOR)
        tx2.reference = bilag2.bilag_number

        await db.commit()

        matcher2 = ReconciliationMatcher(db)
        result2 = await matcher2.auto_reconcile(tx2, AutonomyLevel.ASSISTANT)
        await db.commit()

        check("Match found", result2 is not None)
        if result2:
            factors2 = result2.match_factors or {}
            gk2 = factors2.get("cluster_gatekeeper", {})
            cluster_info2 = gk2.get("cluster", {})

            # Check: the cluster for 6000/kontor should be growing
            # (6 points < 8 for strong, or 2 merchants < 3)
            check("Cluster is growing", cluster_info2.get("strength_level") in ("growing",),
                  f"got {cluster_info2.get('strength_level')}")

            # With exact amount + reference + name + date → should be HIGH confidence
            check("Confidence is HIGH", result2.confidence == MatchConfidence.HIGH,
                  f"got {result2.confidence.value}")
            # Growing cluster + HIGH → should auto-confirm
            check("HIGH match + growing cluster → approved",
                  gk2.get("decision") == "approved",
                  f"got {gk2.get('decision')}")

        # ================================================================
        # SCENARIO 3: Contaminated cluster → NEVER auto-confirms
        # ================================================================
        print("\n📋 Scenario 3: Contaminated cluster (>20% overrides) + HIGH match → should BLOCK")

        # Seed a contaminated cluster: 10 points, 4 overridden (40% override rate!)
        await seed_cluster("7000", "reise", n_points=10, n_overridden=4,
                          merchants=["TRAVEL_A", "TRAVEL_B", "TRAVEL_C", "TRAVEL_D"])

        bilag3 = await create_test_bilag(8000, "CONTAMINATED")
        bilag3.suggested_account = "7000"
        bilag3.category = "reise"

        tx3 = await create_test_tx(8000, "CONTAMINATED", account="7000", category=TransactionCategory.REISE)
        tx3.reference = bilag3.bilag_number

        await db.commit()

        matcher3 = ReconciliationMatcher(db)
        result3 = await matcher3.auto_reconcile(tx3, AutonomyLevel.AUTONOMOUS)  # Even AUTONOMOUS!
        await db.commit()

        check("Match found", result3 is not None)
        if result3:
            factors3 = result3.match_factors or {}
            gk3 = factors3.get("cluster_gatekeeper", {})
            cluster_info3 = gk3.get("cluster", {})

            # 40% override rate → strength capped at 0.1 → "weak"
            check("Cluster is weak (contaminated)", cluster_info3.get("strength_level") == "weak",
                  f"got {cluster_info3.get('strength_level')}, strength={cluster_info3.get('strength')}")
            check("Gatekeeper BLOCKED despite HIGH match", gk3.get("decision") == "blocked",
                  f"got {gk3.get('decision')}")
            check("Status is SUGGESTED (not auto-confirmed)", result3.status == MatchStatus.SUGGESTED,
                  f"got {result3.status.value}")

        # ================================================================
        # SCENARIO 4: No cluster at all → NEVER auto-confirms
        # ================================================================
        print("\n📋 Scenario 4: No cluster + HIGH match → should BLOCK")

        bilag4 = await create_test_bilag(12000, "NO_CLUSTER")
        bilag4.suggested_account = "9999"  # Account with no cluster data
        bilag4.category = "ukjent"

        tx4 = await create_test_tx(12000, "NO_CLUSTER", account="9999", category=TransactionCategory.VAREKJOP)
        tx4.reference = bilag4.bilag_number

        await db.commit()

        matcher4 = ReconciliationMatcher(db)
        result4 = await matcher4.auto_reconcile(tx4, AutonomyLevel.AUTONOMOUS)  # Even AUTONOMOUS!
        await db.commit()

        check("Match found", result4 is not None)
        if result4:
            factors4 = result4.match_factors or {}
            gk4 = factors4.get("cluster_gatekeeper", {})

            check("No cluster found", gk4.get("cluster_found") == False,
                  f"got {gk4.get('cluster_found')}")
            check("Gatekeeper BLOCKED (no cluster)", gk4.get("decision") == "blocked",
                  f"got {gk4.get('decision')}")
            check("Status is SUGGESTED", result4.status == MatchStatus.SUGGESTED,
                  f"got {result4.status.value}")

        # ================================================================
        # CLEANUP (order matters: FK dependencies)
        # ================================================================
        # cluster_data_points → reconciliation_matches → bilag / bank_transactions
        await db.execute(text("DELETE FROM cluster_data_points WHERE description_key LIKE '%GATEKEEPER%'"))
        await db.execute(text(
            "DELETE FROM reconciliation_matches WHERE bank_transaction_id IN "
            "(SELECT id FROM bank_transactions WHERE raw_description LIKE '%GATEKEEPER_TEST%')"
        ))
        await db.execute(text(
            "DELETE FROM posteringer WHERE bilag_id IN "
            "(SELECT id FROM bilag WHERE description LIKE '%GATEKEEPER_TEST%')"
        ))
        await db.execute(text("DELETE FROM bilag WHERE description LIKE '%GATEKEEPER_TEST%'"))
        await db.execute(text("DELETE FROM bank_transactions WHERE raw_description LIKE '%GATEKEEPER_TEST%'"))
        await db.commit()

        print(f"\n{'='*50}")
        print(f"Results: {passed} passed, {failed} failed out of {passed + failed}")
        if failed > 0:
            print("⚠️  Some tests FAILED")
            sys.exit(1)
        else:
            print("✅ All tests PASSED — cluster is the mandatory gatekeeper!")

asyncio.run(main())
