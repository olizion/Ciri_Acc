/**
 * Brandfetch Integration
 *
 * Fetches company logos and brand assets using Brandfetch API.
 *
 * Setup:
 * 1. Create account at https://developers.brandfetch.com/register
 * 2. Get your Client ID (for Logo API) or API Key (for Brand API)
 * 3. Set NEXT_PUBLIC_BRANDFETCH_CLIENT_ID in .env.local
 *
 * @see https://docs.brandfetch.com
 */

// Brandfetch credentials from environment
const BRANDFETCH_CLIENT_ID = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID || "";
const BRANDFETCH_API_KEY = process.env.BRANDFETCH_API_KEY || "";

// CDN base URL for Logo API (simple logo fetching)
const LOGO_CDN_URL = "https://cdn.brandfetch.io";

// API base URL for Brand API (full brand data)
const BRAND_API_URL = "https://api.brandfetch.io/v2/brands";

/**
 * Get a logo URL for a company domain using the Logo API CDN.
 * This is the simplest way to display a company logo.
 *
 * Usage:
 * ```tsx
 * <img src={getLogoUrl("nike.com")} alt="Nike logo" />
 * ```
 *
 * @param domain - The company domain
 * @param options - Optional configuration
 * @param options.size - Image size: "icon" (48px), "small" (128px), "medium" (256px), "large" (512px)
 * @param options.format - Image format: "png" or "svg"
 */
export function getLogoUrl(
  domain: string,
  options?: { size?: "icon" | "small" | "medium" | "large"; format?: "png" | "svg" }
): string | null {
  if (!BRANDFETCH_CLIENT_ID) {
    console.warn("Brandfetch: NEXT_PUBLIC_BRANDFETCH_CLIENT_ID not set");
    return null;
  }

  // Clean the domain
  const cleanDomain = extractDomain(domain);
  if (!cleanDomain) return null;

  // Build URL with optimizations for faster loading
  // Default to icon size (48px) for fast loading in lists
  const size = options?.size || "icon";
  const sizeMap = { icon: 48, small: 128, medium: 256, large: 512 };
  const params = new URLSearchParams({
    c: BRANDFETCH_CLIENT_ID,
  });

  // Add size parameter for PNG optimization
  if (options?.format !== "svg") {
    params.append("w", sizeMap[size].toString());
    params.append("h", sizeMap[size].toString());
  }

  return `${LOGO_CDN_URL}/${cleanDomain}?${params.toString()}`;
}

/**
 * Extract domain from various formats:
 * - "example.com" -> "example.com"
 * - "https://www.example.com/page" -> "example.com"
 * - "support@example.com" -> "example.com"
 * - "Example AS" -> null (not a domain)
 */
export function extractDomain(input: string): string | null {
  if (!input) return null;

  let domain = input.trim().toLowerCase();

  // Extract from email
  if (domain.includes("@")) {
    domain = domain.split("@")[1];
  }

  // Extract from URL
  try {
    if (domain.includes("://") || domain.startsWith("www.")) {
      const url = new URL(domain.includes("://") ? domain : `https://${domain}`);
      domain = url.hostname;
    }
  } catch {
    // Not a valid URL, continue with original
  }

  // Remove www prefix
  domain = domain.replace(/^www\./, "");

  // Validate domain format (basic check)
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/;
  if (!domainRegex.test(domain)) {
    return null;
  }

  return domain;
}

/**
 * Try to find a domain from supplier information
 */
export function findDomainFromSupplier(supplier: {
  name?: string;
  email?: string;
  website?: string;
}): string | null {
  // Priority: website > email > name (try to extract domain from name)

  if (supplier.website) {
    const domain = extractDomain(supplier.website);
    if (domain) return domain;
  }

  if (supplier.email) {
    const domain = extractDomain(supplier.email);
    if (domain) return domain;
  }

  // Try common Norwegian company domains
  if (supplier.name) {
    const cleanName = supplier.name
      .toLowerCase()
      .replace(/\s+(as|asa|ans|da|enk|nuf)$/i, "") // Remove company suffixes
      .replace(/[^a-z0-9]/g, ""); // Remove special chars

    // Try common TLDs
    const possibleDomains = [
      `${cleanName}.no`,
      `${cleanName}.com`,
    ];

    // Return the first one as a guess (will fail gracefully if wrong)
    return possibleDomains[0] || null;
  }

  return null;
}

/**
 * Brand data returned from the Brand API
 */
export interface BrandData {
  name: string;
  domain: string;
  logos: BrandLogo[];
  colors: BrandColor[];
  fonts: BrandFont[];
}

export interface BrandLogo {
  type: "logo" | "icon" | "symbol";
  theme: "light" | "dark";
  formats: {
    src: string;
    format: "svg" | "png" | "jpeg";
    background: "transparent" | string;
    size?: number;
  }[];
}

export interface BrandColor {
  hex: string;
  type: "primary" | "secondary" | "accent";
}

export interface BrandFont {
  name: string;
  type: "primary" | "secondary";
}

/**
 * Fetch full brand data using the Brand API.
 * Requires BRANDFETCH_API_KEY to be set.
 *
 * Note: This should be called from an API route, not client-side,
 * to protect your API key.
 */
export async function fetchBrandData(domain: string): Promise<BrandData | null> {
  if (!BRANDFETCH_API_KEY) {
    console.warn("Brandfetch: BRANDFETCH_API_KEY not set");
    return null;
  }

  const cleanDomain = extractDomain(domain);
  if (!cleanDomain) return null;

  try {
    const response = await fetch(`${BRAND_API_URL}/${cleanDomain}`, {
      headers: {
        "Authorization": `Bearer ${BRANDFETCH_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.warn(`Brandfetch: Failed to fetch brand for ${cleanDomain}`, response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Brandfetch: Error fetching brand data", error);
    return null;
  }
}

/**
 * Get the best logo URL from brand data
 */
export function getBestLogoUrl(brand: BrandData, preferredTheme: "light" | "dark" = "light"): string | null {
  // Find logo with preferred theme
  let logo = brand.logos.find(
    (l) => l.type === "logo" && l.theme === preferredTheme
  );

  // Fallback to any logo type
  if (!logo) {
    logo = brand.logos.find((l) => l.type === "logo");
  }

  // Fallback to icon
  if (!logo) {
    logo = brand.logos.find((l) => l.type === "icon");
  }

  if (!logo || !logo.formats.length) return null;

  // Prefer SVG, then PNG
  const svgFormat = logo.formats.find((f) => f.format === "svg");
  if (svgFormat) return svgFormat.src;

  const pngFormat = logo.formats.find((f) => f.format === "png");
  if (pngFormat) return pngFormat.src;

  return logo.formats[0].src;
}

/**
 * Check if Brandfetch is configured
 */
export function isBrandfetchConfigured(): boolean {
  return Boolean(BRANDFETCH_CLIENT_ID);
}
