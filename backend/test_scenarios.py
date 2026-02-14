"""
Comprehensive pipeline scenarios: varying match quality, cluster strength,
rule presence, and amount accuracy.
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
        ReconciliationRule, RuleType,
    )
    from models.bank_transaction import TransactionDirection
    from models.cluster_data_point import ClusterDataPoint, DataPointSource
    from services.reconciliation_matcher import ReconciliationMatcher

    async with async_session_maker() as db:
        company = (await db.execute(select(Company))).scalar_one()
        bank_account = (await db.execute(
            select(BankAccount).where(BankAccount.company_id == company.id)
        )).scalars().first()

        # ── CLEANUP from previous runs ──
        await db.execute(text("DELETE FROM cluster_data_points WHERE description_key LIKE '%SCENARIO%'"))
        await db.execute(text(
            "DELETE FROM reconciliation_matches WHERE bank_transaction_id IN "
            "(SELECT id FROM bank_transactions WHERE raw_description LIKE '%SCENARIO_%')"
        ))
        await db.execute(text(
            "DELETE FROM posteringer WHERE bilag_id IN "
            "(SELECT id FROM bilag WHERE description LIKE '%SCENARIO_%')"
        ))
        await db.execute(text("DELETE FROM bilag WHERE description LIKE '%SCENARIO_%'"))
        await db.execute(text("DELETE FROM bank_transactions WHERE raw_description LIKE '%SCENARIO_%'"))
        await db.execute(text("DELETE FROM reconciliation_rules WHERE name LIKE '%SCENARIO_%'"))
        await db.commit()

        print(f"Company: {company.name}  |  Autonomy: {company.autonomy_level.value}")
        print(f"Bank account: {bank_account.account_name}")
        print()

        # ── HELPERS ──

        async def make_bilag(amount, suffix, account="5000", category="lonn", days_ago=0):
            b = Bilag(
                company_id=company.id,
                bilag_number=f"SC-{uuid.uuid4().hex[:6]}",
                description=f"SCENARIO_{suffix}",
                gross_amount=Decimal(str(amount)),
                net_amount=Decimal(str(round(amount * 0.8, 2))),
                mva_amount=Decimal(str(round(amount * 0.2, 2))),
                document_date=date.today() - timedelta(days=days_ago),
                receipt_date=datetime.utcnow(),
                status=BilagStatus.AWAITING_TRANSACTION,
                counterparty_name=f"Leverandør {suffix}",
                suggested_account=account,
                category=category,
                file_path=f"test/{suffix}.pdf",
                file_hash_sha256=uuid.uuid4().hex * 2,
                original_filename=f"{suffix}.pdf",
                mime_type="application/pdf",
            )
            db.add(b)
            await db.flush()
            return b

        async def make_tx(amount, suffix, account=None, cat=TransactionCategory.UKATEGORISERT,
                          merchant=None, ref=None, days_ago=0):
            tx = BankTransaction(
                company_id=company.id,
                bank_account_id=bank_account.id,
                external_transaction_id=f"sc-{uuid.uuid4().hex[:8]}",
                amount=Decimal(str(-abs(amount))),
                direction=TransactionDirection.DEBIT,
                booking_date=date.today() - timedelta(days=days_ago),
                value_date=date.today() - timedelta(days=days_ago),
                raw_description=f"SCENARIO_{suffix}",
                cleaned_description=f"SCENARIO_{suffix}",
                merchant_name=merchant or f"Leverandør {suffix}",
                reference=ref,
                reconciliation_status=ReconciliationStatus.UNMATCHED,
                suggested_account=account,
                category=cat,
            )
            db.add(tx)
            await db.flush()
            return tx

        async def seed_cluster(account, category, n_points, n_overridden=0, merchants=None,
                               amount_base=5000, amount_spread=500):
            if merchants is None:
                merchants = [f"M{i}" for i in range(min(5, n_points))]
            for i in range(n_points):
                p = ClusterDataPoint(
                    company_id=company.id,
                    account_number=account,
                    category=category,
                    merchant_name=merchants[i % len(merchants)],
                    description_key=f"SCENARIO_SEED",
                    amount=amount_base + (i * amount_spread / max(n_points, 1)),
                    direction="debit",
                    source=DataPointSource.USER_CONFIRMED,
                    confirmed_at=datetime.utcnow() - timedelta(days=i),
                    was_overridden=(i < n_overridden),
                    overridden_at=datetime.utcnow() if i < n_overridden else None,
                )
                db.add(p)
            await db.flush()

        async def run(label, tx):
            matcher = ReconciliationMatcher(db)
            result = await matcher.auto_reconcile(tx, company.autonomy_level)
            await db.commit()
            print_result(label, tx, result)
            return result

        # ================================================================
        # 1. PERFECT MATCH + STRONG CLUSTER
        #    Exact amount, reference, name, same date, strong cluster
        # ================================================================
        await seed_cluster("5000", "lonn", 15, 0,
                           ["HANSEN", "OLSEN", "BERG", "DAHL", "MOE"],
                           amount_base=30000, amount_spread=20000)

        b = await make_bilag(42000, "1_PERFECT", "5000", "lonn")
        tx = await make_tx(42000, "1_PERFECT", "5000", TransactionCategory.LONN,
                           merchant="Leverandør 1_PERFECT", ref=b.bilag_number)
        await db.commit()
        await run("1. PERFECT MATCH + STRONG CLUSTER", tx)

        # ================================================================
        # 2. NEAR-MISS AMOUNT (within 5% tolerance) + STRONG CLUSTER
        #    Bilag = 10,000 / Tx = 10,350 (3.5% diff)
        # ================================================================
        b2 = await make_bilag(10000, "2_TOLERANCE", "5000", "lonn")
        tx2 = await make_tx(10350, "2_TOLERANCE", "5000", TransactionCategory.LONN,
                            merchant="Leverandør 2_TOLERANCE", ref=b2.bilag_number)
        await db.commit()
        await run("2. NEAR-MISS AMOUNT (3.5% diff) + STRONG CLUSTER", tx2)

        # ================================================================
        # 3. NO REFERENCE + STRONG CLUSTER
        #    Exact amount, same merchant name, same date — but no reference
        # ================================================================
        b3 = await make_bilag(25000, "3_NOREF", "5000", "lonn")
        tx3 = await make_tx(25000, "3_NOREF", "5000", TransactionCategory.LONN,
                            merchant="Leverandør 3_NOREF", ref=None)
        await db.commit()
        await run("3. NO REFERENCE + STRONG CLUSTER", tx3)

        # ================================================================
        # 4. STALE DATE (10 days apart) + STRONG CLUSTER
        #    Exact amount, reference match — but bilag is 10 days older
        # ================================================================
        b4 = await make_bilag(18000, "4_STALE_DATE", "5000", "lonn", days_ago=10)
        tx4 = await make_tx(18000, "4_STALE_DATE", "5000", TransactionCategory.LONN,
                            merchant="Leverandør 4_STALE_DATE", ref=b4.bilag_number)
        await db.commit()
        await run("4. STALE DATE (10 days apart) + STRONG CLUSTER", tx4)

        # ================================================================
        # 5. MEDIUM CONFIDENCE + STRONG CLUSTER
        #    Amount slightly off + no reference → MEDIUM score
        #    Strong cluster should still approve (lower threshold)
        # ================================================================
        b5 = await make_bilag(8000, "5_MED_STRONG", "5000", "lonn")
        tx5 = await make_tx(8200, "5_MED_STRONG", "5000", TransactionCategory.LONN,
                            merchant="Leverandør 5_MED_STRONG", ref=None)
        await db.commit()
        await run("5. MEDIUM CONFIDENCE + STRONG CLUSTER", tx5)

        # ================================================================
        # 6. MEDIUM CONFIDENCE + GROWING CLUSTER
        #    Same scenario as #5 but with a growing cluster → should BLOCK
        # ================================================================
        await seed_cluster("6300", "leie", 6, 0,
                           ["UTLEIER_A", "UTLEIER_B"],
                           amount_base=8000, amount_spread=2000)

        b6 = await make_bilag(9500, "6_MED_GROWING", "6300", "leie")
        tx6 = await make_tx(9700, "6_MED_GROWING", "6300", TransactionCategory.LEIE,
                            merchant="Leverandør 6_MED_GROWING", ref=None)
        await db.commit()
        await run("6. MEDIUM CONFIDENCE + GROWING CLUSTER", tx6)

        # ================================================================
        # 7. LOW CONFIDENCE + STRONG CLUSTER
        #    Big amount diff + wrong name + no ref → LOW
        #    Even strong cluster can't save this
        # ================================================================
        b7 = await make_bilag(50000, "7_LOW", "5000", "lonn")
        tx7 = await make_tx(35000, "7_DIFFERENT_NAME", "5000", TransactionCategory.LONN,
                            merchant="Helt Annen Bedrift AS", ref=None, days_ago=12)
        await db.commit()
        await run("7. LOW CONFIDENCE + STRONG CLUSTER", tx7)

        # ================================================================
        # 8. HIGH MATCH + NO CLUSTER AT ALL
        #    Perfect match scores — but novel account with zero history
        # ================================================================
        b8 = await make_bilag(3200, "8_NO_CLUSTER", "7999", "annet")
        tx8 = await make_tx(3200, "8_NO_CLUSTER", "7999", TransactionCategory.UKATEGORISERT,
                            merchant="Leverandør 8_NO_CLUSTER", ref=b8.bilag_number)
        await db.commit()
        await run("8. HIGH MATCH + NO CLUSTER", tx8)

        # ================================================================
        # 9. HIGH MATCH + CONTAMINATED CLUSTER (30% overrides)
        #    Perfect match but cluster is unreliable
        # ================================================================
        await seed_cluster("4200", "varekjop", 10, 3,
                           ["KONTAM_A", "KONTAM_B", "KONTAM_C", "KONTAM_D"],
                           amount_base=2000, amount_spread=3000)

        b9 = await make_bilag(4000, "9_CONTAMINATED", "4200", "varekjop")
        tx9 = await make_tx(4000, "9_CONTAMINATED", "4200", TransactionCategory.VAREKJOP,
                            merchant="Leverandør 9_CONTAMINATED", ref=b9.bilag_number)
        await db.commit()
        await run("9. HIGH MATCH + CONTAMINATED CLUSTER (30% overrides)", tx9)

        # ================================================================
        # 10. RULE MATCH (hints) + STRONG CLUSTER
        #     Rule categorizes tx → finds matching strong cluster
        # ================================================================
        rule = ReconciliationRule(
            company_id=company.id,
            name="SCENARIO_AutoMatch_Telenor",
            rule_type=RuleType.AUTO_MATCH,
            criteria={"description_contains": "TELENOR"},
            action={"account": "5000", "category": "lonn"},
            is_active=True,
        )
        db.add(rule)
        await db.flush()

        b10 = await make_bilag(15000, "10_RULE", "5000", "lonn")
        tx10 = await make_tx(15000, "10_RULE_TELENOR", None, TransactionCategory.UKATEGORISERT,
                             merchant="Telenor Norge AS", ref=b10.bilag_number)
        await db.commit()
        await run("10. RULE PROVIDES HINTS → STRONG CLUSTER APPROVES", tx10)

        # ================================================================
        # 11. IGNORE RULE — transaction should be IGNORED, never reaches cluster
        # ================================================================
        ignore_rule = ReconciliationRule(
            company_id=company.id,
            name="SCENARIO_Ignore_Netflix",
            rule_type=RuleType.IGNORE,
            criteria={"description_contains": "NETFLIX"},
            action={"mark_private": True, "reason": "Privat underholdning"},
            is_active=True,
        )
        db.add(ignore_rule)
        await db.flush()

        # Create a bilag that would match perfectly — but the IGNORE rule fires first
        b11 = await make_bilag(179, "11_IGNORE", "7999", "privat")
        tx11 = await make_tx(179, "11_IGNORE_NETFLIX", None, TransactionCategory.UKATEGORISERT,
                             merchant="Netflix International", ref=b11.bilag_number)
        await db.commit()

        matcher11 = ReconciliationMatcher(db)
        result11 = await matcher11.auto_reconcile(tx11, company.autonomy_level)
        await db.commit()

        print("\n" + "=" * 70)
        print("11. IGNORE RULE — Netflix (should be IGNORED before cluster check)")
        print("=" * 70)
        if result11 is None:
            print(f"  Result: None (rule fully handled it)")
            print(f"  Transaction status: {tx11.reconciliation_status.value}")
            print(f"  Is private: {tx11.is_private}")
            print(f"  → ✅ Correctly IGNORED without reaching cluster gatekeeper")
        else:
            print(f"  ❌ Unexpected match created: {result11.status.value}")

        # ================================================================
        # 12. AMOUNT MISMATCH (>5% diff) + STRONG CLUSTER
        #     Bilag=20,000 / Tx=22,500 (12.5% diff) — too big for tolerance
        # ================================================================
        b12 = await make_bilag(20000, "12_BIG_DIFF", "5000", "lonn")
        tx12 = await make_tx(22500, "12_BIG_DIFF", "5000", TransactionCategory.LONN,
                             merchant="Leverandør 12_BIG_DIFF", ref=b12.bilag_number, days_ago=3)
        await db.commit()
        await run("12. AMOUNT MISMATCH (12.5% off) + STRONG CLUSTER", tx12)

        # ================================================================
        # CLEANUP
        # ================================================================
        await db.execute(text("DELETE FROM cluster_data_points WHERE description_key LIKE '%SCENARIO%'"))
        await db.execute(text(
            "DELETE FROM reconciliation_matches WHERE bank_transaction_id IN "
            "(SELECT id FROM bank_transactions WHERE raw_description LIKE '%SCENARIO_%')"
        ))
        await db.execute(text(
            "DELETE FROM posteringer WHERE bilag_id IN "
            "(SELECT id FROM bilag WHERE description LIKE '%SCENARIO_%')"
        ))
        await db.execute(text("DELETE FROM bilag WHERE description LIKE '%SCENARIO_%'"))
        await db.execute(text("DELETE FROM bank_transactions WHERE raw_description LIKE '%SCENARIO_%'"))
        await db.execute(text("DELETE FROM reconciliation_rules WHERE name LIKE '%SCENARIO_%'"))
        await db.commit()

        print("\n✅ All test data cleaned up.")


def print_result(label, tx, match):
    from models import MatchStatus
    print("\n" + "=" * 70)
    print(label)
    print("=" * 70)

    if not match:
        print(f"  ❌ No bilag match found")
        print(f"  Transaction status: {tx.reconciliation_status.value}")
        return

    factors = match.match_factors or {}
    gk = factors.get("cluster_gatekeeper", {})
    tier = factors.get("readiness_tier", {})

    # Scoring
    print(f"\n  MATCH SCORING:")
    total = 0
    for key in ["exact_amount", "reference_match", "amount_tolerance", "name_similarity", "date_proximity"]:
        f = factors.get(key, {})
        m = "✓" if f.get("matched") else "✗"
        s = f.get("score", 0)
        total += s
        detail = _detail(key, f)
        print(f"    {m} {key:20s}  {s:.3f}  {detail}")
    print(f"    {'─' * 55}")
    print(f"    TOTAL: {match.confidence_score:.3f}  →  {match.confidence.value.upper()}")

    # Cluster gatekeeper
    print(f"\n  CLUSTER GATEKEEPER:")
    if not gk.get("cluster_found"):
        print(f"    No cluster found → ❌ BLOCKED")
    else:
        c = gk.get("cluster", {})
        f = gk.get("fit", {})
        print(f"    {c.get('account')}/{c.get('category')}  "
              f"strength={c.get('strength_level','?').upper()} ({c.get('strength',0):.3f})  "
              f"pts={c.get('total_points',0)} overrides={c.get('overridden_count',0)}")
        print(f"    Fit: dir={f.get('direction',0):.1f} amt={f.get('amount',0):.1f} "
              f"desc={f.get('description',0):.2f} → total={f.get('total',0):.3f} ({f.get('level','?')})")
        sym = "✅" if gk.get("decision") == "approved" else "❌"
        print(f"    Decision: {sym} {gk.get('decision','?').upper()}")

    # Outcome
    outcome = "AUTO-POSTED ✅" if match.status == MatchStatus.AUTO_CONFIRMED else "SUGGESTED (needs review) 🔍"
    print(f"\n  OUTCOME: {outcome}")
    print(f"  Tx status: {tx.reconciliation_status.value}")


def _detail(key, f):
    if key == "exact_amount":
        return f"tx={f.get('transaction','?')} vs bilag={f.get('bilag','?')}"
    if key == "amount_tolerance":
        return f"diff=kr {f.get('difference',0):,.2f}"
    if key == "name_similarity":
        return f"similarity={f.get('similarity',0):.2f}"
    if key == "date_proximity":
        return f"{f.get('days_difference','?')} days apart"
    if key == "reference_match":
        return f"ref={f.get('transaction_ref','—')}"
    return ""


asyncio.run(main())
