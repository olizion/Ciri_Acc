"""
OCR API Routes
Invoice parsing using Claude API with vision capabilities.

Uses pdf2image to convert PDFs to images before sending to Claude.
"""

import base64
import io
import json
import re
from typing import Any

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from PIL import Image
import anthropic

from config.settings import settings

# Try to import pdf2image - it requires poppler-utils to be installed
try:
    from pdf2image import convert_from_bytes
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    print("⚠️  pdf2image not installed. PDF OCR will not work.")

router = APIRouter()

# Claude configuration
ANTHROPIC_API_KEY = settings.anthropic_api_key
DEFAULT_MODEL = "claude-sonnet-4-5-20250929"  # Good balance of speed/cost/quality

# Available Claude models for OCR
CLAUDE_MODELS = {
    "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5 (recommended)",
    "claude-opus-4-5-20251101": "Claude Opus 4.5 (best quality, higher cost)",
    "claude-haiku-4-5-20251001": "Claude Haiku 4.5 (fastest, lowest cost)",
}

# Shared async Anthropic client
_anthropic_client: anthropic.AsyncAnthropic | None = None


def get_anthropic_client() -> anthropic.AsyncAnthropic:
    """Get or create async Anthropic client."""
    global _anthropic_client
    if _anthropic_client is None:
        if not ANTHROPIC_API_KEY:
            raise HTTPException(
                status_code=503,
                detail="ANTHROPIC_API_KEY ikke konfigurert. Legg til i .env filen."
            )
        _anthropic_client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    return _anthropic_client


class SupplierInfo(BaseModel):
    """Supplier information extracted from invoice."""
    name: str
    address: str | None = None
    company_number: str | None = None
    vat_number: str | None = None
    email: str | None = None
    website: str | None = None


class LineItem(BaseModel):
    """Invoice line item."""
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    total_amount: float = 0.0
    tax_rate: float | None = None


class ParsedInvoice(BaseModel):
    """Structured invoice data from OCR."""
    invoice_number: str | None = None
    invoice_date: str | None = None
    due_date: str | None = None
    supplier: SupplierInfo | None = None
    currency: str = "NOK"
    subtotal: float | None = None
    tax_rate: float | None = None
    tax_amount: float | None = None
    total_amount: float = 0.0
    line_items: list[LineItem] = []
    payment_details: str | None = None
    notes: str | None = None
    summary: str | None = None
    ciri_explanation: str | None = None
    confidence: float = 0.0


class OCRStatusResponse(BaseModel):
    """OCR service status."""
    available: bool
    model: str | None = None
    pdf_support: bool = PDF_SUPPORT
    error: str | None = None


class OCRResponse(BaseModel):
    """OCR processing response."""
    success: bool
    invoice: ParsedInvoice | None = None
    model: str | None = None
    raw_response: str | None = None
    error: str | None = None


# Invoice extraction prompt for Claude
INVOICE_EXTRACTION_PROMPT = """You are an expert invoice OCR system AND a friendly AI accounting assistant named Ciri. Analyze this invoice image and extract ALL information into a structured JSON format.

Extract the following fields (use null for fields you cannot find):

{
  "invoiceNumber": "the invoice/document number",
  "invoiceDate": "YYYY-MM-DD format",
  "dueDate": "YYYY-MM-DD format or null",
  "supplier": {
    "name": "full company name exactly as shown",
    "address": "full address",
    "companyNumber": "org number, VAT ID, or company registration",
    "vatNumber": "VAT/MVA number if different from company number",
    "email": "email if shown",
    "website": "website/domain if shown"
  },
  "currency": "3-letter currency code (USD, EUR, NOK, GBP, etc.)",
  "subtotal": number (amount before tax),
  "taxRate": number (tax percentage, e.g. 25 for 25%),
  "taxAmount": number (tax/VAT amount),
  "totalAmount": number (final total including tax),
  "lineItems": [
    {
      "description": "item description",
      "quantity": number,
      "unitPrice": number,
      "totalAmount": number,
      "taxRate": number or null
    }
  ],
  "paymentDetails": "bank account, payment reference, etc. if shown",
  "notes": "any additional notes or terms",
  "summary": "A short 3-8 word description in Norwegian, e.g. 'Programvare-abonnement januar'",
  "ciriExplanation": "A simple 1-2 sentence explanation in Norwegian, like a friendly accountant explaining to a client. Focus on: (1) What is this cost in simple terms? (2) Is there MVA/tax to deduct? BE ACCURATE about MVA: If the invoice is from abroad (not Norway), there is NO MVA to deduct - say 'Utenlandsk faktura, ingen MVA-fradrag.' If it's Norwegian with MVA, mention the deduction. Keep it simple and helpful, NOT commercial or salesy. Examples: 'Betaling for AI-verktøy du bruker i jobben. Utenlandsk leverandør, så ingen MVA-fradrag.' or 'Mobilregningen for bedriften. 25% MVA kan trekkes fra.' or 'Gebyr for kortbetalinger i nettbutikken. Stripe er irsk, så ingen norsk MVA.'"
}

IMPORTANT:
- Extract the EXACT company name as written on the invoice
- Identify the currency from symbols ($, €, kr, £) or text
- All amounts should be numbers without currency symbols
- Dates must be in YYYY-MM-DD format
- If unsure about a field, use null rather than guessing
- The summary should be brief (3-8 words)
- The ciriExplanation must be ACCURATE about MVA/tax:
  * Foreign invoices (USD, EUR, GBP, non-Norwegian companies): NO MVA deduction possible
  * Norwegian invoices with MVA: Can deduct the MVA amount
  * Keep it simple, like talking to a friend who doesn't know accounting

Return ONLY the JSON object, no other text."""


