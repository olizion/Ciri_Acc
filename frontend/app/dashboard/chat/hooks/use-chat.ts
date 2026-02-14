"use client";

import { useState, useCallback, useRef } from "react";
import { sendChatMessage, type ChatResponseAction } from "../lib/chat-api";

export interface MessageChart {
  type: "bar" | "line" | "pie";
  title?: string;
  data: Array<Record<string, string | number>>;
  config: Record<string, { label: string; color: string }>;
  dataKeys: string[];
  xAxisKey: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: ChatResponseAction[];
  charts?: MessageChart[];
  component?: string;
}

// Rich fallback responses with optional chart data
interface FallbackResponse {
  content: string;
  charts?: MessageChart[];
}

const FALLBACK_RESPONSES: Record<string, FallbackResponse> = {
  "vis siste bilag": {
    content: `### Siste bokførte bilag

| # | Leverandør | Beløp | Kategori | Status |
|---|------------|-------|----------|--------|
| 2025-0247 | Adobe Systems | kr 4 500 | Programvare | ✓ Bokført |
| 2025-0246 | Telenor Norge | kr 899 | Telefon | ✓ Bokført |
| 2025-0245 | Elkjøp | kr 12 490 | Utstyr | ✓ Bokført |
| 2025-0243 | Amazon Web Services | kr 3 200 | Hosting | ✓ Bokført |
| 2025-0242 | Circle K | kr 650 | Drivstoff | ✓ Bokført |

**Totalt bokført denne uken:** kr 21 739

Du har også **2 bilag** som venter på godkjenning.`,
    charts: [
      {
        type: "bar",
        title: "Bilag per kategori (siste 30 dager)",
        data: [
          { kategori: "Programvare", antall: 8, belop: 36000 },
          { kategori: "Telefon", antall: 3, belop: 2697 },
          { kategori: "Hosting", antall: 4, belop: 12800 },
          { kategori: "Utstyr", antall: 2, belop: 18990 },
          { kategori: "Drivstoff", antall: 6, belop: 3900 },
          { kategori: "Kontor", antall: 5, belop: 4200 }
        ],
        config: {
          belop: { label: "Beløp (kr)", color: "hsl(var(--primary))" }
        },
        dataKeys: ["belop"],
        xAxisKey: "kategori"
      }
    ]
  },

  "vis de siste bilagene som er bokført": {
    content: `### Siste bokførte bilag

| # | Leverandør | Beløp | Kategori | Status |
|---|------------|-------|----------|--------|
| 2025-0247 | Adobe Systems | kr 4 500 | Programvare | ✓ Bokført |
| 2025-0246 | Telenor Norge | kr 899 | Telefon | ✓ Bokført |
| 2025-0243 | Amazon Web Services | kr 3 200 | Hosting | ✓ Bokført |
| 2025-0242 | Circle K | kr 650 | Drivstoff | ✓ Bokført |

**Totalt bokført denne uken:** kr 9 249

Du har også **2 bilag** som venter på godkjenning.`
  },

  "mva-status": {
    content: `### MVA-status — 6. termin 2025

| | Beløp |
|---|---:|
| Utgående MVA | kr 45 230 |
| Inngående MVA | kr 21 780 |
| **Netto å betale** | **kr 23 450** |

**Frist:** 10. februar 2026 *(4 dager igjen)*

Alle bilag er bokført og avstemt. MVA-meldingen er klar til innsending via Altinn.`,
    charts: [
      {
        type: "bar",
        title: "MVA siste 6 terminer",
        data: [
          { termin: "1/25", utgaende: 38200, inngaende: 18400 },
          { termin: "2/25", utgaende: 41500, inngaende: 19800 },
          { termin: "3/25", utgaende: 36800, inngaende: 17200 },
          { termin: "4/25", utgaende: 43100, inngaende: 20500 },
          { termin: "5/25", utgaende: 39700, inngaende: 19100 },
          { termin: "6/25", utgaende: 45230, inngaende: 21780 }
        ],
        config: {
          utgaende: { label: "Utgående", color: "hsl(var(--primary))" },
          inngaende: { label: "Inngående", color: "hsl(142 71% 45%)" }
        },
        dataKeys: ["utgaende", "inngaende"],
        xAxisKey: "termin"
      }
    ]
  },

  "hva er mva-status for denne terminen?": {
    content: `### MVA-status — 6. termin (Nov - Des 2025)

**Oppsummering:**
- Utgående MVA: **kr 45 230**
- Inngående MVA: **kr 21 780**
- **Netto å betale: kr 23 450**

**Frist:** 10. februar 2026 *(4 dager igjen)*

Alle bilag for perioden er bokført og avstemt. MVA-meldingen er klar til innsending.`,
    charts: [
      {
        type: "bar",
        title: "MVA siste 6 terminer",
        data: [
          { termin: "1/25", utgaende: 38200, inngaende: 18400 },
          { termin: "2/25", utgaende: 41500, inngaende: 19800 },
          { termin: "3/25", utgaende: 36800, inngaende: 17200 },
          { termin: "4/25", utgaende: 43100, inngaende: 20500 },
          { termin: "5/25", utgaende: 39700, inngaende: 19100 },
          { termin: "6/25", utgaende: 45230, inngaende: 21780 }
        ],
        config: {
          utgaende: { label: "Utgående", color: "hsl(var(--primary))" },
          inngaende: { label: "Inngående", color: "hsl(142 71% 45%)" }
        },
        dataKeys: ["utgaende", "inngaende"],
        xAxisKey: "termin"
      }
    ]
  },

  "økonomisk oversikt": {
    content: `### Økonomisk oversikt — Januar 2026

| Nøkkeltall | Verdi | Trend |
|---|---:|---|
| Omsetning (YTD) | kr 1 245 000 | ↑ 15% |
| Driftsresultat | kr 352 890 | ↑ 8% |
| Banksaldo | kr 360 000 | → |
| Utestående fordringer | kr 125 000 | ↓ 12% |
| Leverandørgjeld | kr 87 000 | ↓ 5% |

**Likviditetsgrad:** 2.3 *(sunn)* · **Egenkapitalandel:** 66%`,
    charts: [
      {
        type: "line",
        title: "Omsetning vs. kostnader (2025)",
        data: [
          { mnd: "Jan", omsetning: 95000, kostnader: 72000 },
          { mnd: "Feb", omsetning: 88000, kostnader: 68000 },
          { mnd: "Mar", omsetning: 102000, kostnader: 71000 },
          { mnd: "Apr", omsetning: 110000, kostnader: 75000 },
          { mnd: "Mai", omsetning: 98000, kostnader: 70000 },
          { mnd: "Jun", omsetning: 115000, kostnader: 78000 },
          { mnd: "Jul", omsetning: 82000, kostnader: 65000 },
          { mnd: "Aug", omsetning: 107000, kostnader: 73000 },
          { mnd: "Sep", omsetning: 112000, kostnader: 76000 },
          { mnd: "Okt", omsetning: 120000, kostnader: 80000 },
          { mnd: "Nov", omsetning: 108000, kostnader: 74000 },
          { mnd: "Des", omsetning: 108000, kostnader: 70000 }
        ],
        config: {
          omsetning: { label: "Omsetning", color: "hsl(var(--primary))" },
          kostnader: { label: "Kostnader", color: "hsl(0 72% 51%)" }
        },
        dataKeys: ["omsetning", "kostnader"],
        xAxisKey: "mnd"
      }
    ]
  },

  "vis resultat hittil i år": {
    content: `### Resultatregnskap 2025

**Inntekter**
| Konto | Beskrivelse | Beløp |
|-------|-------------|------:|
| 3000 | Salgsinntekt | kr 1 145 000 |
| 3900 | Andre inntekter | kr 100 000 |
| | **Sum inntekter** | **kr 1 245 000** |

**Kostnader**
| Kategori | Beløp |
|----------|------:|
| Varekostnad | kr 320 000 |
| Lønnskostnader | kr 412 000 |
| Andre driftskostnader | kr 160 110 |
| **Sum kostnader** | **kr 892 110** |

---

### Resultat før skatt: **kr 352 890**

Dette er **15% bedre** enn samme periode i fjor!`,
    charts: [
      {
        type: "bar",
        title: "Månedlig resultat 2025",
        data: [
          { mnd: "Jan", inntekt: 95000, kostnad: 72000 },
          { mnd: "Feb", inntekt: 88000, kostnad: 68000 },
          { mnd: "Mar", inntekt: 102000, kostnad: 71000 },
          { mnd: "Apr", inntekt: 110000, kostnad: 75000 },
          { mnd: "Mai", inntekt: 98000, kostnad: 70000 },
          { mnd: "Jun", inntekt: 115000, kostnad: 78000 },
          { mnd: "Jul", inntekt: 82000, kostnad: 65000 },
          { mnd: "Aug", inntekt: 107000, kostnad: 73000 },
          { mnd: "Sep", inntekt: 112000, kostnad: 76000 },
          { mnd: "Okt", inntekt: 120000, kostnad: 80000 },
          { mnd: "Nov", inntekt: 108000, kostnad: 74000 },
          { mnd: "Des", inntekt: 108000, kostnad: 70000 }
        ],
        config: {
          inntekt: { label: "Inntekt", color: "hsl(142 71% 45%)" },
          kostnad: { label: "Kostnad", color: "hsl(0 72% 51%)" }
        },
        dataKeys: ["inntekt", "kostnad"],
        xAxisKey: "mnd"
      }
    ]
  },

  "beregn mva": {
    content: `### MVA-beregning — 6. termin 2025

**Grunnlag:**

| MVA-sats | Grunnlag | MVA |
|---|---:|---:|
| 25% (standard) | kr 156 920 | kr 39 230 |
| 15% (mat) | kr 40 000 | kr 6 000 |
| 0% (fritak) | kr 22 000 | kr 0 |
| **Sum utgående** | | **kr 45 230** |

**Fradrag:**

| Type | Beløp |
|---|---:|
| Inngående MVA (bilag) | kr 19 280 |
| MVA på import | kr 2 500 |
| **Sum fradrag** | **kr 21 780** |

---

**Netto MVA å betale: kr 23 450**`,
    charts: [
      {
        type: "pie",
        title: "MVA fordelt på sats",
        data: [
          { name: "25% standard", value: 39230 },
          { name: "15% mat", value: 6000 },
          { name: "Fradrag", value: 21780 }
        ],
        config: {
          "25% standard": { label: "25%", color: "hsl(var(--primary))" },
          "15% mat": { label: "15%", color: "hsl(210 80% 55%)" },
          "Fradrag": { label: "Fradrag", color: "hsl(142 71% 45%)" }
        },
        dataKeys: ["value"],
        xAxisKey: "name"
      }
    ]
  },

  "søk bilag": {
    content: `### Bilagoversikt

| # | Dato | Leverandør | Beløp | Kategori | Status |
|---|------|------------|------:|----------|--------|
| 0247 | 03.02 | Adobe Systems | kr 4 500 | Programvare | ✓ Bokført |
| 0246 | 01.02 | Telenor Norge | kr 899 | Telefon | ✓ Bokført |
| 0245 | 30.01 | Elkjøp | kr 12 490 | Utstyr | ✓ Bokført |
| 0244 | 28.01 | Rema 1000 | kr 342 | Kontor | ⏳ Venter |
| 0243 | 25.01 | AWS | kr 3 200 | Hosting | ✓ Bokført |

Viser **5 av 247** bilag. Spør meg om en leverandør eller kategori for å filtrere.`
  },

  "manglende bilag": {
    content: `### Manglende bilag — Februar 2026

Jeg fant **3 transaksjoner** uten tilhørende bilag:

| Dato | Beskrivelse | Beløp | Kilde |
|------|-------------|------:|-------|
| 28.01 | Vipps betaling | kr 1 250 | Bank |
| 25.01 | Kortbetaling REMA | kr 342 | Bank |
| 20.01 | Overføring | kr 8 500 | Bank |

**Tips:** Last opp kvitteringer for disse, eller marker som privatuttak hvis de er private.`
  },

  "neste frist": {
    content: `### Kommende frister

| Frist | Hva | Status |
|-------|-----|--------|
| **10. feb 2026** | MVA-melding 6. termin | 🟡 Klar til sending |
| 15. feb 2026 | Forskuddsskatt 1. termin | 🔴 Ikke beregnet |
| 01. mar 2026 | A-melding januar | 🟢 Sendt |
| 31. mai 2026 | Skattemelding 2025 | ⚪ Ikke startet |
| 30. jun 2026 | Årsregnskap 2025 | ⚪ Ikke startet |

**Neste handling:** Send MVA-melding innen 10. februar.`
  },

  "uavstemt": {
    content: `### Uavstemte transaksjoner

Fant **12 transaksjoner** som ikke er avstemt:

| Dato | Beskrivelse | Inn | Ut | Forslag |
|------|-------------|----:|---:|---------|
| 04.02 | Lønn Henrik | | kr 45 200 | → 5000 Lønn |
| 03.02 | Adobe Inc | | kr 4 500 | → 6400 Programvare |
| 01.02 | Kundebet. #1042 | kr 25 000 | | → 1500 Kundefordring |
| 01.02 | Telenor | | kr 899 | → 6900 Telefon |
| 30.01 | Elkjøp | | kr 12 490 | → 1200 Utstyr |

*Viser 5 av 12.* Ciri kan automatisk avstemme **8 av 12** med høy sikkerhet.`
  },

  "siste transaksjoner": {
    content: `### Siste banktransaksjoner

| Dato | Beskrivelse | Beløp | Avstemt |
|------|-------------|------:|--------|
| 05.02 | Husleie feb | -kr 18 000 | ✓ |
| 04.02 | Lønn Henrik | -kr 45 200 | ✗ |
| 03.02 | Adobe Inc | -kr 4 500 | ✗ |
| 02.02 | Kundebetaling | +kr 32 000 | ✓ |
| 01.02 | Telenor | -kr 899 | ✗ |
| 01.02 | Kundebet. #1042 | +kr 25 000 | ✗ |

**Saldo:** kr 360 000 · **Uavstemt:** 4 transaksjoner`,
    charts: [
      {
        type: "line",
        title: "Banksaldo siste 30 dager",
        data: [
          { dag: "07.01", saldo: 345000 },
          { dag: "14.01", saldo: 320000 },
          { dag: "21.01", saldo: 298000 },
          { dag: "25.01", saldo: 355000 },
          { dag: "28.01", saldo: 340000 },
          { dag: "01.02", saldo: 372000 },
          { dag: "05.02", saldo: 360000 }
        ],
        config: {
          saldo: { label: "Saldo (kr)", color: "hsl(var(--primary))" }
        },
        dataKeys: ["saldo"],
        xAxisKey: "dag"
      }
    ]
  },

  "neste lønnskjøring": {
    content: `### Neste lønnskjøring — 25. februar 2026

| Ansatt | Bruttolønn | Skatt | Netto |
|--------|----------:|------:|------:|
| Henrik Berge | kr 65 000 | kr 22 100 | kr 42 900 |
| Maria Olsen | kr 55 000 | kr 17 600 | kr 37 400 |
| Erik Hansen | kr 52 000 | kr 16 640 | kr 35 360 |
| **Totalt** | **kr 172 000** | **kr 56 340** | **kr 115 660** |

**Arbeidsgiveravgift:** kr 24 252
**OTP (2%):** kr 3 440
**Total kostnad:** kr 199 692

A-melding for januar er allerede sendt. ✓`
  },

  "gi meg en oversikt over lønnskostnader": {
    content: `### Lønnsoversikt 2025

**Ansatte (3 personer)**
| Navn | Stilling | Månedslønn | Årlig kost |
|------|----------|----------:|----------:|
| Henrik Berge | Daglig leder | kr 65 000 | kr 780 000 |
| Maria Olsen | Utvikler | kr 55 000 | kr 660 000 |
| Erik Hansen | Designer | kr 52 000 | kr 624 000 |

**Månedlige kostnader**
- Bruttolønn: **kr 172 000**
- Arbeidsgiveravgift (14.1%): **kr 24 252**
- OTP (2%): **kr 3 440**
- **Total månedlig: kr 199 692**`
  },

  "forklar balanserapporten min": {
    content: `### Balanserapporten forklart

Balanserapporten viser hva bedriften **eier** og **skylder**.

**EIENDELER**
| Type | Beløp |
|------|------:|
| Anleggsmidler | kr 150 000 |
| Bankinnskudd | kr 360 000 |
| Kundefordringer | kr 125 000 |
| **Sum eiendeler** | **kr 635 000** |

**EGENKAPITAL OG GJELD**
| Type | Beløp |
|------|------:|
| Egenkapital | kr 420 000 |
| Kortsiktig gjeld | kr 215 000 |
| **Sum EK + gjeld** | **kr 635 000** |

---

**Nøkkeltall:**
- **Egenkapitalandel: 66%** *(anbefalt: over 30%)* ✓
- **Likviditetsgrad: 2.3** *(sunn)* ✓`,
    charts: [
      {
        type: "pie",
        title: "Eiendeler fordeling",
        data: [
          { name: "Anleggsmidler", value: 150000 },
          { name: "Bankinnskudd", value: 360000 },
          { name: "Kundefordringer", value: 125000 }
        ],
        config: {
          "Anleggsmidler": { label: "Anleggsmidler", color: "hsl(var(--primary))" },
          "Bankinnskudd": { label: "Bank", color: "hsl(142 71% 45%)" },
          "Kundefordringer": { label: "Fordringer", color: "hsl(210 80% 55%)" }
        },
        dataKeys: ["value"],
        xAxisKey: "name"
      }
    ]
  }
};

