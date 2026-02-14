/**
 * Currency Conversion Utility
 *
 * Handles conversion of foreign currencies to NOK for Norwegian bookkeeping.
 * Uses Fixer.io API for accurate historical exchange rates.
 *
 * For Norwegian accounting compliance, we use the exchange rate from the
 * invoice date (bilagsdato) as required by Bokføringsloven.
 *
 * @see https://fixer.io/documentation
 */

// Fixer.io API configuration
const FIXER_API_KEY = process.env.NEXT_PUBLIC_FIXER_API_KEY || "";
const FIXER_BASE_URL = "http://data.fixer.io/api";

// Currency symbols and names
export const CURRENCIES: Record<string, { symbol: string; name: string; nameNo: string }> = {
  NOK: { symbol: "kr", name: "Norwegian Krone", nameNo: "Norske kroner" },
  EUR: { symbol: "€", name: "Euro", nameNo: "Euro" },
  USD: { symbol: "$", name: "US Dollar", nameNo: "Amerikanske dollar" },
  GBP: { symbol: "£", name: "British Pound", nameNo: "Britiske pund" },
  SEK: { symbol: "kr", name: "Swedish Krona", nameNo: "Svenske kroner" },
  DKK: { symbol: "kr", name: "Danish Krone", nameNo: "Danske kroner" },
  CHF: { symbol: "Fr", name: "Swiss Franc", nameNo: "Sveitsiske franc" },
  PLN: { symbol: "zł", name: "Polish Zloty", nameNo: "Polske zloty" },
  CZK: { symbol: "Kč", name: "Czech Koruna", nameNo: "Tsjekkiske koruna" },
  HUF: { symbol: "Ft", name: "Hungarian Forint", nameNo: "Ungarske forint" },
  CAD: { symbol: "$", name: "Canadian Dollar", nameNo: "Kanadiske dollar" },
  AUD: { symbol: "$", name: "Australian Dollar", nameNo: "Australske dollar" },
  JPY: { symbol: "¥", name: "Japanese Yen", nameNo: "Japanske yen" },
  CNY: { symbol: "¥", name: "Chinese Yuan", nameNo: "Kinesiske yuan" },
  INR: { symbol: "₹", name: "Indian Rupee", nameNo: "Indiske rupier" },
};

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  date: string;
  source: string;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  exchangeRate: number;
  rateDate: string;
  rateSource: string;
}

// Cache for exchange rates by date (for historical lookups)
const rateCacheByDate: Map<string, {
  rates: Record<string, number>;
  timestamp: number;
}> = new Map();

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for historical rates

/**
 * Fallback rates (updated January 2025)
 * Only used if Fixer.io API is unavailable
 */
const FALLBACK_RATES_TO_NOK: Record<string, number> = {
  EUR: 11.75,
  USD: 11.25,
  GBP: 14.15,
  SEK: 1.01,
  DKK: 1.58,
  CHF: 12.65,
  PLN: 2.72,
  CZK: 0.46,
  CAD: 7.85,
  AUD: 7.05,
  JPY: 0.072,
  CNY: 1.54,
  INR: 0.133,
  NOK: 1.00,
};

interface FixerResponse {
  success: boolean;
  timestamp: number;
  base: string;
  date: string;
  rates: Record<string, number>;
  error?: {
    code: number;
    type: string;
    info: string;
  };
}

/**
 * Fetch exchange rates from Fixer.io for a specific date
 *
 * @param date - Date in YYYY-MM-DD format (for historical rates)
 */
