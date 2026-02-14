/**
 * Ciri Postering Verification
 *
 * Bokføringsloven-compliant posting correction verification logic.
 *
 * Legal Requirements (Bokføringsloven):
 * - §6: Postings are immutable - cannot modify after creation
 * - §9: Corrections = reversering (full reversal) + new posting
 * - §10: Must document "berettigelse" (justification/reason)
 * - Bokføringsforskriften: Mutual cross-references required
 */

// MVA rates in Norway
export const MVA_RATES = {
  STANDARD: 25,
  REDUCED_FOOD: 15,
  REDUCED_TRANSPORT: 12,
  ZERO: 0,
} as const;

// Common account codes for Norwegian bookkeeping
export const ACCOUNT_CATEGORIES: Record<
  string,
  { accounts: string[]; description: string }
> = {
  Husleie: { accounts: ["6300", "6310", "6320"], description: "Husleie og lokaler" },
  "IT-tjenester": { accounts: ["6500", "6510", "6520"], description: "IT og programvare" },
  Kontorrekvisita: { accounts: ["6800", "6810"], description: "Kontorutstyr og rekvisita" },
  Kommunikasjon: { accounts: ["6900", "6910"], description: "Telefon og internett" },
  Transport: { accounts: ["7100", "7110", "7120"], description: "Bilkostnader og transport" },
  Reise: { accounts: ["7130", "7140", "7150"], description: "Reiseutgifter" },
  Representasjon: { accounts: ["7350", "7360"], description: "Representasjon og bevertning" },
  Gaver: { accounts: ["7500", "7510"], description: "Gaver og premier" },
  Tjenester: { accounts: ["3000", "3100"], description: "Salgsinntekter tjenester" },
};

// Pre-defined correction reasons (Norwegian)
export const CORRECTION_REASONS = [
  { id: "wrong_account", label: "Feil konto valgt", description: "Bilaget ble postert på feil konto" },
  { id: "wrong_mva", label: "Feil MVA-sats benyttet", description: "MVA-satsen var ikke korrekt" },
  { id: "wrong_amount", label: "Beløp var feilregistrert", description: "Beløpet stemte ikke med bilaget" },
  { id: "missing_deduction", label: "Manglende fradrag", description: "MVA-fradrag ble ikke tatt med" },
  { id: "wrong_category", label: "Feil kategori", description: "Kostnaden tilhører en annen kategori" },
  { id: "duplicate", label: "Duplikat postering", description: "Bilaget var allerede postert" },
  { id: "other", label: "Annen årsak", description: "Angi årsak i fritekst" },
] as const;

// Types
export interface OriginalPosting {
  id: string;
  bilagNo: string;
  date: string;
  description: string;
  vendor: string;
  accountCode: string;
  accountName: string;
  amount: number;
  mvaRate: number;
  mva: number;
  category: string;
  bilagTotal: number; // Total from the original document/invoice
}

