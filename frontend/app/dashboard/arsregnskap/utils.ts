import type {
  AccountGroup,
  AccountLine,
  ApiResultatResponse,
  ApiBalanseResponse,
} from "./types";

// ── Helpers ─────────────────────────────────────────────────

function sumLine(name: string, total: number): AccountGroup {
  return {
    name,
    accounts: [{ konto: "", navn: "", thisYear: total, lastYear: 0 }],
    isSum: true,
  };
}

function toAccountLine(
  code: string,
  name: string,
  amount: number,
  bilagCount?: number,
): AccountLine {
  return { konto: code, navn: name, thisYear: amount, lastYear: 0, bilagCount };
}

// ── Resultat transform ──────────────────────────────────────

export function transformResultatToGroups(api: ApiResultatResponse): AccountGroup[] {
  const income: AccountLine[] = [];
  const expenses: AccountLine[] = [];
  const finance: AccountLine[] = [];

  for (const a of api.accounts) {
    const code = parseInt(a.account_code, 10);

    if (code >= 3000 && code < 4000) {
      // Income: backend returns positive, display positive
      income.push(toAccountLine(a.account_code, a.account_name, a.total_gross, a.bilag_count));
    } else if (code >= 4000 && code < 8000) {
      // Expenses: backend returns positive, display negative
      expenses.push(toAccountLine(a.account_code, a.account_name, -a.total_gross, a.bilag_count));
    } else if (code >= 8000 && code < 8100) {
      // Finance income: positive
      finance.push(toAccountLine(a.account_code, a.account_name, a.total_gross, a.bilag_count));
    } else if (code >= 8100 && code < 9000) {
      // Finance costs: negate
      finance.push(toAccountLine(a.account_code, a.account_name, -a.total_gross, a.bilag_count));
    }
  }

  const sumIncome = income.reduce((s, l) => s + l.thisYear, 0);
  const sumExpenses = expenses.reduce((s, l) => s + l.thisYear, 0);
  const driftsresultat = sumIncome + sumExpenses; // expenses are already negative
  const sumFinance = finance.reduce((s, l) => s + l.thisYear, 0);
  const resultatForSkatt = driftsresultat + sumFinance;
  const skatt = resultatForSkatt > 0 ? -Math.round(resultatForSkatt * 0.22) : 0;
  const arsresultat = resultatForSkatt + skatt;

  const groups: AccountGroup[] = [];

  if (income.length > 0) {
    groups.push({ name: "Driftsinntekter", accounts: income });
    groups.push(sumLine("Sum driftsinntekter", sumIncome));
  }

  if (expenses.length > 0) {
    groups.push({ name: "Driftskostnader", accounts: expenses });
    groups.push(sumLine("Sum driftskostnader", sumExpenses));
  }

  groups.push(sumLine("Driftsresultat", driftsresultat));

  if (finance.length > 0) {
    groups.push({ name: "Finansposter", accounts: finance });
  }

  groups.push(sumLine("Ordinært resultat før skatt", resultatForSkatt));

  if (skatt !== 0) {
    groups.push({
      name: "Skattekostnad",
      accounts: [toAccountLine("8300", "Skattekostnad", skatt)],
    });
  }

  groups.push(sumLine("Årsresultat", arsresultat));

  return groups;
}

// ── Balanse transform ───────────────────────────────────────

interface BalanseGroups {
  aktiva: AccountGroup[];
  passiva: AccountGroup[];
}

// Standard kontoplan accounts for each balance category
const ANLEGGSMIDLER = [
  { konto: "1000", navn: "Forskning og utvikling" },
  { konto: "1050", navn: "Konsesjoner, patenter" },
  { konto: "1100", navn: "Bygninger" },
  { konto: "1200", navn: "Maskiner og anlegg" },
  { konto: "1250", navn: "Inventar og utstyr" },
  { konto: "1280", navn: "Kontormaskiner" },
  { konto: "1350", navn: "Investeringer i aksjer" },
];

const OMLOPSMIDLER = [
  { konto: "1400", navn: "Varelager" },
  { konto: "1500", navn: "Kundefordringer" },
  { konto: "1580", navn: "Avsetning tap på kundefordringer" },
  { konto: "1700", navn: "Andre fordringer" },
  { konto: "1900", navn: "Kontanter" },
  { konto: "1920", navn: "Bankinnskudd" },
  { konto: "1950", navn: "Bankinnskudd for skattetrekk" },
];