async function fetchFixerRates(date?: string): Promise<{ rates: Record<string, number>; date: string; source: string }> {
  // Check if API key is configured
  if (!FIXER_API_KEY) {
    console.warn("Fixer.io: NEXT_PUBLIC_FIXER_API_KEY not configured, using fallback rates");
    return {
      rates: FALLBACK_RATES_TO_NOK,
      date: date || new Date().toISOString().split("T")[0],
      source: "Fallback rates (Fixer.io not configured)"
    };
  }

  // Use cached rates if available
  const cacheKey = date || "latest";
  const cached = rateCacheByDate.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      rates: cached.rates,
      date: cacheKey === "latest" ? new Date().toISOString().split("T")[0] : date!,
      source: "Fixer.io (cached)"
    };
  }

  try {
    // Fixer.io free plan only supports EUR as base, so we fetch EUR-based rates
    // and convert to NOK-based rates
    const endpoint = date ? `${FIXER_BASE_URL}/${date}` : `${FIXER_BASE_URL}/latest`;
    const url = `${endpoint}?access_key=${FIXER_API_KEY}&symbols=NOK,USD,GBP,SEK,DKK,CHF,PLN,CZK,CAD,AUD,JPY,CNY,INR,HUF`;

    const response = await fetch(url);
    const data: FixerResponse = await response.json();

    if (!data.success || !data.rates) {
      console.error("Fixer.io API error:", data.error);
      return {
        rates: FALLBACK_RATES_TO_NOK,
        date: date || new Date().toISOString().split("T")[0],
        source: "Fallback rates (API error)"
      };
    }

    // Convert EUR-based rates to NOK-based rates
    // If EUR/NOK = 11.75, then USD/NOK = (EUR/NOK) / (EUR/USD)
    const eurToNok = data.rates.NOK || 11.75;
    const nokBasedRates: Record<string, number> = { NOK: 1, EUR: eurToNok };

    for (const [currency, eurRate] of Object.entries(data.rates)) {
      if (currency !== "NOK") {
        // Convert: 1 CURRENCY = X EUR, 1 EUR = Y NOK
        // So: 1 CURRENCY = X * Y / X = eurToNok / eurRate NOK
        nokBasedRates[currency] = eurToNok / eurRate;
      }
    }

    // Cache the rates
    rateCacheByDate.set(cacheKey, {
      rates: nokBasedRates,
      timestamp: Date.now()
    });

    return {
      rates: nokBasedRates,
      date: data.date,
      source: "Fixer.io"
    };

  } catch (error) {
    console.error("Fixer.io fetch error:", error);
    return {
      rates: FALLBACK_RATES_TO_NOK,
      date: date || new Date().toISOString().split("T")[0],
      source: "Fallback rates (network error)"
    };
  }
}

/**
 * Get exchange rates for a specific date
 * For Norwegian accounting, use the invoice date for compliance
 *
 * @param date - Optional date in YYYY-MM-DD format for historical rates
 */
export async function getExchangeRates(date?: string): Promise<Record<string, number>> {
  const result = await fetchFixerRates(date);
  return result.rates;
}

/**
 * Convert an amount from one currency to NOK
 *
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param invoiceDate - Optional invoice date for historical rate (YYYY-MM-DD)
 */
export async function convertToNOK(
  amount: number,
  fromCurrency: string,
  invoiceDate?: string
): Promise<ConversionResult> {
  if (fromCurrency === "NOK") {
    return {
      originalAmount: amount,
      originalCurrency: "NOK",
      convertedAmount: amount,
      targetCurrency: "NOK",
      exchangeRate: 1,
      rateDate: invoiceDate || new Date().toISOString().split("T")[0],
      rateSource: "No conversion needed"
    };
  }

  // Use invoice date for historical rate (required for Norwegian accounting)
  const { rates, date, source } = await fetchFixerRates(invoiceDate);
  const rate = rates[fromCurrency];

  if (!rate) {
    console.warn(`Unknown currency: ${fromCurrency}, using 1:1 rate`);
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: amount,
      targetCurrency: "NOK",
      exchangeRate: 1,
      rateDate: date,
      rateSource: "Unknown currency - manual verification required"
    };
  }

  const convertedAmount = Math.round(amount * rate * 100) / 100;

  return {
    originalAmount: amount,
    originalCurrency: fromCurrency,
    convertedAmount,
    targetCurrency: "NOK",
    exchangeRate: Math.round(rate * 10000) / 10000,
    rateDate: date,
    rateSource: source
  };
}

/**
 * Format currency amount for display
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = "nb-NO"
): string {
  const currencyInfo = CURRENCIES[currency];

  if (currency === "NOK") {
    return `kr ${amount.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  // For foreign currencies, show symbol and amount
  const symbol = currencyInfo?.symbol || currency;
  return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get currency display info
 */
export function getCurrencyInfo(currency: string): {
  code: string;
  symbol: string;
  name: string;
  nameNo: string;
} {
  const info = CURRENCIES[currency];
  return {
    code: currency,
    symbol: info?.symbol || currency,
    name: info?.name || currency,
    nameNo: info?.nameNo || currency
  };
}

/**
 * Check if currency requires conversion for Norwegian bookkeeping
 */
export function requiresConversion(currency: string): boolean {
  return currency !== "NOK";
}

/**
 * Format exchange rate for display
 */
export function formatExchangeRate(
  fromCurrency: string,
  rate: number
): string {
  return `1 ${fromCurrency} = ${rate.toFixed(4)} NOK`;
}
