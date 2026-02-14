"use client";

import type { MVAPDFData } from "@/components/mva/mva-pdf-document";

/**
 * Generate and download MVA PDF document
 * Uses @react-pdf/renderer for client-side PDF generation
 */
export async function generateMVAPDF(data: MVAPDFData): Promise<void> {
  // Dynamically import react-pdf to ensure client-side only
  const [{ pdf }, { MVAPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/mva/mva-pdf-document"),
  ]);

  // Create the PDF document
  const doc = <MVAPDFDocument data={data} />;

  // Generate the PDF blob
  const blob = await pdf(doc).toBlob();

  // Create a download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  // Generate filename with termin info
  const terminNumber = data.termin.replace(/[^0-9]/g, "");
  const year = new Date().getFullYear();
  const filename = `mva-melding-${terminNumber}-termin-${year}.pdf`;

  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate PDF blob without downloading (for preview or other uses)
 */
export async function generateMVAPDFBlob(data: MVAPDFData): Promise<Blob> {
  const [{ pdf }, { MVAPDFDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/mva/mva-pdf-document"),
  ]);

  const doc = <MVAPDFDocument data={data} />;
  return await pdf(doc).toBlob();
}

/**
 * Generate PDF as base64 string
 */
export async function generateMVAPDFBase64(data: MVAPDFData): Promise<string> {
  const blob = await generateMVAPDFBlob(data);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(",")[1]); // Remove data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
