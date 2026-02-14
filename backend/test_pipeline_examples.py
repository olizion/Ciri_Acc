"""
Pipeline test: Run realistic bilag + transactions through auto_reconcile
and log the full decision trail.
"""

import asyncio
import uuid
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal

sys.path.insert(0, "/app")


async def main():
    from config.database import async_session_maker
    from sqlalchemy import select, text
    from models import (
        Bilag, BilagStatus,
        BankTransaction, ReconciliationStatus, TransactionCategory,
        ReconciliationMatch, MatchStatus, MatchConfidence,
        Company, AutonomyLevel, BankAccount,
    )
    from models.bank_transaction import TransactionDirection
    from services.reconciliation_matcher import ReconciliationMatcher

    async with async_session_maker() as db:
        company = (await db.execute(select(Company))).scalar_one()
        bank_account = (await db.execute(
            select(BankAccount).where(BankAccount.company_id == company.id)
        )).scalars().first()

        # Clean previous test data
        await db.execute(text("DELETE FROM cluster_data_points WHERE description_key LIKE '%PIPELINE%'"))
        await db.execute(text(
            "DELETE FROM reconciliation_matches WHERE bank_transaction_id IN "
            "(SELECT id FROM bank_transactions WHERE raw_description LIKE '%PIPELINE_EX%')"
        ))
        await db.execute(text(
            "DELETE FROM posteringer WHERE bilag_id IN "
            "(SELECT id FROM bilag WHERE description LIKE '%PIPELINE_EX%')"
        ))
        await db.execute(text("DELETE FROM bilag WHERE description LIKE '%PIPELINE_EX%'"))
        await db.execute(text("DELETE FROM bank_transactions WHERE raw_description LIKE '%PIPELINE_EX%'"))
        await db.commit()

        print(f"Company: {company.name} (autonomy: {company.autonomy_level.value})")
        print(f"Bank account: {bank_account.account_name}\n")

        # ================================================================
        # EXAMPLE 1: Lønn payment (strong cluster 5000/lonn)
        # Realistic: monthly salary payment, exact amount, matching ref
        # ================================================================
        print("=" * 70)
        print("EXAMPLE 1: Lønnsutbetaling — LØNN FEBRUAR 2026")
        print("  Cluster 5000/lonn: 10 points, 5 merchants, STRONG")
        print("=" * 70)

        bilag1 = Bilag(
            company_id=company.id,
            bilag_number="B-2026-0042",
            description="PIPELINE_EX Lønnsutbetaling februar 2026",
            gross_amount=Decimal("45000.00"),
            net_amount=Decimal("45000.00"),
            mva_amount=Decimal("0.00"),
            document_date=date(2026, 2, 1),
            receipt_date=datetime.utcnow(),
            status=BilagStatus.AWAITING_TRANSACTION,
            counterparty_name="Ansatt Hansen, Erik",
            suggested_account="5000",
            category="lonn",
            file_path="bilag/lonn_feb2026.pdf",
            file_hash_sha256="a" * 64,
            original_filename="lonn_feb2026.pdf",
            mime_type="application/pdf",
        )
        db.add(bilag1)
        await db.flush()

        tx1 = BankTransaction(
            company_id=company.id,
            bank_account_id=bank_account.id,
            external_transaction_id=f"pipeline-ex-{uuid.uuid4().hex[:8]}",
            amount=Decimal("-45000.00"),
            direction=TransactionDirection.DEBIT,
            booking_date=date(2026, 2, 1),
            value_date=date(2026, 2, 1),
            raw_description="PIPELINE_EX LØNN FEBRUAR HANSEN ERIK",
            cleaned_description="LØNN FEBRUAR HANSEN ERIK",
            merchant_name="Ansatt Hansen, Erik",
            reference="B-2026-0042",
            reconciliation_status=ReconciliationStatus.UNMATCHED,
            suggested_account="5000",
            category=TransactionCategory.LONN,
        )
        db.add(tx1)
        await db.flush()
        await db.commit()

        matcher = ReconciliationMatcher(db)
        result1 = await matcher.auto_reconcile(tx1, company.autonomy_level)
        await db.commit()

        print_result("Lønnsutbetaling", tx1, result1)

        # ================================================================
        # EXAMPLE 2: GitHub subscription (growing cluster 6540/kontor)
        # Realistic: monthly SaaS payment, exact amount
        # ================================================================
        print("\n" + "=" * 70)
        print("EXAMPLE 2: GitHub abonnement — GITHUB TEAM MONTHLY")
        print("  Cluster 6540/kontor: 5 points, 3 merchants, GROWING")
        print("=" * 70)

        bilag2 = Bilag(
            company_id=company.id,
            bilag_number="B-2026-0043",
            description="PIPELINE_EX GitHub Team monthly subscription",
            gross_amount=Decimal("210.00"),
            net_amount=Decimal("168.00"),
            mva_amount=Decimal("42.00"),
            document_date=date(2026, 2, 5),
            receipt_date=datetime.utcnow(),
            status=BilagStatus.AWAITING_TRANSACTION,
            counterparty_name="GitHub Inc",
            suggested_account="6540",
            category="kontor",
            file_path="bilag/github_feb2026.pdf",
            file_hash_sha256="b" * 64,
            original_filename="github_feb2026.pdf",
            mime_type="application/pdf",
        )
        db.add(bilag2)
        await db.flush()

        tx2 = BankTransaction(
            company_id=company.id,
            bank_account_id=bank_account.id,
            external_transaction_id=f"pipeline-ex-{uuid.uuid4().hex[:8]}",
            amount=Decimal("-210.00"),
            direction=TransactionDirection.DEBIT,
            booking_date=date(2026, 2, 6),
            value_date=date(2026, 2, 6),
            raw_description="PIPELINE_EX GITHUB INC MONTHLY",
            cleaned_description="GITHUB INC MONTHLY",
            merchant_name="GitHub Inc",
            reference="B-2026-0043",
            reconciliation_status=ReconciliationStatus.UNMATCHED,
            suggested_account="6540",
            category=TransactionCategory.KONTOR,
        )
        db.add(tx2)
        await db.flush()
        await db.commit()

        matcher2 = ReconciliationMatcher(db)
        result2 = await matcher2.auto_reconcile(tx2, company.autonomy_level)
        await db.commit()

        print_result("GitHub abonnement", tx2, result2)

        # ================================================================
        # EXAMPLE 3: New supplier — no cluster exists for 4300/varekjop
        # Should be BLOCKED (no cluster to back it up)
        # ================================================================
        print("\n" + "=" * 70)
        print("EXAMPLE 3: Ny leverandør — CLAS OHLSON KONTORREKVISITA")
        print("  No cluster for 4300 — should be BLOCKED")
        print("=" * 70)

        bilag3 = Bilag(
            company_id=company.id,
            bilag_number="B-2026-0044",
            description="PIPELINE_EX Kontorrekvisita fra Clas Ohlson",
            gross_amount=Decimal("1299.00"),
            net_amount=Decimal("1039.20"),
            mva_amount=Decimal("259.80"),
            document_date=date(2026, 2, 8),
            receipt_date=datetime.utcnow(),
            status=BilagStatus.AWAITING_TRANSACTION,
            counterparty_name="Clas Ohlson AS",
            suggested_account="4300",
            category="varekjop",
            file_path="bilag/clasohlson_feb2026.pdf",
            file_hash_sha256="c" * 64,
            original_filename="clasohlson_feb2026.pdf",
            mime_type="application/pdf",
        )
        db.add(bilag3)
        await db.flush()

        tx3 = BankTransaction(
            company_id=company.id,
            bank_account_id=bank_account.id,
            external_transaction_id=f"pipeline-ex-{uuid.uuid4().hex[:8]}",
            amount=Decimal("-1299.00"),
            direction=TransactionDirection.DEBIT,
            booking_date=date(2026, 2, 9),
            value_date=date(2026, 2, 9),
            raw_description="PIPELINE_EX KORTBETALING CLAS OHLSON STAVANGER",
            cleaned_description="CLAS OHLSON STAVANGER",
            merchant_name="Clas Ohlson AS",
            reference="B-2026-0044",
            reconciliation_status=ReconciliationStatus.UNMATCHED,
            suggested_account="4300",
            category=TransactionCategory.VAREKJOP,
        )
        db.add(tx3)
        await db.flush()
        await db.commit()

        matcher3 = ReconciliationMatcher(db)
        result3 = await matcher3.auto_reconcile(tx3, company.autonomy_level)
        await db.commit()

        print_result("Clas Ohlson kontorrekvisita", tx3, result3)

        # ================================================================
        # EXAMPLE 4: Komplett.no — has a rule (auto_match) + cluster 4005/varekjop (3 pts, weak)
        # Rule provides hints but cluster is too small → should be BLOCKED
        # ================================================================
        print("\n" + "=" * 70)
        print("EXAMPLE 4: Komplett.no — regel matcher, men svak klynge 4005/varekjop")
        print("  Cluster 4005/varekjop: 3 points, 2 merchants, WEAK/GROWING")
        print("  Rule: Auto-match: Komplett.no → account 4005, category varekjop")
        print("=" * 70)

        bilag4 = Bilag(
            company_id=company.id,
            bilag_number="B-2026-0045",
            description="PIPELINE_EX Komplett.no - Skjerm og tastatur",
            gross_amount=Decimal("4599.00"),
            net_amount=Decimal("3679.20"),
            mva_amount=Decimal("919.80"),
            document_date=date(2026, 2, 7),
            receipt_date=datetime.utcnow(),
            status=BilagStatus.AWAITING_TRANSACTION,
            counterparty_name="Komplett Services AS",
            suggested_account="4005",
            category="varekjop",
            file_path="bilag/komplett_feb2026.pdf",
            file_hash_sha256="d" * 64,
            original_filename="komplett_feb2026.pdf",
            mime_type="application/pdf",
        )
        db.add(bilag4)
        await db.flush()

        tx4 = BankTransaction(
            company_id=company.id,
            bank_account_id=bank_account.id,
            external_transaction_id=f"pipeline-ex-{uuid.uuid4().hex[:8]}",
            amount=Decimal("-4599.00"),
            direction=TransactionDirection.DEBIT,
            booking_date=date(2026, 2, 8),
            value_date=date(2026, 2, 8),
            raw_description="PIPELINE_EX KOMPLETT.NO 4599.00 NOK",
            cleaned_description="KOMPLETT.NO",
            merchant_name="Komplett Services AS",
            reference="B-2026-0045",
            reconciliation_status=ReconciliationStatus.UNMATCHED,
            # No pre-set suggested_account — rule should set it
            category=TransactionCategory.UKATEGORISERT,
        )
        db.add(tx4)
        await db.flush()
        await db.commit()

        matcher4 = ReconciliationMatcher(db)
        result4 = await matcher4.auto_reconcile(tx4, company.autonomy_level)
        await db.commit()

        print_result("Komplett.no (regel + svak klynge)", tx4, result4)

        # ================================================================
        # CLEANUP
        # ================================================================
        await db.execute(text("DELETE FROM cluster_data_points WHERE description_key LIKE '%PIPELINE%'"))
        await db.execute(text(
            "DELETE FROM reconciliation_matches WHERE bank_transaction_id IN "
            "(SELECT id FROM bank_transactions WHERE raw_description LIKE '%PIPELINE_EX%')"
        ))
        await db.execute(text(
            "DELETE FROM posteringer WHERE bilag_id IN "
            "(SELECT id FROM bilag WHERE description LIKE '%PIPELINE_EX%')"
        ))
        await db.execute(text("DELETE FROM bilag WHERE description LIKE '%PIPELINE_EX%'"))
        await db.execute(text("DELETE FROM bank_transactions WHERE raw_description LIKE '%PIPELINE_EX%'"))
        await db.commit()
        print("\n✅ Test data cleaned up.")