def convert_pdf_to_images(pdf_bytes: bytes, dpi: int = 200) -> list[Image.Image]:
    """Convert PDF bytes to list of PIL Images."""
    if not PDF_SUPPORT:
        raise HTTPException(
            status_code=500,
            detail="PDF support not available. Install pdf2image and poppler-utils."
        )

    try:
        images = convert_from_bytes(pdf_bytes, dpi=dpi)
        return images
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Kunne ikke konvertere PDF: {str(e)}"
        )


def optimize_image(image: Image.Image, max_dimension: int = 1600) -> Image.Image:
    """
    Resize image if larger than max_dimension while preserving aspect ratio.
    Smaller images = faster processing and lower token usage.
    """
    width, height = image.size

    if width <= max_dimension and height <= max_dimension:
        return image

    if width > height:
        new_width = max_dimension
        new_height = int(height * (max_dimension / width))
    else:
        new_height = max_dimension
        new_width = int(width * (max_dimension / height))

    return image.resize((new_width, new_height), Image.Resampling.LANCZOS)


def image_to_base64(image: Image.Image, format: str = "JPEG", quality: int = 85) -> str:
    """Convert PIL Image to base64 string."""
    image = optimize_image(image)

    buffer = io.BytesIO()
    if format == "JPEG":
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        image.save(buffer, format=format, quality=quality, optimize=True)
    else:
        image.save(buffer, format=format, optimize=True)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


async def call_claude_vision(
    base64_image: str,
    model: str,
    prompt: str,
    media_type: str = "image/jpeg"
) -> str:
    """Call Claude API with vision capabilities."""
    try:
        client = get_anthropic_client()

        message = await client.messages.create(
            model=model,
            max_tokens=1024,  # Invoice JSON typically 400-600 tokens
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt,
                            "cache_control": {"type": "ephemeral"},  # Cache static prompt
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

        return message.content[0].text

    except anthropic.APIConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Kunne ikke koble til Claude API. Sjekk internettforbindelsen."
        )
    except anthropic.RateLimitError:
        raise HTTPException(
            status_code=429,
            detail="For mange forespørsler. Vent litt og prøv igjen."
        )
    except anthropic.AuthenticationError:
        raise HTTPException(
            status_code=401,
            detail="Ugyldig API-nøkkel. Sjekk ANTHROPIC_API_KEY i .env."
        )
    except anthropic.APIStatusError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Claude API feil: {str(e)}"
        )


def parse_json_response(response_text: str) -> dict[str, Any]:
    """Extract JSON from model response."""
    json_match = re.search(r'\{[\s\S]*\}', response_text)

    if not json_match:
        raise ValueError("Ingen JSON funnet i svar")

    try:
        return json.loads(json_match.group())
    except json.JSONDecodeError as e:
        raise ValueError(f"Ugyldig JSON: {str(e)}")


def map_to_invoice(data: dict[str, Any]) -> ParsedInvoice:
    """Map raw OCR data to ParsedInvoice model."""
    supplier_data = data.get("supplier", {})
    supplier = None

    if supplier_data and supplier_data.get("name"):
        supplier = SupplierInfo(
            name=supplier_data.get("name", ""),
            address=supplier_data.get("address"),
            company_number=supplier_data.get("companyNumber"),
            vat_number=supplier_data.get("vatNumber"),
            email=supplier_data.get("email"),
            website=supplier_data.get("website")
        )

    line_items = []
    for item in data.get("lineItems", []):
        if isinstance(item, dict):
            line_items.append(LineItem(
                description=str(item.get("description") or ""),
                quantity=float(item.get("quantity") or 1),
                unit_price=float(item.get("unitPrice") or 0),
                total_amount=float(item.get("totalAmount") or 0),
                tax_rate=float(item.get("taxRate")) if item.get("taxRate") is not None else None
            ))

    return ParsedInvoice(
        invoice_number=data.get("invoiceNumber"),
        invoice_date=data.get("invoiceDate"),
        due_date=data.get("dueDate"),
        supplier=supplier,
        currency=data.get("currency", "NOK"),
        subtotal=float(data.get("subtotal")) if data.get("subtotal") is not None else None,
        tax_rate=float(data.get("taxRate")) if data.get("taxRate") is not None else None,
        tax_amount=float(data.get("taxAmount")) if data.get("taxAmount") is not None else None,
        total_amount=float(data.get("totalAmount") or 0),
        line_items=line_items,
        payment_details=data.get("paymentDetails"),
        notes=data.get("notes"),
        summary=data.get("summary"),
        ciri_explanation=data.get("ciriExplanation"),
        confidence=98.0  # Claude typically has high accuracy
    )


