"""
Invoice Processor Service
Processes email attachments and creates bilag records
"""

import base64
import hashlib
import io
import logging
import os
import re
import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel
import anthropic
from PIL import Image

from config.settings import settings
from models.bilag import Bilag, BilagStatus
from models.postering import Postering
from services.email_inbox import Email, EmailAttachment

logger = logging.getLogger(__name__)


# =============================================================================
# Account Mappings for Posting
# =============================================================================

# MVA code to inngående MVA account mapping
# For incoming invoices (costs), these are the debit accounts for VAT
MVA_CODE_TO_ACCOUNT = {
    "1": "2710",   # Inngående MVA, høy sats (25%)
    "11": "2711",  # Inngående MVA, middels sats (15%)
    "13": "2712",  # Inngående MVA, lav sats (12%)
    "6": None,     # MVA-fritatt - no MVA account needed
    "81": "2715",  # Innførsel varer - reverse charge (inngående)
    "86": "2716",  # Innførsel tjenester - reverse charge (inngående)
}

# Reverse charge: these codes require BOTH inngående AND utgående MVA posting
# (self-assessment - you charge yourself VAT and deduct it)
REVERSE_CHARGE_CODES = {"81", "86"}
REVERSE_CHARGE_UTGAENDE_ACCOUNT = "2706"  # Utgående MVA, snudd avregning

# Default payables account
LEVERANDORGJELD_ACCOUNT = "2400"

# Default expense account when none suggested
DEFAULT_EXPENSE_ACCOUNT = "7700"  # Annen driftskostnad


class PostingValidationError(Exception):
    """Raised when posting validation fails."""
    pass


# =============================================================================
# Data Models
# =============================================================================

class ProcessedInvoice(BaseModel):
    """Result of processing an invoice attachment."""
    success: bool
    invoice_number: str | None = None
    supplier_name: str | None = None
    supplier_org_number: str | None = None
    invoice_date: date | None = None
    due_date: date | None = None
    gross_amount: Decimal | None = None
    net_amount: Decimal | None = None
    mva_amount: Decimal | None = None
    mva_code: str | None = None
    currency: str = "NOK"
    description: str | None = None
    category: str | None = None
    suggested_account: str | None = None
    ciri_explanation: str | None = None
    confidence: float = 0.0
    error: str | None = None


class ProcessingResult(BaseModel):
    """Result of processing an email."""
    email_id: str
    email_subject: str
    from_email: str
    attachments_processed: int
    invoices_created: int
    bilag_ids: list[str]
    errors: list[str]


# =============================================================================
# Claude Invoice Parser
# =============================================================================

# Shared Anthropic async client
_anthropic_client: anthropic.AsyncAnthropic | None = None


def get_anthropic_client() -> anthropic.AsyncAnthropic:
    """Get or create async Anthropic client."""
    global _anthropic_client
    if _anthropic_client is None:
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")
        _anthropic_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _anthropic_client


# Invoice extraction prompt optimized for automatic processing
INVOICE_EXTRACTION_PROMPT = """Du er et faktura-OCR system for norsk bokføring. Analyser dette dokumentet og ekstraher all informasjon til JSON.

Ekstraher følgende felter (bruk null for felter du ikke finner):

{
  "invoiceNumber": "fakturanummer",
  "invoiceDate": "YYYY-MM-DD format",
  "dueDate": "YYYY-MM-DD format eller null",
  "supplier": {
    "name": "firmanavn nøyaktig som vist",
    "orgNumber": "organisasjonsnummer (9 siffer) hvis norsk firma",
    "address": "adresse",
    "country": "landkode ISO 2-bokstav (NO, SE, US, etc.)"
  },
  "currency": "NOK, USD, EUR, etc.",
  "netAmount": tall (beløp uten mva),
  "mvaAmount": tall (mva-beløp, 0 hvis utenlandsk faktura),
  "grossAmount": tall (totalbeløp inkl mva),
  "mvaRate": tall (mva-sats i prosent, f.eks. 25, 15, 12, eller 0),
  "mvaCode": "MVA-kode basert på reglene nedenfor",
  "category": "en av: kontor, it, transport, mat, tjenester, varer, annet",
  "suggestedAccount": "foreslått kontokode (f.eks. 6540 for IT, 6300 for kontor)",
  "description": "kort beskrivelse på norsk (3-8 ord)",
  "ciriExplanation": "enkel forklaring på norsk, 1-2 setninger"
}

MVA-KODE REGLER (for inngående fakturaer/kjøp):
- "1": Inngående MVA 25% - standard sats for de fleste varer og tjenester fra norske leverandører
- "11": Inngående MVA 15% - mat og drikke (ikke alkohol)
- "13": Inngående MVA 12% - persontransport, hotell, kino, museer
- "6": MVA-fritatt - helsetjenester, undervisning, bank/forsikring, kollektivtransport
- "81": Kjøp av varer fra utlandet - snudd avregning, ingen inngående MVA
- "86": Kjøp av tjenester fra utlandet - digitale tjenester, programvare, skytjenester fra utenlandske selskaper (f.eks. AWS, GitHub, Anthropic, Stripe)

VIKTIG:
- For norske fakturaer: Les MVA fra fakturaen og velg riktig kode (1, 11, 13, eller 6)
- For utenlandske fakturaer (ikke norsk org.nr): mvaAmount = 0, mvaCode = "81" (varer) eller "86" (tjenester/software)
- Digitale tjenester, SaaS, skytjenester fra utlandet = kode "86"
- Alle beløp som tall uten valutasymboler
- Datoer i YYYY-MM-DD format
- Bruk null for ukjente felter

Returner KUN JSON-objektet, ingen annen tekst."""