// Keywords that trigger the invoice form
const INVOICE_KEYWORDS = [
  "send faktura",
  "lag faktura",
  "ny faktura",
  "opprett faktura",
  "fakturere",
  "skriv faktura",
];

function isInvoiceRequest(query: string): boolean {
  const normalized = query.toLowerCase().trim();
  return INVOICE_KEYWORDS.some((kw) => normalized.includes(kw));
}

function getFallbackResponse(query: string): FallbackResponse {
  const normalized = query.toLowerCase().trim();

  // Exact match
  if (FALLBACK_RESPONSES[normalized]) return FALLBACK_RESPONSES[normalized];

  // Partial match — find the best matching key
  for (const [key, response] of Object.entries(FALLBACK_RESPONSES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return response;
    }
  }

  return {
    content: `Jeg forstår spørsmålet ditt om **"${query}"**.

La meg analysere regnskapet ditt...

For mer spesifikke spørsmål, prøv:
- "Vis siste bilag"
- "MVA-status"
- "Økonomisk oversikt"
- "Neste lønnskjøring"
- "Siste transaksjoner"`
  };
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const idCounter = useRef(0);

  const nextId = useCallback(() => {
    idCounter.current += 1;
    return `msg-${Date.now()}-${idCounter.current}`;
  }, []);

  const hasUserMessages = messages.some((m) => m.role === "user");

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      const userMsg: Message = {
        id: nextId(),
        role: "user",
        content: trimmed,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      // Check for invoice keywords — show inline form
      if (isInvoiceRequest(trimmed)) {
        await new Promise((r) => setTimeout(r, 600));
        const assistantMsg: Message = {
          id: nextId(),
          role: "assistant",
          content: "Selvfølgelig! Fyll ut fakturaen under, så sender jeg den for deg.",
          timestamp: new Date(),
          component: "invoice-form"
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsTyping(false);
        return;
      }

      try {
        const res = await sendChatMessage(trimmed);
        const assistantMsg: Message = {
          id: res.id || nextId(),
          role: "assistant",
          content: res.content,
          timestamp: new Date(res.timestamp),
          actions: res.actions ?? undefined
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        // Fallback to rich local mock responses
        await new Promise((r) => setTimeout(r, 1200));
        const fallback = getFallbackResponse(trimmed);
        const assistantMsg: Message = {
          id: nextId(),
          role: "assistant",
          content: fallback.content,
          timestamp: new Date(),
          charts: fallback.charts
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, nextId]
  );

  /**
   * Add a user message + instant Ciri response for page actions.
   * No API call, no typing delay — the action already happened.
   */
  const addActionResponse = useCallback(
    (userText: string, ciriResponse: string) => {
      const userMsg: Message = {
        id: nextId(),
        role: "user",
        content: userText,
        timestamp: new Date(),
      };
      const assistantMsg: Message = {
        id: nextId(),
        role: "assistant",
        content: ciriResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
    },
    [nextId]
  );

  return { messages, isTyping, hasUserMessages, sendMessage, addActionResponse };
}
