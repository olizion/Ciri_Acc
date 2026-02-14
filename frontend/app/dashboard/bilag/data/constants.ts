import {
  FileTextIcon,
  ReceiptIcon,
  FileSpreadsheetIcon,
  BanknoteIcon,
  CreditCardIcon,
  BuildingIcon,
  TruckIcon,
  CheckCircle2Icon,
  ClockIcon,
  AlertCircleIcon,
  ArchiveIcon,
  LinkIcon,
} from "lucide-react";
import type { BilagType, BilagStatus } from "../types";

// Common Norwegian account codes
export const accountCodes = [
  { code: "1200", name: "Maskiner og anlegg" },
  { code: "1280", name: "Kontormaskiner" },
  { code: "6300", name: "Leie lokaler" },
  { code: "6500", name: "Leie/lisens EDB-utstyr" },
  { code: "6540", name: "Programvare" },
  { code: "6800", name: "Kontorrekvisita" },
  { code: "6900", name: "Telefon" },
  { code: "7100", name: "Bilkostnader" },
  { code: "7140", name: "Reisekostnader" },
  { code: "7350", name: "Representasjon" },
  { code: "7500", name: "Forsikringer" },
];

// MVA codes (Norwegian VAT codes for accounting)
export const mvaCodes = [
  { code: "0", name: "Ingen MVA-behandling", rate: 0, forForeign: true },
  { code: "1", name: "Inngående MVA, høy sats", rate: 25, forForeign: false },
  { code: "3", name: "Utgående MVA, høy sats 25%", rate: 25, forForeign: false },
  { code: "11", name: "Inngående MVA, middels sats 15%", rate: 15, forForeign: false },
  { code: "13", name: "Inngående MVA, lav sats 12%", rate: 12, forForeign: false },
  { code: "14", name: "Fradrag innførsel varer, høy sats", rate: 25, forForeign: true },
  { code: "15", name: "Fradrag innførsel varer, middels sats", rate: 15, forForeign: true },
  { code: "6", name: "MVA-fritatt", rate: 0, forForeign: false },
  { code: "31", name: "Utgående MVA, mat 15%", rate: 15, forForeign: false },
  { code: "32", name: "Utgående MVA, transport 12%", rate: 12, forForeign: false },
  { code: "81", name: "Kjøp varer fra utlandet (snudd avg.)", rate: 0, forForeign: true },
  { code: "86", name: "Kjøp tjenester fra utlandet (snudd avg.)", rate: 0, forForeign: true },
  { code: "91", name: "Import av varer, høy sats", rate: 25, forForeign: true },
];

// Bilag type configuration
export const bilagTypeConfig: Record<BilagType, { label: string; icon: typeof FileTextIcon; color: string }> = {
  inngaende_faktura: { label: "Inngående faktura", icon: ReceiptIcon, color: "text-blue-600" },
  utgaende_faktura: { label: "Utgående faktura", icon: FileSpreadsheetIcon, color: "text-green-600" },
  kvittering: { label: "Kvittering", icon: BanknoteIcon, color: "text-amber-600" },
  kreditnota: { label: "Kreditnota", icon: CreditCardIcon, color: "text-red-500" },
  bankbilag: { label: "Bankbilag", icon: BuildingIcon, color: "text-purple-600" },
  lønnsbilag: { label: "Lønnsbilag", icon: FileTextIcon, color: "text-indigo-600" },
  reiseregning: { label: "Reiseregning", icon: TruckIcon, color: "text-cyan-600" },
  kontantbilag: { label: "Kontantbilag", icon: BanknoteIcon, color: "text-emerald-600" }
};

export const statusConfig: Record<BilagStatus, { label: string; description: string; icon: typeof CheckCircle2Icon; className: string }> = {
  bokfort: {
    label: "Bokført",
    description: "Bilaget er fullstendig behandlet og bokført i regnskapet.",
    icon: CheckCircle2Icon,
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
  },
  venter: {
    label: "Venter godkjenning",
    description: "Ciri har fylt ut alle felt, men trenger din bekreftelse før bokføring.",
    icon: ClockIcon,
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
  },
  venter_transaksjon: {
    label: "Venter på transaksjon",
    description: "Bilaget er klart, men venter på å bli koblet til en banktransaksjon.",
    icon: LinkIcon,
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
  },
  trenger_gjennomgang: {
    label: "Trenger gjennomgang",
    description: "Ciri klarte ikke å fylle ut alle påkrevde felt. Du må fullføre registreringen.",
    icon: AlertCircleIcon,
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"
  },
  arkivert: {
    label: "Arkivert",
    description: "Bilaget er arkivert og oppbevares i henhold til Bokføringsloven.",
    icon: ArchiveIcon,
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400"
  }
};