def print_result(label, tx, match):
    """Pretty-print the full pipeline decision trail."""
    from models import MatchStatus
    if not match:
        print(f"\n  ❌ No match found for '{label}'")
        print(f"     Transaction status: {tx.reconciliation_status.value}")
        return

    factors = match.match_factors or {}
    gk = factors.get("cluster_gatekeeper", {})
    tier_info = factors.get("readiness_tier", {})

    # Match scoring breakdown
    print(f"\n  📊 MATCH SCORING:")
    for key in ["exact_amount", "reference_match", "amount_tolerance", "name_similarity", "date_proximity"]:
        f = factors.get(key, {})
        matched = "✓" if f.get("matched") else "✗"
        score = f.get("score", 0)
        print(f"     {matched} {key:20s}  score={score:.3f}  {_factor_detail(key, f)}")

    print(f"     {'─' * 50}")
    print(f"     TOTAL SCORE: {match.confidence_score:.3f}  →  {match.confidence.value.upper()}")

    # Readiness tier (informational)
    print(f"\n  📋 READINESS TIER (informational):")
    print(f"     Tier {tier_info.get('tier', '?')}: {tier_info.get('tier_label', '?')}")
    print(f"     Readiness score: {tier_info.get('readiness_score', 0):.3f}")

    # Cluster gatekeeper decision
    print(f"\n  🔒 CLUSTER GATEKEEPER:")
    decision = gk.get("decision", "?")
    cluster_found = gk.get("cluster_found", False)

    if not cluster_found:
        print(f"     No matching cluster found for this account/category")
        print(f"     Decision: ❌ BLOCKED (no cluster history)")
    else:
        cluster = gk.get("cluster", {})
        fit = gk.get("fit", {})
        print(f"     Cluster: {cluster.get('account')}/{cluster.get('category')}")
        print(f"     Strength: {cluster.get('strength_level', '?').upper()} ({cluster.get('strength', 0):.4f})")
        print(f"     Points: {cluster.get('total_points', 0)} ({cluster.get('overridden_count', 0)} overridden)")
        print(f"     Fit: direction={fit.get('direction', 0):.1f}  amount={fit.get('amount', 0):.1f}  desc={fit.get('description', 0):.2f}  total={fit.get('total', 0):.3f} ({fit.get('level', '?')})")
        symbol = "✅" if decision == "approved" else "❌"
        print(f"     Decision: {symbol} {decision.upper()}")

    # Final outcome
    print(f"\n  🏁 OUTCOME:")
    print(f"     Match status: {match.status.value}")
    print(f"     Transaction status: {tx.reconciliation_status.value}")
    if match.status == MatchStatus.AUTO_CONFIRMED:
        print(f"     → Bilag auto-posted, transaction marked MATCHED")
    else:
        print(f"     → Awaiting user review (suggested only)")
    print(f"     Explanation: {match.ciri_explanation}")


def _factor_detail(key, f):
    if key == "exact_amount":
        return f"tx={f.get('transaction', '?')} bilag={f.get('bilag', '?')}"
    if key == "amount_tolerance":
        return f"diff={f.get('difference', '?')}"
    if key == "name_similarity":
        return f"sim={f.get('similarity', 0):.2f}"
    if key == "date_proximity":
        return f"days={f.get('days_difference', '?')}"
    if key == "reference_match":
        return f"ref={f.get('transaction_ref', '?')} bilag={f.get('bilag_number', '?')}"
    return ""


asyncio.run(main())