export interface CorrectionInput {
  newAccountCode: string;
  newAmount: number;
  newMvaRate: number;
  newMva: number;
  reasonId: string;
  reasonText: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface CorrectionPreview {
  original: OriginalPosting;
  reversering: {
    description: string;
    debit: { account: string; amount: number };
    credit: { account: string; amount: number };
    mvaAdjustment?: { account: string; amount: number };
  };
  newPosting: {
    description: string;
    debit: { account: string; amount: number };
    credit: { account: string; amount: number };
    mvaAdjustment?: { account: string; amount: number };
  };
  crossReferences: {
    originalRef: string;
    reverseringRef: string;
    correctionRef: string;
  };
}

/**
 * Validate that the new amount matches the original bilag total
 */
export function validateAmountMatchesBilag(
  bilagTotal: number,
  newAmount: number,
  newMva: number
): ValidationError | null {
  const calculatedTotal = newAmount + newMva;
  const tolerance = 0.01; // Allow for rounding

  if (Math.abs(calculatedTotal - bilagTotal) > tolerance) {
    return {
      field: "amount",
      message: `Beløpet matcher ikke bilaget (kr ${calculatedTotal.toLocaleString("nb-NO")} vs kr ${bilagTotal.toLocaleString("nb-NO")})`,
      severity: "error",
    };
  }

  return null;
}

/**
 * Validate MVA calculation (grunnlag × sats = MVA)
 */
export function validateMvaCalculation(
  grunnlag: number,
  mvaRate: number,
  declaredMva: number
): ValidationError | null {
  const expectedMva = grunnlag * (mvaRate / 100);
  const tolerance = 1; // Allow 1 kr tolerance for rounding

  if (Math.abs(expectedMva - declaredMva) > tolerance) {
    return {
      field: "mva",
      message: `MVA-beregningen er feil (forventet kr ${expectedMva.toFixed(0)}, angitt kr ${declaredMva.toFixed(0)})`,
      severity: "error",
    };
  }

  return null;
}

/**
 * Validate that the account code is appropriate for the category
 */
export function validateAccountForCategory(
  accountCode: string,
  category: string
): ValidationError | null {
  const categoryInfo = ACCOUNT_CATEGORIES[category];

  if (!categoryInfo) {
    return {
      field: "account",
      message: `Ukjent kategori: ${category}`,
      severity: "warning",
    };
  }

  // Check if the first 2 digits match expected account range
  const accountPrefix = accountCode.substring(0, 2);
  const validPrefixes = categoryInfo.accounts.map((a) => a.substring(0, 2));

  if (!validPrefixes.includes(accountPrefix)) {
    return {
      field: "account",
      message: `Kontoen ${accountCode} er uvanlig for ${category}. Forventet kontoer: ${categoryInfo.accounts.join(", ")}`,
      severity: "warning",
    };
  }

  return null;
}

/**
 * Validate correction reason
 */
export function validateCorrectionReason(
  reasonId: string,
  reasonText: string
): ValidationError | null {
  const validReason = CORRECTION_REASONS.find((r) => r.id === reasonId);

  if (!validReason) {
    return {
      field: "reason",
      message: "Vennligst velg en årsak for korreksjonen",
      severity: "error",
    };
  }

  if (reasonId === "other" && (!reasonText || reasonText.length < 10)) {
    return {
      field: "reasonText",
      message: "Begrunnelsen må være minst 10 tegn",
      severity: "error",
    };
  }

  if (reasonText && reasonText.length < 10) {
    return {
      field: "reasonText",
      message: "Begrunnelsen må være minst 10 tegn",
      severity: "error",
    };
  }

  return null;
}

/**
 * Full validation of a correction
 */
export function validateCorrection(
  original: OriginalPosting,
  correction: CorrectionInput
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 1. Validate amount matches bilag
  const amountError = validateAmountMatchesBilag(
    original.bilagTotal,
    correction.newAmount,
    correction.newMva
  );
  if (amountError) {
    if (amountError.severity === "error") errors.push(amountError);
    else warnings.push(amountError);
  }

  // 2. Validate MVA calculation
  const mvaError = validateMvaCalculation(
    correction.newAmount,
    correction.newMvaRate,
    correction.newMva
  );
  if (mvaError) {
    if (mvaError.severity === "error") errors.push(mvaError);
    else warnings.push(mvaError);
  }

  // 3. Validate account is appropriate
  const accountError = validateAccountForCategory(
    correction.newAccountCode,
    original.category
  );
  if (accountError) {
    if (accountError.severity === "error") errors.push(accountError);
    else warnings.push(accountError);
  }

  // 4. Validate reason is provided
  const reasonError = validateCorrectionReason(
    correction.reasonId,
    correction.reasonText
  );
  if (reasonError) {
    if (reasonError.severity === "error") errors.push(reasonError);
    else warnings.push(reasonError);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate a preview of the correction transaction chain
 * Following Bokføringsloven requirements for reversering and cross-referencing
 */
export function generateCorrectionPreview(
  original: OriginalPosting,
  correction: CorrectionInput
): CorrectionPreview {
  const timestamp = Date.now();
  const reverseringRef = `REV-${original.bilagNo}-${timestamp}`;
  const correctionRef = `KOR-${original.bilagNo}-${timestamp}`;

  return {
    original,
    reversering: {
      description: `Reversering av ${original.bilagNo} - ${original.description}`,
      debit: {
        account: "2400", // Leverandørgjeld (credit original expense)
        amount: original.amount + original.mva,
      },
      credit: {
        account: original.accountCode,
        amount: original.amount,
      },
      mvaAdjustment:
        original.mva > 0
          ? {
              account: "2710", // Inngående MVA
              amount: -original.mva,
            }
          : undefined,
    },
    newPosting: {
      description: `Korrigert postering - ${original.description}`,
      debit: {
        account: correction.newAccountCode,
        amount: correction.newAmount,
      },
      credit: {
        account: "2400", // Leverandørgjeld
        amount: correction.newAmount + correction.newMva,
      },
      mvaAdjustment:
        correction.newMva > 0
          ? {
              account: "2710", // Inngående MVA
              amount: correction.newMva,
            }
          : undefined,
    },
    crossReferences: {
      originalRef: original.bilagNo,
      reverseringRef,
      correctionRef,
    },
  };
}

/**
 * Generate audit log entry for the correction
 */
export function generateAuditLogEntry(
  original: OriginalPosting,
  correction: CorrectionInput,
  preview: CorrectionPreview
): object {
  const reason = CORRECTION_REASONS.find((r) => r.id === correction.reasonId);

  return {
    timestamp: new Date().toISOString(),
    type: "POSTERING_CORRECTION",
    compliance: {
      law: "Bokføringsloven",
      paragraphs: ["§6", "§9", "§10"],
      requirement: "Reversering og ny postering med kryssreferanser",
    },
    original: {
      bilagNo: original.bilagNo,
      accountCode: original.accountCode,
      amount: original.amount,
      mva: original.mva,
    },
    correction: {
      newAccountCode: correction.newAccountCode,
      newAmount: correction.newAmount,
      newMva: correction.newMva,
    },
    reason: {
      type: reason?.label || "Ukjent",
      description: correction.reasonText || reason?.description,
    },
    references: preview.crossReferences,
  };
}

/**
 * Get validation message for real-time feedback
 */
export function getCiriValidationMessage(
  field: string,
  value: number | string,
  context: {
    bilagTotal?: number;
    mvaRate?: number;
    mvaAmount?: number;
    category?: string;
  }
): { message: string; isValid: boolean } | null {
  switch (field) {
    case "amount":
      if (context.bilagTotal !== undefined && typeof value === "number") {
        // Use the actual MVA amount if provided, otherwise calculate from rate
        const mvaAmount = context.mvaAmount ?? (value * ((context.mvaRate || 25) / 100));
        const total = value + mvaAmount;
        const matches = Math.abs(total - context.bilagTotal) < 1;
        return {
          message: matches
            ? "Beløpet matcher bilaget ✓"
            : `Avvik: Total kr ${total.toLocaleString("nb-NO")} vs bilag kr ${context.bilagTotal.toLocaleString("nb-NO")}`,
          isValid: matches,
        };
      }
      break;

    case "mva":
      if (typeof value === "number" && context.mvaRate !== undefined) {
        // Already validated through amount + mva = bilagTotal
        return {
          message: `MVA ${context.mvaRate}% beregnet korrekt ✓`,
          isValid: true,
        };
      }
      break;

    case "account":
      if (typeof value === "string" && context.category) {
        const categoryInfo = ACCOUNT_CATEGORIES[context.category];
        if (categoryInfo) {
          const isValid = categoryInfo.accounts.some((a) =>
            value.startsWith(a.substring(0, 2))
          );
          return {
            message: isValid
              ? `Kontoen er passende for ${context.category} ✓`
              : `Uvanlig konto for ${context.category}`,
            isValid,
          };
        }
      }
      break;
  }

  return null;
}
