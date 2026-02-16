import type { AccountGroup } from "../types";

export const resultatregnskapData: AccountGroup[] = [
  {
    name: "Driftsinntekter",
    accounts: [
      { konto: "3000", navn: "Salgsinntekt, avgiftspliktig", thisYear: 3850000, lastYear: 3200000, bilag: [
        { id: "F-001", date: "2025-01-15", description: "Faktura Kunde AS", amount: 125000, supplier: "Kunde AS" },
        { id: "F-002", date: "2025-01-28", description: "Faktura Nordic Tech", amount: 89000, supplier: "Nordic Tech" },
        { id: "F-003", date: "2025-02-10", description: "Faktura Konsulent Partner", amount: 156000, supplier: "Konsulent Partner" },
      ]},
      { konto: "3100", navn: "Salgsinntekt, avgiftsfri", thisYear: 400000, lastYear: 350000 },
    ]
  },
  {
    name: "Sum driftsinntekter",
    accounts: [{ konto: "", navn: "", thisYear: 4250000, lastYear: 3550000 }],
    isSum: true
  },
  {
    name: "Driftskostnader",
    accounts: [
      { konto: "4000", navn: "Varekostnad", thisYear: -520000, lastYear: -480000, bilag: [
        { id: "B-101", date: "2025-03-05", description: "Innkjøp programvare", amount: -45000, supplier: "Software AS" },
        { id: "B-102", date: "2025-04-12", description: "Lisenser", amount: -28000, supplier: "Microsoft" },
      ]},
      { konto: "5000", navn: "Lønnskostnad", thisYear: -1850000, lastYear: -1650000 },
      { konto: "5400", navn: "Arbeidsgiveravgift", thisYear: -260900, lastYear: -232650 },
      { konto: "5420", navn: "Pensjonskostnad", thisYear: -37000, lastYear: -33000 },
      { konto: "6000", navn: "Avskrivninger", thisYear: -85000, lastYear: -78000 },
      { konto: "6300", navn: "Leie lokale", thisYear: -180000, lastYear: -168000, bilag: [
        { id: "B-201", date: "2025-01-01", description: "Husleie januar", amount: -15000, supplier: "Eiendom AS" },
        { id: "B-202", date: "2025-02-01", description: "Husleie februar", amount: -15000, supplier: "Eiendom AS" },
      ]},
      { konto: "6500", navn: "Verktøy og utstyr", thisYear: -42000, lastYear: -38000 },
      { konto: "6700", navn: "Revisjon og regnskap", thisYear: -65000, lastYear: -58000 },
      { konto: "6800", navn: "Kontorkostnader", thisYear: -32000, lastYear: -29000 },
      { konto: "6900", navn: "Telefon og internett", thisYear: -18000, lastYear: -16000 },
      { konto: "7000", navn: "Reisekostnader", thisYear: -48000, lastYear: -42000 },
      { konto: "7300", navn: "Markedsføring", thisYear: -95000, lastYear: -85000 },
      { konto: "7700", navn: "Annen driftskostnad", thisYear: -28000, lastYear: -25000 },
    ]
  },
  {
    name: "Sum driftskostnader",
    accounts: [{ konto: "", navn: "", thisYear: -3260900, lastYear: -2934650 }],
    isSum: true
  },
  {
    name: "Driftsresultat",
    accounts: [{ konto: "", navn: "", thisYear: 989100, lastYear: 615350 }],
    isSum: true
  },
  {
    name: "Finansposter",
    accounts: [
      { konto: "8000", navn: "Renteinntekter", thisYear: 12500, lastYear: 8200 },
      { konto: "8100", navn: "Rentekostnader", thisYear: -3400, lastYear: -2800 },
    ]
  },
  {
    name: "Ordinært resultat før skatt",
    accounts: [{ konto: "", navn: "", thisYear: 998200, lastYear: 620750 }],
    isSum: true
  },
  {
    name: "Skattekostnad",
    accounts: [
      { konto: "8300", navn: "Skattekostnad", thisYear: -219604, lastYear: -136565 },
    ]
  },
  {
    name: "Årsresultat",
    accounts: [{ konto: "", navn: "", thisYear: 778596, lastYear: 484185 }],
    isSum: true
  }
];

export const balanseAktivaData: AccountGroup[] = [
  {
    name: "Anleggsmidler",
    accounts: [
      { konto: "1000", navn: "Forskning og utvikling", thisYear: 120000, lastYear: 95000 },
      { konto: "1200", navn: "Maskiner og inventar", thisYear: 185000, lastYear: 142000 },
      { konto: "1280", navn: "Akkumulerte avskrivninger", thisYear: -85000, lastYear: -62000 },
    ]
  },
  {
    name: "Sum anleggsmidler",
    accounts: [{ konto: "", navn: "", thisYear: 220000, lastYear: 175000 }],
    isSum: true
  },
  {
    name: "Omløpsmidler",
    accounts: [
      { konto: "1500", navn: "Kundefordringer", thisYear: 425000, lastYear: 380000, bilag: [
        { id: "K-001", date: "2025-12-15", description: "Utestående Kunde AS", amount: 125000 },
        { id: "K-002", date: "2025-12-20", description: "Utestående Nordic Tech", amount: 89000 },
      ]},
      { konto: "1700", navn: "Andre fordringer", thisYear: 35000, lastYear: 28000 },
      { konto: "1900", navn: "Bankinnskudd", thisYear: 1285000, lastYear: 892000 },
    ]
  },
  {
    name: "Sum omløpsmidler",
    accounts: [{ konto: "", navn: "", thisYear: 1745000, lastYear: 1300000 }],
    isSum: true
  },
  {
    name: "Sum eiendeler",
    accounts: [{ konto: "", navn: "", thisYear: 1965000, lastYear: 1475000 }],
    isSum: true
  }
];

export const balansePassivaData: AccountGroup[] = [
  {
    name: "Egenkapital",
    accounts: [
      { konto: "2000", navn: "Aksjekapital", thisYear: 100000, lastYear: 100000 },
      { konto: "2050", navn: "Annen egenkapital", thisYear: 641404, lastYear: 357219 },
      { konto: "2080", navn: "Årets resultat", thisYear: 778596, lastYear: 484185 },
    ]
  },
  {
    name: "Sum egenkapital",
    accounts: [{ konto: "", navn: "", thisYear: 1520000, lastYear: 941404 }],
    isSum: true
  },
  {
    name: "Gjeld",
    accounts: [
      { konto: "2400", navn: "Leverandørgjeld", thisYear: 156000, lastYear: 198000 },
      { konto: "2600", navn: "Skattetrekk", thisYear: 89000, lastYear: 78000 },
      { konto: "2700", navn: "Skyldig MVA", thisYear: 112000, lastYear: 95000 },
      { konto: "2780", navn: "Påløpt lønn og feriepenger", thisYear: 88000, lastYear: 162596 },
    ]
  },
  {
    name: "Sum gjeld",
    accounts: [{ konto: "", navn: "", thisYear: 445000, lastYear: 533596 }],
    isSum: true
  },
  {
    name: "Sum egenkapital og gjeld",
    accounts: [{ konto: "", navn: "", thisYear: 1965000, lastYear: 1475000 }],
    isSum: true
  }
];