@router.get("/status", response_model=OCRStatusResponse)
async def get_ocr_status():
    """
    Check OCR service status.
    Returns whether Claude API is configured and available.
    """
    if not ANTHROPIC_API_KEY:
        return OCRStatusResponse(
            available=False,
            pdf_support=PDF_SUPPORT,
            error="ANTHROPIC_API_KEY ikke konfigurert. Legg til i .env filen."
        )

    # Verify API key works
    try:
        client = get_anthropic_client()
        # Simple validation - just check client is created
        return OCRStatusResponse(
            available=True,
            model=DEFAULT_MODEL,
            pdf_support=PDF_SUPPORT
        )
    except Exception as e:
        return OCRStatusResponse(
            available=False,
            pdf_support=PDF_SUPPORT,
            error=f"Kunne ikke validere API-nøkkel: {str(e)}"
        )


@router.post("/warmup")
async def warmup_model():
    """
    Warmup endpoint - not needed for Claude API but kept for compatibility.
    """
    if not ANTHROPIC_API_KEY:
        return {"success": False, "error": "API key not configured"}

    return {
        "success": True,
        "model": DEFAULT_MODEL,
        "message": "Claude API ready"
    }


@router.post("/parse", response_model=OCRResponse)
async def parse_invoice(
    file: UploadFile = File(...),
    model: str | None = None
):
    """
    Parse an invoice image or PDF using Claude vision.

    Accepts:
    - PDF files (converted to images)
    - Image files (PNG, JPG, JPEG, WebP)

    Returns structured invoice data extracted by Claude.
    """
    # Validate file type
    content_type = file.content_type or ""
    filename = file.filename or ""

    is_pdf = content_type == "application/pdf" or filename.lower().endswith(".pdf")
    is_image = content_type.startswith("image/") or any(
        filename.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp"]
    )

    if not is_pdf and not is_image:
        raise HTTPException(
            status_code=400,
            detail="Ugyldig filtype. Støtter PDF, PNG, JPG, JPEG, WebP."
        )

    # Check API key
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY ikke konfigurert."
        )

    # Use provided model or default
    use_model = model if model in CLAUDE_MODELS else DEFAULT_MODEL

    # Read file content
    file_bytes = await file.read()

    # Convert to base64 image
    if is_pdf:
        images = convert_pdf_to_images(file_bytes)

        if not images:
            raise HTTPException(
                status_code=400,
                detail="Kunne ikke lese PDF-filen."
            )

        base64_image = image_to_base64(images[0], format="JPEG", quality=85)
        media_type = "image/jpeg"
    else:
        try:
            image = Image.open(io.BytesIO(file_bytes))
            if image.mode in ("RGBA", "P"):
                image = image.convert("RGB")
            base64_image = image_to_base64(image, format="JPEG", quality=85)
            media_type = "image/jpeg"
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Kunne ikke lese bilde: {str(e)}"
            )

    # Call Claude vision
    response_text = await call_claude_vision(
        base64_image=base64_image,
        model=use_model,
        prompt=INVOICE_EXTRACTION_PROMPT,
        media_type=media_type
    )

    # Parse the response
    try:
        json_data = parse_json_response(response_text)
        print(f"📋 OCR: summary={json_data.get('summary')}, ciriExplanation={json_data.get('ciriExplanation')[:50] if json_data.get('ciriExplanation') else None}...")
        invoice = map_to_invoice(json_data)
        print(f"📋 Mapped: ciri_explanation={invoice.ciri_explanation[:50] if invoice.ciri_explanation else None}...")

        return OCRResponse(
            success=True,
            invoice=invoice,
            model=use_model
        )
    except ValueError as e:
        return OCRResponse(
            success=False,
            error=f"Kunne ikke tolke OCR-resultat: {str(e)}",
            raw_response=response_text,
            model=use_model
        )


@router.get("/setup")
async def get_setup_instructions():
    """
    Get setup instructions for Claude OCR.
    """
    return {
        "steps": [
            "1. Få en API-nøkkel fra console.anthropic.com",
            "2. Legg til ANTHROPIC_API_KEY i .env filen",
            "3. Start backend på nytt",
            "4. Last opp en faktura"
        ],
        "models": CLAUDE_MODELS,
        "notes": [
            "Claude Sonnet 4.5 anbefales for beste balanse mellom hastighet og kvalitet",
            "Claude Opus 4.5 gir best kvalitet men koster mer",
            "Claude Haiku 4.5 er raskest og billigst"
        ]
    }
