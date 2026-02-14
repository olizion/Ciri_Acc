/**
 * OCR API Route - Server-side Ollama processing
 *
 * Handles invoice OCR using Qwen2.5-VL via Ollama.
 * This runs server-side to avoid browser compatibility issues with the ollama package.
 */

import { NextRequest, NextResponse } from "next/server";
import { Ollama } from "ollama";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "qwen2.5vl:7b";

// Initialize Ollama client
const ollama = new Ollama({ host: OLLAMA_HOST });

// Invoice extraction prompt
const INVOICE_EXTRACTION_PROMPT = `You are an expert invoice OCR system. Analyze this invoice image and extract ALL information into a structured JSON format.

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
  "notes": "any additional notes or terms"
}

IMPORTANT:
- Extract the EXACT company name as written on the invoice
- Identify the currency from symbols ($, €, kr, £) or text
- All amounts should be numbers without currency symbols
- Dates must be in YYYY-MM-DD format
- If unsure about a field, use null rather than guessing

Return ONLY the JSON object, no other text.`;

/**
 * GET /api/ocr - Check Ollama status
 */
export async function GET() {
  try {
    const models = await ollama.list();
    const visionModel = models.models.find(
      (m) => m.name.includes("qwen2.5vl") || m.name.includes("qwen2-vl") || m.name.includes("olmocr") || m.name.includes("llava")
    );

    if (visionModel) {
      return NextResponse.json({
        available: true,
        model: visionModel.name,
      });
    }

    return NextResponse.json({
      available: false,
      error: "No vision model found. Run: ollama pull qwen2.5vl:7b",
    });
  } catch (error) {
    return NextResponse.json({
      available: false,
      error: "Ollama not running. Start with: ollama serve",
    });
  }
}

// Validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/tiff",
  "image/bmp",
  "application/pdf",
]);

/**
 * POST /api/ocr - Process invoice image
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request content length before parsing
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Filen er for stor. Maks størrelse er ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const model = (formData.get("model") as string) || DEFAULT_MODEL;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Filen er for stor (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maks størrelse er ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 413 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: `Ugyldig filtype: ${file.type || "ukjent"}. Tillatte typer: bilder (JPEG, PNG, GIF, WebP, TIFF, BMP) og PDF.` },
        { status: 415 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    // Check which model is available
    let availableModel = model;
    try {
      const models = await ollama.list();
      const visionModel = models.models.find(
        (m) => m.name.includes("qwen2.5vl") || m.name.includes("qwen2-vl") || m.name.includes("olmocr") || m.name.includes("llava")
      );
      if (visionModel) {
        availableModel = visionModel.name;
      }
    } catch {
      // Use default model
    }

    // Send to Ollama for processing
    const response = await ollama.chat({
      model: availableModel,
      messages: [
        {
          role: "user",
          content: INVOICE_EXTRACTION_PROMPT,
          images: [base64Image],
        },
      ],
      options: {
        temperature: 0.1, // Low temperature for accurate extraction
      },
    });

    const responseText = response.message.content;

    // Parse the JSON response
    let jsonData: Record<string, unknown>;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      jsonData = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({
        success: false,
        error: "Could not parse OCR result as structured data",
        rawResponse: responseText,
      });
    }

    // Map to invoice format
    const invoice = {
      invoiceNumber: jsonData.invoiceNumber,
      invoiceDate: jsonData.invoiceDate,
      dueDate: jsonData.dueDate,
      supplier: {
        name: (jsonData.supplier as Record<string, unknown>)?.name || "",
        address: (jsonData.supplier as Record<string, unknown>)?.address,
        companyNumber: (jsonData.supplier as Record<string, unknown>)?.companyNumber,
        vatNumber: (jsonData.supplier as Record<string, unknown>)?.vatNumber,
        email: (jsonData.supplier as Record<string, unknown>)?.email,
        website: (jsonData.supplier as Record<string, unknown>)?.website,
      },
      currency: jsonData.currency || "NOK",
      totalAmount: Number(jsonData.totalAmount) || 0,
      totalNet: Number(jsonData.subtotal) || Number(jsonData.totalAmount) || 0,
      totalTax: Number(jsonData.taxAmount) || 0,
      taxRate: Number(jsonData.taxRate),
      lineItems: Array.isArray(jsonData.lineItems)
        ? (jsonData.lineItems as Record<string, unknown>[]).map((item) => ({
            description: item.description || "",
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            totalAmount: Number(item.totalAmount) || 0,
            taxRate: item.taxRate != null ? Number(item.taxRate) : undefined,
          }))
        : [],
      confidence: 95,
    };

    return NextResponse.json({
      success: true,
      invoice,
      model: availableModel,
    });
  } catch (error) {
    console.error("OCR API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown OCR error",
      },
      { status: 500 }
    );
  }
}
