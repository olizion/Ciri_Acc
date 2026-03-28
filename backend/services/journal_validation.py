"""
Journal Entry Balance Validation
Ensures debit = credit per journal_id before committing posteringer.

Bokforingsloven §6 requires balanced journal entries.
Since posteringer are immutable after creation, validation MUST happen
before commit — catching errors at SAF-T export time is too late.
"""

from decimal import Decimal

from models.postering import Postering


class UnbalancedJournalError(ValueError):
    """Raised when a set of posteringer does not balance (debit != credit)."""

    def __init__(self, journal_id: str, debit_total: Decimal, credit_total: Decimal):
        self.journal_id = journal_id
        self.debit_total = debit_total
        self.credit_total = credit_total
        diff = debit_total - credit_total
        super().__init__(
            f"Ubalansert bilagsføring for journal {journal_id}: "
            f"debet={debit_total}, kredit={credit_total}, differanse={diff}"
        )


def validate_journal_balance(posteringer: list[Postering]) -> None:
    """
    Validate that a set of posteringer balance (sum debit == sum credit).

    Call this BEFORE db.add() / db.flush() for any new set of posteringer
    belonging to the same journal_id.

    Raises UnbalancedJournalError if validation fails.
    """
    if not posteringer:
        return

    # Group by journal_id in case multiple journals are in the batch
    journals: dict[str, tuple[Decimal, Decimal]] = {}
    for p in posteringer:
        jid = p.journal_id
        debit, credit = journals.get(jid, (Decimal("0"), Decimal("0")))
        journals[jid] = (debit + (p.debit_amount or Decimal("0")),
                         credit + (p.credit_amount or Decimal("0")))

    for jid, (debit_total, credit_total) in journals.items():
        # Allow rounding tolerance of 0.01 NOK (sub-øre differences from FX)
        if abs(debit_total - credit_total) > Decimal("0.01"):
            raise UnbalancedJournalError(jid, debit_total, credit_total)