const EGENKAPITAL = [
  { konto: "2000", navn: "Aksjekapital" },
  { konto: "2050", navn: "Annen egenkapital" },
  { konto: "2060", navn: "Privatkonto" },
  { konto: "2080", navn: "Udekket tap / årets resultat" },
];

const GJELD = [
  { konto: "2240", navn: "Pantelån" },
  { konto: "2250", navn: "Gjeld til kredittinstitusjoner" },
  { konto: "2400", navn: "Leverandørgjeld" },
  { konto: "2600", navn: "Forskuddstrekk" },
  { konto: "2700", navn: "Skyldig MVA" },
  { konto: "2770", navn: "Arbeidsgiveravgift skyldig" },
  { konto: "2930", navn: "Skyldig lønn" },
  { konto: "2940", navn: "Skyldige feriepenger" },
];

function buildGroup(
  name: string,
  template: { konto: string; navn: string }[],
  balanceMap: Record<string, { balance: number; name?: string }>,
): { group: AccountGroup; total: number } {
  const accounts: AccountLine[] = [];

  // First add template accounts that have balances
  const usedCodes = new Set<string>();
  for (const t of template) {
    const entry = balanceMap[t.konto];
    if (entry && entry.balance !== 0) {
      accounts.push(toAccountLine(t.konto, t.navn, entry.balance));
      usedCodes.add(t.konto);
    }
  }

  // Then add any accounts from API not in template (in the same range)
  const range = getRangeForGroup(name);
  if (range) {
    for (const [code, entry] of Object.entries(balanceMap)) {
      const num = parseInt(code, 10);
      if (num >= range[0] && num < range[1] && !usedCodes.has(code) && entry.balance !== 0) {
        accounts.push(toAccountLine(code, entry.name || `Konto ${code}`, entry.balance));
      }
    }
  }

  const total = accounts.reduce((s, l) => s + l.thisYear, 0);
  return { group: { name, accounts }, total };
}

function getRangeForGroup(name: string): [number, number] | null {
  if (name === "Anleggsmidler") return [1000, 1400];
  if (name === "Omløpsmidler") return [1400, 2000];
  if (name === "Egenkapital") return [2000, 2100];
  if (name === "Gjeld") return [2100, 3000];
  return null;
}

export function transformBalanseToGroups(api: ApiBalanseResponse): BalanseGroups {
  const balanceMap: Record<string, { balance: number; name?: string }> = {};
  for (const ab of api.account_balances) {
    balanceMap[ab.account_code] = { balance: ab.balance, name: ab.account_name };
  }

  const anlegg = buildGroup("Anleggsmidler", ANLEGGSMIDLER, balanceMap);
  const omlop = buildGroup("Omløpsmidler", OMLOPSMIDLER, balanceMap);
  const sumEiendeler = anlegg.total + omlop.total;

  const ek = buildGroup("Egenkapital", EGENKAPITAL, balanceMap);
  const gjeld = buildGroup("Gjeld", GJELD, balanceMap);
  const sumEKGjeld = ek.total + gjeld.total;

  const aktiva: AccountGroup[] = [
    anlegg.group,
    sumLine("Sum anleggsmidler", anlegg.total),
    omlop.group,
    sumLine("Sum omløpsmidler", omlop.total),
    sumLine("Sum eiendeler", sumEiendeler),
  ];

  const passiva: AccountGroup[] = [
    ek.group,
    sumLine("Sum egenkapital", ek.total),
    gjeld.group,
    sumLine("Sum gjeld", gjeld.total),
    sumLine("Sum egenkapital og gjeld", sumEKGjeld),
  ];

  return { aktiva, passiva };
}

// ── Summary extractors ──────────────────────────────────────

export function getArsresultat(groups: AccountGroup[]): number {
  const arsresultat = groups.find(g => g.isSum && g.name === "Årsresultat");
  return arsresultat?.accounts[0]?.thisYear ?? 0;
}

export function getOmsetning(groups: AccountGroup[]): number {
  const sumInntekter = groups.find(g => g.isSum && g.name === "Sum driftsinntekter");
  return sumInntekter?.accounts[0]?.thisYear ?? 0;
}

export function getEgenkapital(passivaGroups: AccountGroup[]): number {
  const sumEK = passivaGroups.find(g => g.isSum && g.name === "Sum egenkapital");
  return sumEK?.accounts[0]?.thisYear ?? 0;
}