# Try to import pdf2image
try:
    from pdf2image import convert_from_bytes
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False


async def parse_attachment_with_claude(attachment: EmailAttachment) -> ProcessedInvoice:
    """
    Parse an invoice attachment using Claude vision API.

    Supports: PDF, PNG, JPG, JPEG
    """
    try:
        content = base64.b64decode(attachment.content_base64)
        filename_lower = attachment.filename.lower()

        # Handle PDF
        if filename_lower.endswith('.pdf') or attachment.content_type == 'application/pdf':
            if not PDF_SUPPORT:
                return ProcessedInvoice(
                    success=False,
                    error="PDF support not available"
                )

            images = convert_from_bytes(content, dpi=200)
            if not images:
                return ProcessedInvoice(
                    success=False,
                    error="Could not convert PDF to image"
                )

            # Convert first page to base64 JPEG
            image = images[0]
            if image.mode in ("RGBA", "P"):
                image = image.convert("RGB")

            # Resize if too large
            max_dim = 1600
            if max(image.size) > max_dim:
                ratio = max_dim / max(image.size)
                new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
                image = image.resize(new_size, Image.Resampling.LANCZOS)

            buffer = io.BytesIO()
            image.save(buffer, format="JPEG", quality=85)
            base64_image = base64.b64encode(buffer.getvalue()).decode()
            media_type = "image/jpeg"

        # Handle images
        elif filename_lower.endswith(('.png', '.jpg', '.jpeg')) or attachment.content_type.startswith('image/'):
            image = Image.open(io.BytesIO(content))
            if image.mode in ("RGBA", "P"):
                image = image.convert("RGB")

            # Resize if too large
            max_dim = 1600
            if max(image.size) > max_dim:
                ratio = max_dim / max(image.size)
                new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
                image = image.resize(new_size, Image.Resampling.LANCZOS)

            buffer = io.BytesIO()
            image.save(buffer, format="JPEG", quality=85)
            base64_image = base64.b64encode(buffer.getvalue()).decode()
            media_type = "image/jpeg"

        # Handle CSV/Excel - just extract text info
        elif filename_lower.endswith(('.csv', '.xlsx', '.xls')):
            # For spreadsheets, we'd need different processing
            # For now, return as not parseable
            return ProcessedInvoice(
                success=False,
                error="Spreadsheet processing not yet implemented"
            )
        else:
            return ProcessedInvoice(
                success=False,
                error=f"Unsupported file type: {attachment.content_type}"
            )

        # Call Claude API (async, with prompt caching)
        client = get_anthropic_client()

        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": INVOICE_EXTRACTION_PROMPT,
                            "cache_control": {"type": "ephemeral"},
                        },
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": base64_image,
                            },
                        },
                    ],
                }
            ],
        )

        response_text = message.content[0].text

        # Parse JSON from response
        import json
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if not json_match:
            return ProcessedInvoice(
                success=False,
                error="No JSON found in Claude response"
            )

        data = json.loads(json_match.group())

        # Map to ProcessedInvoice
        supplier = data.get("supplier", {})

        # Clean org number - strip country prefix (e.g. "NO931075136" → "931075136")
        org_number = supplier.get("orgNumber")
        if org_number and isinstance(org_number, str):
            org_number = re.sub(r'^[A-Za-z]{2}', '', org_number.strip())
            org_number = re.sub(r'[^0-9]', '', org_number)[:9] or None
            supplier["orgNumber"] = org_number

        # Parse amounts
        gross = data.get("grossAmount")
        net = data.get("netAmount")
        mva = data.get("mvaAmount")

        # Calculate missing values
        if gross and net and not mva:
            mva = gross - net
        elif gross and mva and not net:
            net = gross - mva
        elif net and mva and not gross:
            gross = net + mva

        # Determine MVA code - prefer Claude's decision, fallback to rate-based logic
        mva_code = data.get("mvaCode")
        mva_rate = data.get("mvaRate")
        supplier_country = supplier.get("country", "").upper()
        is_foreign = supplier_country and supplier_country != "NO"

        # If Claude didn't provide MVA code, determine from rate and country
        if not mva_code:
            if is_foreign:
                # Foreign supplier - use reverse charge codes
                category = data.get("category", "").lower()
                if category in ["it", "tjenester"]:
                    mva_code = "86"  # Foreign services (SaaS, digital)
                else:
                    mva_code = "81"  # Foreign goods
            elif mva_rate:
                # Norwegian supplier with VAT - use incoming VAT codes
                if mva_rate == 25:
                    mva_code = "1"  # Inngående MVA, høy sats
                elif mva_rate == 15:
                    mva_code = "11"  # Inngående MVA, middels sats (mat)
                elif mva_rate == 12:
                    mva_code = "13"  # Inngående MVA, lav sats (transport)
                elif mva_rate == 0:
                    mva_code = "6"  # MVA-fritatt

        # Parse dates
        invoice_date = None
        due_date = None

        if data.get("invoiceDate"):
            try:
                invoice_date = date.fromisoformat(data["invoiceDate"])
            except (ValueError, TypeError):
                pass

        if data.get("dueDate"):
            try:
                due_date = date.fromisoformat(data["dueDate"])
            except (ValueError, TypeError):
                pass

        return ProcessedInvoice(
            success=True,
            invoice_number=data.get("invoiceNumber"),
            supplier_name=supplier.get("name"),
            supplier_org_number=supplier.get("orgNumber"),
            invoice_date=invoice_date,
            due_date=due_date,
            gross_amount=Decimal(str(gross)) if gross else None,
            net_amount=Decimal(str(net)) if net else None,
            mva_amount=Decimal(str(mva)) if mva else Decimal("0"),
            mva_code=mva_code,
            currency=data.get("currency", "NOK"),
            description=data.get("description"),
            category=data.get("category"),
            suggested_account=data.get("suggestedAccount"),
            ciri_explanation=data.get("ciriExplanation"),
            confidence=95.0,  # Claude is generally high confidence
        )

    except anthropic.APIConnectionError:
        return ProcessedInvoice(
            success=False,
            error="Could not connect to Claude API"
        )
    except anthropic.RateLimitError:
        return ProcessedInvoice(
            success=False,
            error="Rate limited by Claude API"
        )
    except anthropic.AuthenticationError:
        return ProcessedInvoice(
            success=False,
            error="Invalid Claude API key"
        )
    except Exception as e:
        return ProcessedInvoice(
            success=False,
            error=f"Processing error: {str(e)}"
        )


