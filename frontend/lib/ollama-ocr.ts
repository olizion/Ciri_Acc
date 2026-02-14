/**
 * OCR Client - Browser-compatible
 *
 * Calls the Python FastAPI backend for invoice OCR processing.
 * Uses Claude API with vision capabilities for high-accuracy extraction.
 *
 * Setup:
 * 1. Get API key from console.anthropic.com
 * 2. Add ANTHROPIC_API_KEY to backend .env file
 * 3. Start backend: cd backend && uvicorn main:app --reload
 */

import type { ParsedInvoice, ParsedSupplier, ParsedInvoiceLineItem } from "./invoice-ocr";

import { API_BASE_URL } from "@/lib/api";

/**
 * Check if OCR service is available
 */
export async function checkOllamaStatus(): Promise<{
  available: boolean;
  model?: string;
  pdfSupport?: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ocr/status`, {
      method: "GET",
    });

    if (!response.ok) {
      return {
        available: false,
        error: "Kunne ikke koble til OCR API",
      };
    }

    const data = await response.json();
    return {
      available: data.available,
      model: data.model,
      pdfSupport: data.pdf_support,
      error: data.error,
    };
  } catch (error) {
    return {
      available: false,
      error: "Backend kjører ikke. Start med: cd backend && uvicorn main:app --reload",
    };
  }
}

/**
 * Parse an invoice image using Claude vision API
 */
export async function parseInvoiceWithOllama(
  file: File,
  options?: {
    model?: string;
    onProgress?: (message: string) => void;
  }
): Promise<{
  success: boolean;
  invoice?: ParsedInvoice;
  rawResponse?: string;
  error?: string;
}> {
  const onProgress = options?.onProgress || (() => {});

  // Set up abort controller with 60-second timeout (Claude is fast)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    onProgress("Sender til Claude...");

    const formData = new FormData();
    formData.append("file", file);
    if (options?.model) {
      formData.append("model", options.model);
    }

    onProgress("Analyserer faktura...");

    const response = await fetch(`${API_BASE_URL}/api/ocr/parse`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "OCR-forespørsel feilet");
    }

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.error || "OCR-behandling feilet",
        rawResponse: data.raw_response,
      };
    }

    onProgress("Behandler resultat...");

    const invoiceData = data.invoice;

    const supplier: ParsedSupplier = {
      name: invoiceData.supplier?.name || "Ukjent leverandør",
      address: invoiceData.supplier?.address,
      companyNumber: invoiceData.supplier?.company_number,
      vatNumber: invoiceData.supplier?.vat_number,
      email: invoiceData.supplier?.email,
      website: invoiceData.supplier?.website,
    };

    const invoice: ParsedInvoice = {
      invoiceNumber: invoiceData.invoice_number,
      invoiceDate: invoiceData.invoice_date,
      dueDate: invoiceData.due_date,
      supplier,
      currency: invoiceData.currency || "NOK",
      totalAmount: invoiceData.total_amount,
      totalNet: invoiceData.subtotal || invoiceData.total_amount,
      totalTax: invoiceData.tax_amount || 0,
      taxRate: invoiceData.tax_rate,
      lineItems: (invoiceData.line_items || []).map((item: {
        description: string;
        quantity: number;
        unit_price: number;
        total_amount: number;
        tax_rate?: number;
      }) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalAmount: item.total_amount,
        taxRate: item.tax_rate,
      } as ParsedInvoiceLineItem)),
      summary: invoiceData.summary,
      ciriExplanation: invoiceData.ciri_explanation,
      confidence: invoiceData.confidence || 98,
    };

    return {
      success: true,
      invoice,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("OCR error:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: "OCR-behandling tok for lang tid. Prøv igjen.",
      };
    }

    if (error instanceof TypeError && error.message.includes("NetworkError")) {
      return {
        success: false,
        error: "Nettverksfeil: Kunne ikke nå backend.",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Ukjent OCR-feil",
    };
  }
}

/**
 * Get setup instructions
 */
export function getOllamaSetupInstructions(): {
  steps: string[];
  commands: string[];
} {
  return {
    steps: [
      "1. Få API-nøkkel fra console.anthropic.com",
      "2. Legg til ANTHROPIC_API_KEY i .env",
      "3. Start backend på nytt",
      "4. Last opp en faktura",
    ],
    commands: [
      "echo 'ANTHROPIC_API_KEY=your-key' >> .env",
      "docker compose restart backend",
    ],
  };
}

/**
 * Fetch setup instructions from the backend
 */
export async function fetchSetupInstructions(): Promise<{
  steps: string[];
  commands?: string[];
  notes?: string[];
  models?: Record<string, string>;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ocr/setup`);
    if (!response.ok) {
      return getOllamaSetupInstructions();
    }
    return await response.json();
  } catch {
    return getOllamaSetupInstructions();
  }
}

/**
 * Warmup endpoint - kept for compatibility, not needed for Claude
 */
export async function warmupOCRModel(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ocr/warmup`, {
      method: "POST",
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
}
