/**
 * Invoice OCR Integration
 *
 * Primary: Ollama with Qwen2.5-VL (local, free, private)
 * Fallback: Simulated responses for demo
 *
 * Qwen2.5-VL capabilities:
 * - Best-in-class OCR accuracy (rivals GPT-4o)
 * - Multilingual support (50+ languages)
 * - Structured data extraction
 * - Runs entirely locally - no data leaves your machine
 *
 * Setup:
 * 1. Install Ollama: curl -fsSL https://ollama.com/install.sh | sh
 * 2. Pull model: ollama pull qwen2.5vl:7b
 * 3. Start server: ollama serve
 *
 * @see https://ollama.com/library/qwen2.5vl
 */

import { parseInvoiceWithOllama, checkOllamaStatus } from "./ollama-ocr";

// Types for parsed invoice data
export interface ParsedInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  taxRate?: number;
  taxAmount?: number;
}

export interface ParsedSupplier {
  name: string;
  address?: string;
  companyNumber?: string; // Org.nr in Norway
  vatNumber?: string;
  phoneNumber?: string;
  email?: string;
  website?: string;
}

export interface ParsedInvoice {
  // Document info
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;

  // Supplier/vendor
  supplier: ParsedSupplier;

  // Financial
  currency: string;
  totalAmount: number;
  totalNet: number; // Amount excluding tax
  totalTax: number;
  taxRate?: number;

  // Line items
  lineItems: ParsedInvoiceLineItem[];

  // AI-generated summary
  summary?: string;

  // Ciri's friendly explanation for layman
  ciriExplanation?: string;

  // Confidence
  confidence: number;

  // Raw response for debugging
  rawResponse?: unknown;
}

export interface OCRResult {
  success: boolean;
  invoice?: ParsedInvoice;
  error?: string;
  warnings?: string[];
}

/**
 * Parse an invoice using Ollama OCR backend
 *
 * Requires:
 * 1. Python backend running (cd backend && uvicorn main:app --reload)
 * 2. Ollama running with Qwen2.5-VL model (ollama serve)
 *
 * No fallback to fake data - returns clear errors if OCR isn't available.
 */
export async function parseInvoice(
  file: File,
  options?: {
    apiKey?: string;
    forceSimulation?: boolean;
    onProgress?: (message: string) => void;
  }
): Promise<OCRResult> {
  const onProgress = options?.onProgress || (() => {});

  try {
    onProgress("Sjekker backend-tilkobling...");
    const ollamaStatus = await checkOllamaStatus();

    if (!ollamaStatus.available) {
      // Return clear error - don't fall back to fake data
      return {
        success: false,
        error: ollamaStatus.error || "OCR-tjenesten er ikke tilgjengelig. Start backend og Ollama.",
        warnings: [
          "Start Python backend: cd backend && uvicorn main:app --reload",
          "Start Ollama: ollama serve",
          "Last ned modell: ollama pull qwen2.5vl:7b"
        ]
      };
    }

    onProgress(`Bruker ${ollamaStatus.model} for OCR...`);
    const ollamaResult = await parseInvoiceWithOllama(file, {
      model: ollamaStatus.model,
      onProgress,
    });

    if (ollamaResult.success && ollamaResult.invoice) {
      return {
        success: true,
        invoice: ollamaResult.invoice,
      };
    }

    // OCR failed - return the actual error
    return {
      success: false,
      error: ollamaResult.error || "OCR-behandling mislyktes",
      warnings: ollamaResult.rawResponse ? ["Rådata: " + ollamaResult.rawResponse] : undefined
    };

  } catch (error) {
    console.error("OCR error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ukjent feil ved OCR-behandling"
    };
  }
}


/**
 * Determine if an invoice needs MVA handling
 *
 * Norwegian rules:
 * - Domestic invoices (NOK): Full MVA handling
 * - EU B2B: Reverse charge (no input MVA, you report output MVA)
 * - Non-EU B2B: No MVA applies
 * - B2C imports: Different rules apply
 */
export function determineVATTreatment(invoice: ParsedInvoice): {
  hasVAT: boolean;
  vatCode: string;
  vatCodeDescription: string;
  explanation: string;
} {
  const { currency, supplier, totalTax } = invoice;

  // Norwegian domestic invoice
  if (currency === "NOK" && totalTax > 0) {
    return {
      hasVAT: true,
      vatCode: "1",
      vatCodeDescription: "Inngående MVA, høy sats",
      explanation: "Norsk faktura med 25% MVA. Fradragsberettiget."
    };
  }

  // EU invoice (common currencies/countries)
  const euCountryIndicators = ["IE", "DE", "FR", "NL", "SE", "DK", "FI", "ES", "IT", "LU"];
  const isEU = euCountryIndicators.some(code =>
    supplier.companyNumber?.includes(code) ||
    supplier.vatNumber?.includes(code) ||
    supplier.address?.includes(code)
  );

  if (isEU && currency !== "NOK") {
    return {
      hasVAT: false,
      vatCode: "86", // Snudd avregning
      vatCodeDescription: "Kjøp fra utlandet med snudd avregning",
      explanation: "EU-faktura. Snudd avregning (reverse charge) gjelder. Du må beregne og rapportere norsk MVA selv."
    };
  }

  // Non-EU foreign invoice
  if (currency !== "NOK") {
    return {
      hasVAT: false,
      vatCode: "0",
      vatCodeDescription: "Ingen MVA-behandling",
      explanation: `Utenlandsk faktura (${currency}). Ingen inngående MVA. Beløpet må konverteres til NOK for bokføring.`
    };
  }

  // NOK without VAT (exempt services)
  return {
    hasVAT: false,
    vatCode: "6",
    vatCodeDescription: "MVA-fritatt",
    explanation: "Norsk faktura uten MVA. Tjenesten er MVA-fritatt."
  };
}
