import { HovedboKonto } from "../types";

export const hovedbokData: HovedboKonto[] = [
  {
    kontonummer: "1200",
    kontonavn: "Maskiner og anlegg",
    klasse: "Eiendeler",
    klasseNummer: 1,
    inngaendeBalanse: 450000,
    debet: 125000,
    kredit: 0,
    utgaendeBalanse: 575000,
    transaksjoner: [
      { id: "t1", dato: "2026-01-15", bilagsnummer: "B-2026-0012", beskrivelse: "Ny produksjonsmaskin", debet: 125000, kredit: 0, motpart: "2400" },
    ]
  },
  {
    kontonummer: "1500",
    kontonavn: "Kundefordringer",
    klasse: "Eiendeler",
    klasseNummer: 1,
    inngaendeBalanse: 287500,
    debet: 542000,
    kredit: 498000,
    utgaendeBalanse: 331500,
    transaksjoner: [
      { id: "t2", dato: "2025-12-02", bilagsnummer: "B-2025-0945", beskrivelse: "Faktura #1247 - Kunde AS", debet: 187500, kredit: 0, motpart: "3000" },
      { id: "t3", dato: "2025-12-08", bilagsnummer: "B-2025-0956", beskrivelse: "Innbetaling fra Kunde AS", debet: 0, kredit: 187500, motpart: "1920" },
      { id: "t4", dato: "2026-01-10", bilagsnummer: "B-2026-0005", beskrivelse: "Faktura #1248 - Bedrift Norge AS", debet: 234500, kredit: 0, motpart: "3000" },
      { id: "t5", dato: "2026-01-18", bilagsnummer: "B-2026-0015", beskrivelse: "Innbetaling fra Bedrift Norge AS", debet: 0, kredit: 190500, motpart: "1920" },
      { id: "t6", dato: "2026-01-25", bilagsnummer: "B-2026-0022", beskrivelse: "Faktura #1249 - Tech Solutions", debet: 120000, kredit: 0, motpart: "3000" },
      { id: "t7", dato: "2026-02-01", bilagsnummer: "B-2026-0030", beskrivelse: "Innbetaling fra Tech Solutions", debet: 0, kredit: 120000, motpart: "1920" },
    ]
  },
  {
    kontonummer: "1920",
    kontonavn: "Bankinnskudd",
    klasse: "Eiendeler",
    klasseNummer: 1,
    inngaendeBalanse: 1245000,
    debet: 847500,
    kredit: 692000,
    utgaendeBalanse: 1400500,
    transaksjoner: [
      { id: "t8", dato: "2025-12-05", bilagsnummer: "B-2025-0949", beskrivelse: "Overføring fra kunde", debet: 245000, kredit: 0, motpart: "1500" },
      { id: "t9", dato: "2025-12-10", bilagsnummer: "B-2025-0962", beskrivelse: "Husleie desember", debet: 0, kredit: 45000, motpart: "6300" },
      { id: "t10", dato: "2025-12-12", bilagsnummer: "B-2025-0967", beskrivelse: "Strøm og energi", debet: 0, kredit: 12500, motpart: "6340" },
      { id: "t11", dato: "2026-01-05", bilagsnummer: "B-2026-0002", beskrivelse: "Kundeinnbetaling", debet: 187500, kredit: 0, motpart: "1500" },
      { id: "t12", dato: "2026-01-20", bilagsnummer: "B-2026-0018", beskrivelse: "Lønn januar", debet: 0, kredit: 385000, motpart: "5000" },
      { id: "t13", dato: "2026-01-25", bilagsnummer: "B-2026-0023", beskrivelse: "Leverandørbetaling", debet: 0, kredit: 124500, motpart: "2400" },
      { id: "t14", dato: "2026-01-28", bilagsnummer: "B-2026-0026", beskrivelse: "Innbetaling prosjekt", debet: 315000, kredit: 0, motpart: "1500" },
      { id: "t15", dato: "2026-02-01", bilagsnummer: "B-2026-0031", beskrivelse: "MVA-betaling", debet: 0, kredit: 87500, motpart: "2740" },
      { id: "t16", dato: "2026-02-01", bilagsnummer: "B-2026-0032", beskrivelse: "Kundeinnbetaling", debet: 100000, kredit: 0, motpart: "1500" },
      { id: "t17", dato: "2025-12-08", bilagsnummer: "B-2025-0958", beskrivelse: "Forsikring", debet: 0, kredit: 37500, motpart: "7500" },
    ]
  },
  {
    kontonummer: "2000",
    kontonavn: "Aksjekapital",
    klasse: "Egenkapital og gjeld",
    klasseNummer: 2,
    inngaendeBalanse: -100000,
    debet: 0,
    kredit: 0,
    utgaendeBalanse: -100000,
    transaksjoner: []
  },
  {
    kontonummer: "2050",
    kontonavn: "Annen egenkapital",
    klasse: "Egenkapital og gjeld",
    klasseNummer: 2,
    inngaendeBalanse: -890000,
    debet: 0,
    kredit: 245000,
    utgaendeBalanse: -1135000,
    transaksjoner: [
      { id: "t18", dato: "2025-12-31", bilagsnummer: "B-2025-0999", beskrivelse: "Resultatoverføring", debet: 0, kredit: 245000, motpart: "8800" },
    ]
  },
  {
    kontonummer: "2400",
    kontonavn: "Leverandørgjeld",
    klasse: "Egenkapital og gjeld",
    klasseNummer: 2,
    inngaendeBalanse: -178500,
    debet: 298500,
    kredit: 412000,
    utgaendeBalanse: -292000,
    transaksjoner: [
      { id: "t19", dato: "2025-12-03", bilagsnummer: "B-2025-0947", beskrivelse: "Faktura fra IT-leverandør", debet: 0, kredit: 87500, motpart: "6500" },
      { id: "t20", dato: "2025-12-08", bilagsnummer: "B-2025-0958", beskrivelse: "Betaling til leverandør", debet: 65000, kredit: 0, motpart: "1920" },
      { id: "t21", dato: "2026-01-08", bilagsnummer: "B-2026-0004", beskrivelse: "Varekjøp", debet: 0, kredit: 199500, motpart: "4000" },
      { id: "t22", dato: "2026-01-15", bilagsnummer: "B-2026-0011", beskrivelse: "Betaling vareleverandør", debet: 145000, kredit: 0, motpart: "1920" },
      { id: "t23", dato: "2026-01-22", bilagsnummer: "B-2026-0019", beskrivelse: "Kontorutstyr", debet: 0, kredit: 45000, motpart: "6800" },
      { id: "t24", dato: "2026-01-28", bilagsnummer: "B-2026-0025", beskrivelse: "Betaling kontorrekvisita", debet: 45000, kredit: 0, motpart: "1920" },
      { id: "t25", dato: "2026-02-01", bilagsnummer: "B-2026-0033", beskrivelse: "Rådgivningstjenester", debet: 0, kredit: 80000, motpart: "6700" },
      { id: "t26", dato: "2026-02-01", bilagsnummer: "B-2026-0034", beskrivelse: "Delvis betaling rådgiver", debet: 43500, kredit: 0, motpart: "1920" },
    ]
  },
  {
    kontonummer: "2740",
    kontonavn: "Skyldig MVA",
    klasse: "Egenkapital og gjeld",
    klasseNummer: 2,
    inngaendeBalanse: -87500,
    debet: 87500,
    kredit: 112500,
    utgaendeBalanse: -112500,
    transaksjoner: [
      { id: "t27", dato: "2025-12-10", bilagsnummer: "B-2025-0964", beskrivelse: "Utgående MVA desember", debet: 0, kredit: 56250, motpart: "3000" },
      { id: "t28", dato: "2026-01-10", bilagsnummer: "B-2026-0006", beskrivelse: "MVA-betaling 6. termin", debet: 87500, kredit: 0, motpart: "1920" },
      { id: "t29", dato: "2026-01-31", bilagsnummer: "B-2026-0028", beskrivelse: "Utgående MVA januar", debet: 0, kredit: 56250, motpart: "3000" },
    ]
  },
  {
    kontonummer: "3000",
    kontonavn: "Salgsinntekt, avgiftspliktig",
    klasse: "Salgs- og driftsinntekter",
    klasseNummer: 3,
    inngaendeBalanse: 0,
    debet: 0,
    kredit: 1450000,
    utgaendeBalanse: -1450000,
    transaksjoner: [
      { id: "t30", dato: "2025-12-05", bilagsnummer: "B-2025-0950", beskrivelse: "Salg prosjekt A", debet: 0, kredit: 425000, motpart: "1500" },
      { id: "t31", dato: "2025-12-12", bilagsnummer: "B-2025-0966", beskrivelse: "Konsulentoppdrag", debet: 0, kredit: 287500, motpart: "1500" },
      { id: "t32", dato: "2026-01-08", bilagsnummer: "B-2026-0003", beskrivelse: "Produktsalg", debet: 0, kredit: 312500, motpart: "1500" },
      { id: "t33", dato: "2026-01-20", bilagsnummer: "B-2026-0017", beskrivelse: "Serviceavtale", debet: 0, kredit: 175000, motpart: "1500" },
      { id: "t34", dato: "2026-02-01", bilagsnummer: "B-2026-0035", beskrivelse: "Prosjektleveranse", debet: 0, kredit: 250000, motpart: "1500" },
    ]
  },
  {
    kontonummer: "4000",
    kontonavn: "Varekjøp",
    klasse: "Varekostnad",
    klasseNummer: 4,
    inngaendeBalanse: 0,
    debet: 485000,
    kredit: 0,
    utgaendeBalanse: 485000,
    transaksjoner: [
      { id: "t35", dato: "2025-12-08", bilagsnummer: "B-2025-0957", beskrivelse: "Innkjøp komponenter", debet: 187500, kredit: 0, motpart: "2400" },
      { id: "t36", dato: "2026-01-12", bilagsnummer: "B-2026-0008", beskrivelse: "Råvarer produksjon", debet: 142500, kredit: 0, motpart: "2400" },
      { id: "t37", dato: "2026-01-28", bilagsnummer: "B-2026-0024", beskrivelse: "Materialkjøp", debet: 155000, kredit: 0, motpart: "2400" },
    ]
  },
  {
    kontonummer: "5000",
    kontonavn: "Lønn til ansatte",
    klasse: "Lønnskostnader",
    klasseNummer: 5,
    inngaendeBalanse: 0,
    debet: 645000,
    kredit: 0,
    utgaendeBalanse: 645000,
    transaksjoner: [
      { id: "t38", dato: "2025-12-20", bilagsnummer: "B-2025-0980", beskrivelse: "Lønn desember", debet: 320000, kredit: 0, motpart: "1920" },
      { id: "t39", dato: "2026-01-20", bilagsnummer: "B-2026-0016", beskrivelse: "Lønn januar", debet: 325000, kredit: 0, motpart: "1920" },
    ]
  },
  {
    kontonummer: "5400",
    kontonavn: "Arbeidsgiveravgift",
    klasse: "Lønnskostnader",
    klasseNummer: 5,
    inngaendeBalanse: 0,
    debet: 91035,
    kredit: 0,
    utgaendeBalanse: 91035,
    transaksjoner: [
      { id: "t40", dato: "2025-12-20", bilagsnummer: "B-2025-0981", beskrivelse: "AGA desember", debet: 45120, kredit: 0, motpart: "2770" },
      { id: "t41", dato: "2026-01-20", bilagsnummer: "B-2026-0016b", beskrivelse: "AGA januar", debet: 45915, kredit: 0, motpart: "2770" },
    ]
  },
  {
    kontonummer: "6300",
    kontonavn: "Leie lokaler",
    klasse: "Andre driftskostnader",
    klasseNummer: 6,
    inngaendeBalanse: 0,
    debet: 90000,
    kredit: 0,
    utgaendeBalanse: 90000,
    transaksjoner: [
      { id: "t42", dato: "2025-12-01", bilagsnummer: "B-2025-0941", beskrivelse: "Husleie desember", debet: 45000, kredit: 0, motpart: "1920" },
      { id: "t43", dato: "2026-01-02", bilagsnummer: "B-2026-0001", beskrivelse: "Husleie januar", debet: 45000, kredit: 0, motpart: "1920" },
    ]
  },
  {
    kontonummer: "6500",
    kontonavn: "Programvare og IT-tjenester",
    klasse: "Andre driftskostnader",
    klasseNummer: 6,
    inngaendeBalanse: 0,
    debet: 142500,
    kredit: 0,
    utgaendeBalanse: 142500,
    transaksjoner: [
      { id: "t44", dato: "2025-12-05", bilagsnummer: "B-2025-0951", beskrivelse: "Microsoft 365 lisenser", debet: 12500, kredit: 0, motpart: "2400" },
      { id: "t45", dato: "2025-12-12", bilagsnummer: "B-2025-0968", beskrivelse: "AWS hosting", debet: 35000, kredit: 0, motpart: "2400" },
      { id: "t46", dato: "2026-01-05", bilagsnummer: "B-2026-0002b", beskrivelse: "Slack Enterprise", debet: 8500, kredit: 0, motpart: "2400" },
      { id: "t47", dato: "2026-01-15", bilagsnummer: "B-2026-0010", beskrivelse: "GitHub Team", debet: 4500, kredit: 0, motpart: "2400" },
      { id: "t48", dato: "2026-01-22", bilagsnummer: "B-2026-0020", beskrivelse: "IT-konsulent", debet: 82000, kredit: 0, motpart: "2400" },
    ]
  },
  {
    kontonummer: "6800",
    kontonavn: "Kontorrekvisita",
    klasse: "Andre driftskostnader",
    klasseNummer: 6,
    inngaendeBalanse: 0,
    debet: 23500,
    kredit: 0,
    utgaendeBalanse: 23500,
    transaksjoner: [
      { id: "t49", dato: "2025-12-08", bilagsnummer: "B-2025-0959", beskrivelse: "Kontorrekvisita", debet: 8500, kredit: 0, motpart: "2400" },
      { id: "t50", dato: "2026-01-08", bilagsnummer: "B-2026-0003b", beskrivelse: "Printerpapir og toner", debet: 4500, kredit: 0, motpart: "2400" },
      { id: "t51", dato: "2026-01-18", bilagsnummer: "B-2026-0014", beskrivelse: "Møteromutstyr", debet: 10500, kredit: 0, motpart: "2400" },
    ]
  },
  {
    kontonummer: "7100",
    kontonavn: "Bilkostnader",
    klasse: "Andre driftskostnader",
    klasseNummer: 7,
    inngaendeBalanse: 0,
    debet: 28500,
    kredit: 0,
    utgaendeBalanse: 28500,
    transaksjoner: [
      { id: "t52", dato: "2025-12-15", bilagsnummer: "B-2025-0972", beskrivelse: "Drivstoff firmabil", debet: 4500, kredit: 0, motpart: "1920" },
      { id: "t53", dato: "2025-12-28", bilagsnummer: "B-2025-0990", beskrivelse: "Service firmabil", debet: 12500, kredit: 0, motpart: "2400" },
      { id: "t54", dato: "2026-01-15", bilagsnummer: "B-2026-0009", beskrivelse: "Drivstoff januar", debet: 5500, kredit: 0, motpart: "1920" },
      { id: "t55", dato: "2026-01-28", bilagsnummer: "B-2026-0027", beskrivelse: "Bomavgifter Q4", debet: 6000, kredit: 0, motpart: "1920" },
    ]
  },
  {
    kontonummer: "7500",
    kontonavn: "Forsikringer",
    klasse: "Andre driftskostnader",
    klasseNummer: 7,
    inngaendeBalanse: 0,
    debet: 75000,
    kredit: 0,
    utgaendeBalanse: 75000,
    transaksjoner: [
      { id: "t56", dato: "2025-12-01", bilagsnummer: "B-2025-0942", beskrivelse: "Bedriftsforsikring kvartal", debet: 37500, kredit: 0, motpart: "1920" },
      { id: "t57", dato: "2026-01-02", bilagsnummer: "B-2026-0001b", beskrivelse: "Ansvarsforsikring", debet: 37500, kredit: 0, motpart: "1920" },
    ]
  },
  {
    kontonummer: "8040",
    kontonavn: "Renteinntekter",
    klasse: "Finansposter",
    klasseNummer: 8,
    inngaendeBalanse: 0,
    debet: 0,
    kredit: 12500,
    utgaendeBalanse: -12500,
    transaksjoner: [
      { id: "t58", dato: "2025-12-31", bilagsnummer: "B-2025-0998", beskrivelse: "Renter bankkonto desember", debet: 0, kredit: 6250, motpart: "1920" },
      { id: "t59", dato: "2026-01-31", bilagsnummer: "B-2026-0029", beskrivelse: "Renter bankkonto januar", debet: 0, kredit: 6250, motpart: "1920" },
    ]
  },
  {
    kontonummer: "8150",
    kontonavn: "Rentekostnader",
    klasse: "Finansposter",
    klasseNummer: 8,
    inngaendeBalanse: 0,
    debet: 8500,
    kredit: 0,
    utgaendeBalanse: 8500,
    transaksjoner: [
      { id: "t60", dato: "2025-12-31", bilagsnummer: "B-2025-0997", beskrivelse: "Renter kassakreditt des", debet: 4250, kredit: 0, motpart: "1920" },
      { id: "t61", dato: "2026-01-31", bilagsnummer: "B-2026-0029b", beskrivelse: "Renter kassakreditt jan", debet: 4250, kredit: 0, motpart: "1920" },
    ]
  },
];