# =============================================================================
# Bilag Creation
# =============================================================================

def generate_bilag_number(company_id: str, sequence: int) -> str:
    """Generate bilag number in format YYYY-NNNNN."""
    year = datetime.utcnow().year
    return f"{year}-{sequence:05d}"


async def create_bilag_from_processed_invoice(
    company_id: uuid.UUID,
    processed: ProcessedInvoice,
    attachment: EmailAttachment,
    source_email_id: str,
    db_session,
    sequence_offset: int = 0,
) -> Bilag:
    """
    Create a bilag record from a processed invoice.

    The bilag is created with PENDING status for user review.
    Foreign currency amounts are converted to NOK using historical exchange rates.

    Args:
        sequence_offset: Additional offset to add to sequence number for batch processing
    """
    from sqlalchemy import func, select
    from services.currency_conversion import convert_to_nok
    import os

    # Get next bilag number for company
    result = await db_session.execute(
        select(func.count()).where(Bilag.company_id == company_id)
    )
    count = result.scalar() or 0
    bilag_number = generate_bilag_number(str(company_id), count + 1 + sequence_offset)

    # Save attachment to file storage
    content = base64.b64decode(attachment.content_base64)
    file_hash = hashlib.sha256(content).hexdigest()

    # Create file path and try to save (non-blocking on failure)
    upload_dir = settings.upload_dir
    company_dir = f"{upload_dir}/{company_id}"
    file_path = f"{company_dir}/{bilag_number}_{attachment.filename}"

    try:
        os.makedirs(company_dir, exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.warning(f"Could not save file {file_path}: {e}")
        # Continue without file - bilag will still be created

    # Get amounts
    gross_amount = processed.gross_amount or Decimal("0")
    net_amount = processed.net_amount or Decimal("0")
    mva_amount = processed.mva_amount or Decimal("0")

    # Currency conversion for non-NOK invoices
    original_currency = None
    original_amount = None
    exchange_rate = None
    exchange_rate_date = None

    currency = (processed.currency or "NOK").upper()
    if currency != "NOK" and gross_amount > 0:
        # Convert to NOK using historical rate from invoice date
        conversion = await convert_to_nok(
            gross_amount,
            currency,
            processed.invoice_date
        )

        if conversion.success:
            original_currency = currency
            original_amount = gross_amount
            exchange_rate = conversion.exchange_rate
            exchange_rate_date = conversion.rate_date

            # Update amounts to NOK
            gross_amount = conversion.nok_amount

            # Also convert net and MVA proportionally
            if original_amount > 0:
                ratio = gross_amount / original_amount
                net_amount = (net_amount * ratio).quantize(Decimal("0.01"))
                mva_amount = (mva_amount * ratio).quantize(Decimal("0.01"))

    # Determine if bilag can be auto-approved (autonomous mode)
    # Required: high confidence + all essential fields filled
    AUTO_APPROVE_THRESHOLD = 0.90  # 90% confidence required

    has_required_fields = all([
        processed.supplier_name,
        gross_amount > 0,
        processed.invoice_date,
        processed.description,
        processed.suggested_account,
        processed.mva_code,
    ])

    high_confidence = (processed.confidence / 100) >= AUTO_APPROVE_THRESHOLD
    auto_approve = has_required_fields and high_confidence

    # Set status based on completeness
    # Bilags wait for a bank transaction match before being posted
    if auto_approve:
        status = BilagStatus.AWAITING_TRANSACTION
        posted_at = None
        reasoning = f"{processed.ciri_explanation or ''} [Venter på transaksjon: alle felt utfylt med {processed.confidence:.0f}% sikkerhet]"
    else:
        status = BilagStatus.PENDING
        posted_at = None
        reasoning = processed.ciri_explanation

    # Create bilag
    bilag = Bilag(
        company_id=company_id,
        bilag_number=bilag_number,
        document_date=processed.invoice_date or date.today(),
        receipt_date=datetime.utcnow(),
        description=processed.description or f"Faktura fra {processed.supplier_name or 'ukjent'}",
        gross_amount=gross_amount,
        net_amount=net_amount,
        mva_amount=mva_amount,
        mva_code=processed.mva_code,
        original_currency=original_currency,
        original_amount=original_amount,
        exchange_rate=exchange_rate,
        exchange_rate_date=exchange_rate_date,
        counterparty_name=processed.supplier_name,
        counterparty_org_number=processed.supplier_org_number,
        category=processed.category,
        suggested_account=processed.suggested_account,
        file_path=file_path,
        file_hash_sha256=file_hash,
        original_filename=attachment.filename,
        mime_type=attachment.content_type,
        status=status,
        created_by_ciri=True,
        ciri_confidence=processed.confidence / 100,  # Convert to 0-1
        ciri_reasoning=reasoning,
        posted_at=posted_at,
    )

    db_session.add(bilag)
    await db_session.flush()  # Ensure bilag.id is generated

    # Posteringer are created when a bank transaction match is confirmed,
    # not at ingest time. See reconciliation_matcher.auto_reconcile()
    # and bank.py confirm_match/create_manual_match endpoints.

    return bilag


# MVA code to utgående MVA account mapping (for sales invoices)
UTGAENDE_MVA_CODE_TO_ACCOUNT = {
    "3": "2700",   # Utgående MVA, høy sats (25%)
    "31": "2701",  # Utgående MVA, middels sats (15%)
    "33": "2702",  # Utgående MVA, lav sats (12%)
    "5": None,     # MVA-fritatt eksport
    "6": None,     # MVA-fritatt
}

# Kundefordringer account
KUNDEFORDRINGER_ACCOUNT = "1500"


def _create_income_posteringer(
    bilag: Bilag,
    company_id: uuid.UUID,
    income_account: str,
    mva_code: str | None,
    net_amount: Decimal,
    mva_amount: Decimal,
    gross_amount: Decimal,
    description: str,
    posting_date,
    period: str,
    journal_id: str,
    base_saft_id: str,
) -> list[Postering]:
    """
    Create double-entry posteringer for a sales/income invoice (utgående faktura).

    Pattern:
    - DEBIT  1500  {gross_amount}  # Kundefordringer
    - CREDIT {income_account}  {net_amount}  # Salgsinntekt
    - CREDIT 2700  {mva_amount}  # Utgående MVA (if applicable)
    """
    posteringer = []
    posting_seq = 1
    total_debit = Decimal("0")
    total_credit = Decimal("0")

    # 1. DEBIT: Kundefordringer (what the customer owes us)
    posteringer.append(Postering(
        company_id=company_id,
        bilag_id=bilag.id,
        journal_id=journal_id,
        posting_date=posting_date,
        period=period,
        account_number=KUNDEFORDRINGER_ACCOUNT,
        description=f"Kundefordring - {description}",
        debit_amount=gross_amount,
        credit_amount=Decimal("0"),
        mva_code=None,
        mva_amount=Decimal("0"),
        saft_transaction_id=f"{base_saft_id}-{posting_seq:02d}",
        created_by_ciri=True,
    ))
    total_debit += gross_amount
    posting_seq += 1

    # 2. CREDIT: Income account (revenue)
    posteringer.append(Postering(
        company_id=company_id,
        bilag_id=bilag.id,
        journal_id=journal_id,
        posting_date=posting_date,
        period=period,
        account_number=income_account,
        description=description,
        debit_amount=Decimal("0"),
        credit_amount=net_amount,
        mva_code=mva_code,
        mva_amount=Decimal("0"),
        saft_transaction_id=f"{base_saft_id}-{posting_seq:02d}",
        created_by_ciri=True,
    ))
    total_credit += net_amount
    posting_seq += 1

    # 3. CREDIT: Utgående MVA (if applicable)
    if mva_amount > 0:
        if mva_code and mva_code in UTGAENDE_MVA_CODE_TO_ACCOUNT:
            mva_account = UTGAENDE_MVA_CODE_TO_ACCOUNT[mva_code]
        elif mva_code == "6" or mva_code == "5":
            mva_account = None
        else:
            mva_account = "2700"  # Default to høy sats

        if mva_account:
            posteringer.append(Postering(
                company_id=company_id,
                bilag_id=bilag.id,
                journal_id=journal_id,
                posting_date=posting_date,
                period=period,
                account_number=mva_account,
                description=f"Utgående MVA - {description}",
                debit_amount=Decimal("0"),
                credit_amount=mva_amount,
                mva_code=mva_code,
                mva_amount=mva_amount,
                saft_transaction_id=f"{base_saft_id}-{posting_seq:02d}",
                created_by_ciri=True,
            ))
            total_credit += mva_amount

    # Verify balance
    if total_debit != total_credit:
        raise PostingValidationError(
            f"Posteringer balanserer ikke! Debet: {total_debit}, Kredit: {total_credit}, "
            f"Differanse: {total_debit - total_credit}"
        )

    return posteringer


def create_posteringer_for_bilag(
    bilag: Bilag,
    company_id: uuid.UUID,
    expense_account: str | None,
    mva_code: str | None,
    net_amount: Decimal,
    mva_amount: Decimal,
    gross_amount: Decimal,
    description: str,
    saft_id_suffix: str = "",  # For uniqueness in backfill scenarios
) -> list[Postering]:
    """
    Create double-entry posteringer for an invoice.

    For purchase invoices (inngående faktura, accounts 4xxx-7xxx):
    - DEBIT  {expense_account}  {net_amount}    # Expense
    - DEBIT  {mva_account}      {mva_amount}    # Inngående MVA (if applicable)
    - CREDIT 2400               {gross_amount}  # Leverandørgjeld

    For sales invoices (utgående faktura, accounts 3xxx):
    - DEBIT  1500               {gross_amount}  # Kundefordringer
    - CREDIT {income_account}   {net_amount}    # Salgsinntekt
    - CREDIT 2700               {mva_amount}    # Utgående MVA (if applicable)

    For reverse charge (codes 81, 86 - foreign purchases):
    - DEBIT  {expense_account}  {net_amount}    # Expense
    - DEBIT  2715/2716          {mva_amount}    # Inngående MVA (self-assessed)
    - CREDIT 2706               {mva_amount}    # Utgående MVA (self-assessed)
    - CREDIT 2400               {gross_amount}  # Leverandørgjeld

    Raises PostingValidationError if entries don't balance.
    """
    posting_date = bilag.document_date
    period = posting_date.strftime("%Y-%m")
    journal_id = f"J-{bilag.bilag_number}"
    base_saft_id = f"SAFT-{bilag.bilag_number}{saft_id_suffix}"

    # Use default expense account if none provided
    expense_account = expense_account or DEFAULT_EXPENSE_ACCOUNT

    posteringer = []
    posting_seq = 1

    # Validate we have something to post
    if gross_amount <= 0:
        raise PostingValidationError(f"Brutto beløp må være positivt: {gross_amount}")

    # Detect income/sales invoices (account 3xxx)
    is_income = expense_account.startswith("3")
    if is_income:
        return _create_income_posteringer(
            bilag=bilag,
            company_id=company_id,
            income_account=expense_account,
            mva_code=mva_code,
            net_amount=net_amount,
            mva_amount=mva_amount,
            gross_amount=gross_amount,
            description=description,
            posting_date=posting_date,
            period=period,
            journal_id=journal_id,
            base_saft_id=base_saft_id,
        )

    # Handle credit notes (negative amounts) - flip debit/credit
    is_credit_note = net_amount < 0 or gross_amount < 0

    if is_credit_note:
        # For credit notes, reverse all signs and swap debit/credit
        net_amount = abs(net_amount)
        mva_amount = abs(mva_amount)
        gross_amount = abs(gross_amount)

    # Track totals for balance verification
    total_debit = Decimal("0")
    total_credit = Decimal("0")

    # 1. DEBIT: Expense account (net amount without MVA)
    # Even if net_amount is 0, we might still have gross_amount (edge case)
    if net_amount > 0:
        if is_credit_note:
            # Credit note: credit the expense account instead
            posteringer.append(Postering(
                company_id=company_id,
                bilag_id=bilag.id,
                journal_id=journal_id,
                posting_date=posting_date,
                period=period,
                account_number=expense_account,
                description=f"Kreditnota - {description}",
                debit_amount=Decimal("0"),
                credit_amount=net_amount,
                mva_code=mva_code,
                mva_amount=Decimal("0"),
                saft_transaction_id=f"{base_saft_id}-{posting_seq:02d}",
                created_by_ciri=True,
            ))
            total_credit += net_amount
        else:
            posteringer.append(Postering(
                company_id=company_id,
                bilag_id=bilag.id,
                journal_id=journal_id,
                posting_date=posting_date,
                period=period,
                account_number=expense_account,
                description=description,
                debit_amount=net_amount,
                credit_amount=Decimal("0"),
                mva_code=mva_code,
                mva_amount=Decimal("0"),
                saft_transaction_id=f"{base_saft_id}-{posting_seq:02d}",
                created_by_ciri=True,
            ))
            total_debit += net_amount
        posting_seq += 1

    # 2. DEBIT: Inngående MVA account (if MVA applies)
    if mva_amount > 0:
        # Determine MVA account
        if mva_code and mva_code in MVA_CODE_TO_ACCOUNT:
            mva_account = MVA_CODE_TO_ACCOUNT[mva_code]
        elif mva_code == "6":
            # MVA-exempt, no MVA posting needed
            mva_account = None
        else:
            # Unknown MVA code - default to standard rate account
            # This prevents unbalanced books
            mva_account = "2710"  # Default to høy sats

        if mva_account:
            if is_credit_note:
                posteringer.append(Postering(
                    company_id=company_id,
                    bilag_id=bilag.id,
                    journal_id=journal_id,
                    posting_date=posting_date,
                    period=period,
                    account_number=mva_account,
                    description=f"Inngående MVA kreditnota - {description}",
                    debit_amount=Decimal("0"),
                    credit_amount=mva_amount,
                    mva_code=mva_code,
                    mva_amount=mva_amount,
                    saft_transaction_id=f"{base_saft_id}-{posting_seq:02d}",
                    created_by_ciri=True,
                ))
                total_credit += mva_amount
            else:
                posteringer.append(Postering(
                    company_id=company_id,
                    bilag_id=bilag.id,
                    journal_id=journal_id,
                    posting_date=posting_date,
                    period=period,
                    account_number=mva_account,
                    description=f"Inngående MVA - {description}",
                    debit_amount=mva_amount,
                    credit_amount=Decimal("0"),
                    mva_code=mva_code,
                    mva_amount=mva_amount,
                    saft_transaction_id=f"{base_saft_id}-{posting_seq:02d}",
                    created_by_ciri=True,
                ))
                total_debit += mva_amount
            posting_seq += 1

            # 2b. For reverse charge: also CREDIT utgående MVA (self-assessment)
            if mva_code in REVERSE_CHARGE_CODES:
                if is_credit_note:
                    posteringer.append(Postering(
                        company_id=company_id,
                        bilag_id=bilag.id,
                        journal_id=journal_id,
                        posting_date=posting_date,
                        period=period,
                        account_number=REVERSE_CHARGE_UTGAENDE_ACCOUNT,
                        description=f"Utgående MVA snudd avregning kreditnota - {description}",
                        debit_amount=mva_amount,
                        credit_amount=Decimal("0"),
                        mva_code=mva_code,
                        mva_amount=mva_amount,
                        saft_transaction_id=f"{base_saft_id}-{posting_seq:02d}",
                        created_by_ciri=True,
                    ))
                    total_debit += mva_amount
                else:
                    posteringer.append(Postering(
                        company_id=company_id,
                        bilag_id=bilag.id,
                        journal_id=journal_id,
                        posting_date=posting_date,
                        period=period,
                        account_number=REVERSE_CHARGE_UTGAENDE_ACCOUNT,
                        description=f"Utgående MVA snudd avregning - {description}",
                        debit_amount=Decimal("0"),
                        credit_amount=mva_amount,
                        mva_code=mva_code,
                        mva_amount=mva_amount,
                        saft_transaction_id=f"{base_saft_id}-{posting_seq:02d}",
                        created_by_ciri=True,
                    ))
                    total_credit += mva_amount
                posting_seq += 1

    # 3. CREDIT: Leverandørgjeld
    # For reverse charge (foreign invoices): use NET amount (what you actually pay the supplier)
    # For Norwegian invoices: use GROSS amount (includes VAT you pay to supplier)
    is_reverse_charge = mva_code in REVERSE_CHARGE_CODES
    leverandorgjeld_amount = net_amount if is_reverse_charge else gross_amount

    if is_credit_note:
        # Credit note reduces leverandørgjeld (debit)
        posteringer.append(Postering(
            company_id=company_id,
            bilag_id=bilag.id,
            journal_id=journal_id,
            posting_date=posting_date,
            period=period,
            account_number=LEVERANDORGJELD_ACCOUNT,
            description=f"Reduksjon leverandørgjeld - {description}",
            debit_amount=leverandorgjeld_amount,
            credit_amount=Decimal("0"),
            mva_code=None,
            mva_amount=Decimal("0"),
            saft_transaction_id=f"{base_saft_id}-{posting_seq:02d}",
            created_by_ciri=True,
        ))
        total_debit += leverandorgjeld_amount
    else:
        posteringer.append(Postering(
            company_id=company_id,
            bilag_id=bilag.id,
            journal_id=journal_id,
            posting_date=posting_date,
            period=period,
            account_number=LEVERANDORGJELD_ACCOUNT,
            description=f"Leverandørgjeld - {description}",
            debit_amount=Decimal("0"),
            credit_amount=leverandorgjeld_amount,
            mva_code=None,
            mva_amount=Decimal("0"),
            saft_transaction_id=f"{base_saft_id}-{posting_seq:02d}",
            created_by_ciri=True,
        ))
        total_credit += leverandorgjeld_amount

    # CRITICAL: Verify balance before returning
    if total_debit != total_credit:
        raise PostingValidationError(
            f"Posteringer balanserer ikke! Debet: {total_debit}, Kredit: {total_credit}, "
            f"Differanse: {total_debit - total_credit}"
        )

    return posteringer


async def post_bilag_with_entries(
    bilag: Bilag,
    db_session,
) -> list[Postering]:
    """
    Post a bilag and create its journal entries.

    Called when:
    - User manually approves a PENDING bilag
    - Bilag status changes from PENDING/APPROVED to POSTED

    This uses data already on the bilag (from Claude parsing) - no new API call.

    Raises:
        PostingValidationError: If the entries don't balance or validation fails
    """
    # Check if bilag already has posteringer (idempotency)
    from sqlalchemy import select, func

    existing_count = await db_session.execute(
        select(func.count()).where(Postering.bilag_id == bilag.id)
    )
    if existing_count.scalar() > 0:
        raise PostingValidationError(
            f"Bilag {bilag.bilag_number} har allerede posteringer"
        )

    # Create posteringer from bilag data
    posteringer = create_posteringer_for_bilag(
        bilag=bilag,
        company_id=bilag.company_id,
        expense_account=bilag.suggested_account,
        mva_code=bilag.mva_code,
        net_amount=bilag.net_amount,
        mva_amount=bilag.mva_amount,
        gross_amount=bilag.gross_amount,
        description=bilag.description,
    )

    # Update bilag status
    bilag.status = BilagStatus.POSTED
    bilag.posted_at = datetime.utcnow()

    # Add posteringer to session
    for postering in posteringer:
        db_session.add(postering)

    return posteringer


async def backfill_posteringer_for_posted_bilags(
    company_id: uuid.UUID,
    db_session,
) -> tuple[int, list[str]]:
    """
    Create posteringer for bilags that are POSTED but have no entries.

    Useful for migrating existing data or fixing missed entries.
    Idempotent - skips bilags that already have posteringer.

    Returns:
        Tuple of (count of posteringer created, list of error messages)
    """
    from sqlalchemy import select, exists

    # Find POSTED bilags without posteringer
    result = await db_session.execute(
        select(Bilag)
        .where(
            Bilag.company_id == company_id,
            Bilag.status == BilagStatus.POSTED,
            ~exists(
                select(Postering.id).where(Postering.bilag_id == Bilag.id)
            )
        )
    )
    bilags = result.scalars().all()

    count = 0
    errors = []

    for bilag in bilags:
        try:
            # Add timestamp suffix for uniqueness in case of re-runs
            suffix = f"-BF{datetime.utcnow().strftime('%H%M%S')}"

            posteringer = create_posteringer_for_bilag(
                bilag=bilag,
                company_id=company_id,
                expense_account=bilag.suggested_account,
                mva_code=bilag.mva_code,
                net_amount=bilag.net_amount,
                mva_amount=bilag.mva_amount,
                gross_amount=bilag.gross_amount,
                description=bilag.description,
                saft_id_suffix=suffix,
            )
            for postering in posteringer:
                db_session.add(postering)
            count += len(posteringer)

        except PostingValidationError as e:
            errors.append(f"Bilag {bilag.bilag_number}: {str(e)}")
        except Exception as e:
            errors.append(f"Bilag {bilag.bilag_number}: Uventet feil - {str(e)}")

    await db_session.commit()
    return count, errors


# =============================================================================
# Email Processing Pipeline
# =============================================================================

async def process_email_for_invoices(
    email: Email,
    company_id: uuid.UUID,
    db_session,
    sequence_offset: int = 0,
) -> tuple[ProcessingResult, int]:
    """
    Process an email and extract invoices from attachments.

    1. Filters to invoice-candidate attachments
    2. Parses each with Claude
    3. Creates bilag records for successful parses

    Args:
        sequence_offset: Starting offset for bilag sequence numbers in this batch

    Returns:
        Tuple of (ProcessingResult, number of bilags created for sequence tracking)
    """
    result = ProcessingResult(
        email_id=email.message_id,
        email_subject=email.subject,
        from_email=email.from_email,
        attachments_processed=0,
        invoices_created=0,
        bilag_ids=[],
        errors=[],
    )

    invoice_attachments = email.invoice_attachments
    bilags_created = 0

    if not invoice_attachments:
        return result, bilags_created

    for attachment in invoice_attachments:
        result.attachments_processed += 1

        try:
            # Parse the attachment
            processed = await parse_attachment_with_claude(attachment)

            if not processed.success:
                result.errors.append(
                    f"{attachment.filename}: {processed.error}"
                )
                continue

            # Create bilag with offset to ensure unique bilag_number
            bilag = await create_bilag_from_processed_invoice(
                company_id=company_id,
                processed=processed,
                attachment=attachment,
                source_email_id=email.message_id,
                db_session=db_session,
                sequence_offset=sequence_offset + bilags_created,
            )

            bilags_created += 1
            result.invoices_created += 1
            result.bilag_ids.append(str(bilag.id))

        except Exception as e:
            logger.error(f"Error processing {attachment.filename}: {e}", exc_info=True)
            result.errors.append(
                f"{attachment.filename}: {str(e)}"
            )

    return result, bilags_created


async def process_emails_batch(
    emails: list[Email],
    company_id: uuid.UUID,
    db_session,
) -> list[ProcessingResult]:
    """
    Process a batch of emails for invoices.

    Tracks sequence offset across all emails to ensure unique bilag_numbers.
    """
    results = []
    cumulative_offset = 0

    for email in emails:
        result, bilags_created = await process_email_for_invoices(
            email, company_id, db_session, sequence_offset=cumulative_offset
        )
        results.append(result)
        cumulative_offset += bilags_created

    # Commit all bilags
    await db_session.commit()

    return results
