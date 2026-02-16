"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  SearchIcon,
  BookOpenIcon,
  BrainCircuitIcon,
  LandmarkIcon,
  ReceiptIcon,
  CalculatorIcon,
  UsersIcon,
  FileBarChartIcon,
  MailIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  HashIcon,
  ArrowUpIcon,
  CheckIcon,
  ZapIcon,
  LinkIcon,
  ArrowRightIcon,
  CpuIcon,
  ArrowDownIcon,
  type LucideIcon,
} from "lucide-react";
import MarketingNav from "@/components/marketing/marketing-nav";
import MarketingFooter from "@/components/marketing/marketing-footer";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface DocSection {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  subsections: DocSubsection[];
}

interface DocSubsection {
  id: string;
  title: string;
  content: React.ReactNode;
}

// ============================================================================
// STEP COMPONENT — numbered walkthrough steps
// ============================================================================

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative flex gap-5 py-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3E715C] text-xs font-bold text-white shadow-sm shadow-[#3E715C]/20">
          {number}
        </div>
        <div className="mt-2 flex-1 w-px bg-gradient-to-b from-[#3E715C]/20 to-transparent group-last:hidden" />
      </div>
      <div className="flex-1 pb-6">
        <h4 className="text-[15px] font-semibold text-[#1a2e23]">{title}</h4>
        <div className="mt-2 text-[13px] leading-relaxed text-[#4a5e52]">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TIP / NOTE / WARNING CALLOUTS
// ============================================================================

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 flex gap-3 rounded-xl border border-[#3E715C]/15 bg-[#3E715C]/[0.03] px-4 py-3">
      <ZapIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#5B906F]" />
      <div className="text-[13px] leading-relaxed text-[#4a5e52]">{children}</div>
    </div>
  );
}

function KeyboardShortcut({ keys }: { keys: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.split("+").map((key, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-0.5 text-[#8a9a8e]">+</span>}
          <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-[#d4dbd6] bg-[#f5f7f2] px-1.5 font-mono text-[10px] font-medium text-[#4a5e52]">
            {key}
          </kbd>
        </span>
      ))}
    </span>
  );
}

function PathBreadcrumb({ path }: { path: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[#f5f7f2] px-2 py-0.5 font-mono text-[11px] text-[#3E715C]">
      {path}
    </span>
  );
}

// ============================================================================
// SCHEMATIC COMPONENTS — visual diagrams for technical docs
// ============================================================================

function FlowStep({
  label,
  detail,
  active,
  last,
}: {
  label: string;
  detail?: string;
  active?: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "flex min-h-[52px] w-full items-center justify-center rounded-xl border px-3 py-2.5 text-center text-[11px] font-semibold leading-tight transition-colors sm:text-[12px]",
          active
            ? "border-[#3E715C]/30 bg-[#3E715C]/10 text-[#3E715C]"
            : "border-[#d4dbd6] bg-[#f5f7f2]/60 text-[#1a2e23]"
        )}
      >
        <div>
          {label}
          {detail && (
            <p className="mt-0.5 text-[10px] font-normal text-[#8a9a8e]">
              {detail}
            </p>
          )}
        </div>
      </div>
      {!last && (
        <ArrowDownIcon className="my-1.5 h-3.5 w-3.5 text-[#8a9a8e]" />
      )}
    </div>
  );
}

function WeightBar({
  label,
  weight,
  description,
}: {
  label: string;
  weight: number;
  description: string;
}) {
  const pct = Math.round(weight * 100);
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[12px] font-semibold text-[#1a2e23]">
            {label}
          </span>
          <span className="shrink-0 text-[11px] font-bold tabular-nums text-[#3E715C]">
            {pct}%
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#e8ede9]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#3E715C] to-[#5B906F]"
            style={{ width: `${Math.min(pct * 2.85, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-[#8a9a8e]">{description}</p>
      </div>
    </div>
  );
}

function ScoreExample({
  title,
  items,
  total,
  level,
}: {
  title: string;
  items: { label: string; score: string; hit: boolean }[];
  total: string;
  level: "HIGH" | "MEDIUM" | "LOW";
}) {
  const levelColors = {
    HIGH: "bg-[#3E715C] text-white",
    MEDIUM: "bg-amber-100 text-amber-700",
    LOW: "bg-red-50 text-red-600",
  };
  const levelLabels = { HIGH: "HOY", MEDIUM: "MEDIUM", LOW: "LAV" };
  return (
    <div className="rounded-xl border border-[#d4dbd6] bg-white p-4">
      <p className="text-[12px] font-semibold text-[#1a2e23]">{title}</p>
      <div className="mt-3 space-y-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between text-[11px]"
          >
            <span className="flex items-center gap-1.5 text-[#4a5e52]">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  item.hit ? "bg-[#3E715C]" : "bg-[#d4dbd6]"
                )}
              />
              {item.label}
            </span>
            <span
              className={cn(
                "font-mono tabular-nums",
                item.hit ? "font-semibold text-[#3E715C]" : "text-[#8a9a8e]"
              )}
            >
              {item.score}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#d4dbd6] pt-2.5">
        <span className="text-[11px] font-semibold text-[#1a2e23]">
          Total
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] font-bold text-[#1a2e23]">
            {total}
          </span>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-bold",
              levelColors[level]
            )}
          >
            {levelLabels[level]}
          </span>
        </div>
      </div>
    </div>
  );
}

function AutonomyCell({
  mode,
  color,
}: {
  mode: "auto" | "suggest";
  color?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg px-2 py-1.5 text-[10px] font-bold",
        mode === "auto"
          ? "bg-[#3E715C]/10 text-[#3E715C]"
          : "bg-[#f5f7f2] text-[#8a9a8e]"
      )}
    >
      {mode === "auto" ? "AUTO" : "Foreslå"}
    </div>
  );
}

// ============================================================================
// SECTION DATA — all documentation content
// ============================================================================

const DOC_SECTIONS: DocSection[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // KOM I GANG
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "kom-i-gang",
    title: "Kom i gang",
    icon: BookOpenIcon,
    description: "Opprett konto, koble bank og send ditt forste bilag pa under 5 minutter.",
    subsections: [
      {
        id: "opprett-konto",
        title: "Opprett konto",
        content: (
          <>
            <p>
              Ga til <PathBreadcrumb path="ciri.no/register" /> og opprett en gratis
              konto. Du trenger bare e-post og et passord.
            </p>
            <Step number={1} title="Registrer deg">
              Fyll inn firmanavn, organisasjonsnummer og e-postadresse. Du
              far en bekreftelseslenke pa e-post.
            </Step>
            <Step number={2} title="Bekreft e-postadressen">
              Klikk pa lenken i e-posten. Du blir sendt rett til dashboardet.
            </Step>
            <Step number={3} title="Fullfør oppsett">
              Ciri guider deg gjennom de forste stegene: velg kontoplan, sett
              regnskapsår og legg inn bankdetaljer.
            </Step>
            <Tip>
              Du kan hoppe over bankoppsett og komme tilbake senere. Alt kan
              endres under <PathBreadcrumb path="Innstillinger" />.
            </Tip>
          </>
        ),
      },
      {
        id: "koble-bank",
        title: "Koble til banken din",
        content: (
          <>
            <p>
              Koble til banken din for automatisk import av transaksjoner og
              smart matching mot bilag.
            </p>
            <Step number={1} title="Gå til bankoversikten">
              Apne <PathBreadcrumb path="Bank → Koble til bank" /> fra
              sidemenyen.
            </Step>
            <Step number={2} title="Velg banken din">
              Ciri stotter alle norske banker gjennom Tink. Velg din bank fra
              listen og logg inn med BankID.
            </Step>
            <Step number={3} title="Godkjenn tilgang">
              Gi Ciri lesetilgang til kontoen. Vi kan aldri flytte penger —
              kun lese transaksjoner.
            </Step>
            <Step number={4} title="Transaksjoner importeres">
              Historiske transaksjoner (inntil 12 maneder) hentes automatisk.
              Nye transaksjoner synkroniseres fortlopende.
            </Step>
            <Tip>
              Du kan koble til flere bankkontoer. Alle vises samlet under{" "}
              <PathBreadcrumb path="Bank → Transaksjoner" />.
            </Tip>
          </>
        ),
      },
      {
        id: "forste-bilag",
        title: "Send ditt forste bilag",
        content: (
          <>
            <p>
              Et bilag er dokumentasjonen bak en transaksjon — en faktura,
              kvittering eller kreditnota.
            </p>
            <Step number={1} title="Last opp bilaget">
              Ga til <PathBreadcrumb path="Regnskap → Bilag" /> og klikk{" "}
              <strong>+ Nytt bilag</strong>. Dra inn en PDF, et bilde, eller ta
              bilde direkte fra mobilen.
            </Step>
            <Step number={2} title="Ciri leser innholdet">
              AI-en skanner bilaget med OCR og trekker ut leverandor, belop,
              MVA, dato og KID-nummer automatisk.
            </Step>
            <Step number={3} title="Kontroller og godkjenn">
              Sjekk at feltene stemmer. Ciri foreslår konto basert pa
              leverandor og historikk — du kan overstyre.
            </Step>
            <Step number={4} title="Bokfor">
              Klikk <strong>Bokfor</strong>. Posteringen opprettes, MVA
              beregnes, og bilaget matches mot banktransaksjoner.
            </Step>
            <Tip>
              Etter 3–5 bilag fra samme leverandor foreslår Ciri riktig konto
              automatisk med 97% noyaktighet.
            </Tip>
          </>
        ),
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BOKFORING
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "bokforing",
    title: "Bokforing",
    icon: BrainCircuitIcon,
    description: "AI-drevet bokforing med OCR, smart kontering og automatisk matching.",
    subsections: [
      {
        id: "hva-er-bokforing",
        title: "Hva er bokforing?",
        content: (
          <>
            <p>
              <strong>Bokforing</strong> er den lovpålagte registreringen av alle
              okonomiske hendelser i en bedrift — hvert kjop, salg, lonnsutbetaling
              og banktransaksjon. I Norge reguleres dette av{" "}
              <strong>Bokforingsloven</strong> (2004), som stiller krav til
              dokumentasjon, oppbevaring og sporbarhet.
            </p>
            <div className="my-4 space-y-2">
              {[
                { term: "Bilag", def: "Dokumentasjonen bak en transaksjon — faktura, kvittering, kreditnota eller bankbilag. Hvert bilag far et unikt nummer." },
                { term: "Postering", def: "En enkelt debet- eller kreditføring i hovedboken. Hver transaksjon genererer minst to posteringer (dobbelt bokholderi)." },
                { term: "Kontoplan", def: "Systemet av nummererte kontoer som organiserer alle posteringer. Ciri bruker NS 4102 (Norsk Standard)." },
                { term: "Hovedbok", def: "Den komplette oversikten over alle posteringer, gruppert etter konto. Hovedboken er grunnlaget for alle rapporter." },
                { term: "Dobbelt bokholderi", def: "Prinsippet om at hvert belop registreres to steder — en debetkonto og en kreditkonto. Sikrer at regnskapet alltid er i balanse." },
              ].map((item) => (
                <div key={item.term} className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#1a2e23]">{item.term}</p>
                  <p className="text-[11px] text-[#8a9a8e]">{item.def}</p>
                </div>
              ))}
            </div>
            <Tip>
              Ifølge Bokforingsloven skal alle bilag oppbevares i minst 5 ar.
              Ciri lagrer alt digitalt med full sporbarhet fra rapport til
              originalbilag.
            </Tip>
          </>
        ),
      },
      {
        id: "ciri-bokforing",
        title: "Slik automatiserer Ciri bokforingen",
        content: (
          <>
            <p>
              Tradisjonell bokforing krever at du manuelt registrerer hvert bilag,
              velger riktig konto og kontrollerer MVA. Ciri automatiserer hele
              denne prosessen:
            </p>
            <Step number={1} title="Bilag mottas automatisk">
              Ciri henter fakturaer fra e-post, eller du laster opp manuelt.
              Bilaget far automatisk et unikt bilagsnummer.
            </Step>
            <Step number={2} title="AI leser og forstår innholdet">
              AI Vision (OCR) trekker ut leverandor, belop, MVA-sats, dato,
              KID-nummer og beskrivelse — selv fra dårlige skanninger og
              handskrevne kvitteringer.
            </Step>
            <Step number={3} title="Intelligent kontoforslag">
              Basert pa leverandor, belopsstorrelse og historikk foreslår Ciri
              riktig konto med en konfidensscoring. Etter noen korrigeringer
              laerer systemet dine preferanser.
            </Step>
            <Step number={4} title="Automatisk postering">
              Nar konfidensen er hoy nok (≥ 90%), opprettes posteringene
              automatisk — debet og kredit i riktige kontoer, med korrekt
              MVA-beregning.
            </Step>
            <Step number={5} title="Matching mot bank">
              Bilaget matches automatisk mot banktransaksjoner basert pa belop,
              dato, referanse og leverandornavn.
            </Step>
            <Tip>
              I <strong>Autonom modus</strong> handterer Ciri hele kjeden uten
              brukerinteraksjon. I <strong>Assistent modus</strong> foreslår den
              alt, men venter pa din godkjenning for usikre poster.
            </Tip>
          </>
        ),
      },
      {
        id: "bilag-typer",
        title: "Bilagstyper",
        content: (
          <>
            <p>Ciri stotter alle norske bilagstyper iht. Bokforingsloven:</p>
            <div className="my-4 grid grid-cols-2 gap-2">
              {[
                { type: "Inngaende faktura", desc: "Fakturaer du mottar fra leverandorer" },
                { type: "Utgaende faktura", desc: "Fakturaer du sender til kunder" },
                { type: "Kvittering", desc: "Kvitteringer for smainnkjop" },
                { type: "Kreditnota", desc: "Kreditering av faktura" },
                { type: "Bankbilag", desc: "Kontoutskrifter fra banken" },
                { type: "Lonnsbilag", desc: "Lonnslipper og lonnsdata" },
                { type: "Reiseregning", desc: "Reise- og diettutgifter" },
                { type: "Kontantbilag", desc: "Kontantkjop og -salg" },
              ].map((item) => (
                <div
                  key={item.type}
                  className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2"
                >
                  <p className="text-[12px] font-semibold text-[#1a2e23]">
                    {item.type}
                  </p>
                  <p className="text-[11px] text-[#8a9a8e]">{item.desc}</p>
                </div>
              ))}
            </div>
          </>
        ),
      },
      {
        id: "ai-kontering",
        title: "AI-kontering",
        content: (
          <>
            <p>
              Ciri bruker AI til a foreslå riktig konto, avdeling og prosjekt
              for hvert bilag. Systemet laerer av dine valg over tid.
            </p>
            <Step number={1} title="OCR-gjenkjenning">
              AI Vision leser alle formater — PDF, bilder, skanninger. Selv
              handskrevne kvitteringer og utenlandske fakturaer.
            </Step>
            <Step number={2} title="Feltekstraksjon">
              Leverandor, belop, MVA-sats, KID, forfallsdato og valuta
              trekkes ut automatisk.
            </Step>
            <Step number={3} title="Kontoforslag">
              Basert pa leverandor, belop og beskrivelse foreslår Ciri riktig
              konto med en konfidensscoring (f.eks. 94% sikker).
            </Step>
            <Step number={4} title="Laering over tid">
              Hver gang du godkjenner eller endrer en kontering, laerer Ciri.
              Etter noen uker gjor den alt automatisk.
            </Step>
            <Tip>
              Under <PathBreadcrumb path="Bank → Regler" /> kan du opprette
              faste konteringsregler — f.eks.{" "}
              <em>&ldquo;Telenor = konto 6900&rdquo;</em>.
            </Tip>
          </>
        ),
      },
      {
        id: "hovedbok",
        title: "Hovedbok og kontoplan",
        content: (
          <>
            <p>
              Hovedboken er hjertet av regnskapet. Her ser du alle posteringer
              gruppert etter konto.
            </p>
            <p className="mt-3">
              Ga til <PathBreadcrumb path="Regnskap → Hovedbok" /> for a se
              saldo pa alle kontoer. Klikk pa en konto for a se alle
              posteringer.
            </p>
            <p className="mt-3">
              Ciri bruker <strong>NS 4102</strong> (Norsk Standard Kontoplan)
              som standard. Du kan legge til egne kontoer uten a bryte
              standarden.
            </p>
            <Tip>
              Klikk pa et belop i hovedboken for a hoppe rett til
              originalbilag. Full sporbarhet fra rapport til dokument.
            </Tip>
          </>
        ),
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // BANK
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "bank",
    title: "Bank og transaksjoner",
    icon: LandmarkIcon,
    description: "Importer transaksjoner, match mot bilag og opprett regler.",
    subsections: [
      {
        id: "hva-er-bankavstemming",
        title: "Hva er bankavstemming?",
        content: (
          <>
            <p>
              <strong>Bankavstemming</strong> er prosessen der du kontrollerer at
              banktransaksjonene dine stemmer overens med det som er bokfort i
              regnskapet. Det er en av de viktigste kontrollrutinene for a sikre
              at regnskapet er komplett og korrekt.
            </p>
            <div className="my-4 space-y-2">
              {[
                { term: "Transaksjon", def: "En enkelt pengebevegelse pa bankkontoen — innbetaling, utbetaling, overforing eller gebyr." },
                { term: "Matching", def: "A koble en banktransaksjon til riktig bilag i regnskapet. Nar de matcher, er transaksjonen avstemt." },
                { term: "KID-nummer", def: "Kundeidentifikasjonsnummer — en strukturert betalingsreferanse som gjor det enkelt a identifisere hvilken faktura en betaling gjelder." },
                { term: "Privat transaksjon", def: "Personlige kjop pa firmakonto (f.eks. dagligvare) som ikke er fradragsberettiget. Disse markeres som private og holdes utenfor regnskapet." },
              ].map((item) => (
                <div key={item.term} className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#1a2e23]">{item.term}</p>
                  <p className="text-[11px] text-[#8a9a8e]">{item.def}</p>
                </div>
              ))}
            </div>
            <p className="mt-3">
              Uten bankavstemming risikerer du manglende bilag, doble
              posteringer og feil i MVA-oppgjoret. De fleste regnskapsforere
              bruker timer pa dette — Ciri gjor det pa sekunder.
            </p>
          </>
        ),
      },
      {
        id: "ciri-bank",
        title: "Slik automatiserer Ciri bankavstemmingen",
        content: (
          <>
            <p>
              Ciri kobler seg til banken din via Tink og henter transaksjoner
              automatisk. Deretter bruker den en multi-faktor matchingalgoritme
              for a koble transaksjoner til bilag.
            </p>
            <Step number={1} title="Automatisk import">
              Transaksjoner hentes fortlopende fra banken. Historikk opptil 12
              maneder importeres ved forste tilkobling.
            </Step>
            <Step number={2} title="Intelligent matching">
              Hver transaksjon scores mot alle uposterte bilag pa seks faktorer:
              belop, referanse/KID, beloptoleranse, leverandornavn, dato og
              historiske monstre. Resultatet er en konfidensscoring fra 0–100%.
            </Step>
            <Step number={3} title="Regelbasert håndtering">
              Gjentakende transaksjoner (f.eks. Spotify, kontorleie) handteres
              av laerte regler — automatisk kategorisert eller ignorert uten
              brukerinteraksjon.
            </Step>
            <Step number={4} title="Automatisk bekreftelse">
              Avhengig av autonominiva bekreftes matcher automatisk. I Autonom
              modus handteres alt med medium til hoy konfidens uten din
              involvering.
            </Step>
            <Tip>
              Ciri laerer av dine korrigeringer. Nar du markerer en transaksjon
              som privat eller endrer en match, opprettes automatisk en regel
              som gjor at lignende transaksjoner handteres riktig neste gang.
            </Tip>
          </>
        ),
      },
      {
        id: "transaksjoner",
        title: "Transaksjoner",
        content: (
          <>
            <p>
              Under <PathBreadcrumb path="Bank → Transaksjoner" /> ser du alle
              importerte banktransaksjoner med status, kategori og
              matching-status.
            </p>
            <p className="mt-3">Hver transaksjon har en av disse statusene:</p>
            <div className="my-3 space-y-1.5">
              {[
                { status: "Postert", color: "bg-[#3E715C]", desc: "Bokfort og ferdig" },
                { status: "Venter", color: "bg-amber-400", desc: "Venter pa bilag eller godkjenning" },
                { status: "Mangler bilag", color: "bg-red-400", desc: "Transaksjon uten tilhorende bilag" },
                { status: "Trenger kategori", color: "bg-[#8a9a8e]", desc: "Ikke kategorisert enna" },
              ].map((item) => (
                <div key={item.status} className="flex items-center gap-2.5">
                  <div className={cn("h-2 w-2 rounded-full", item.color)} />
                  <span className="text-[12px] font-medium text-[#1a2e23] w-32">
                    {item.status}
                  </span>
                  <span className="text-[12px] text-[#8a9a8e]">{item.desc}</span>
                </div>
              ))}
            </div>
            <Tip>
              Bruk filteret øverst for a vise kun transaksjoner som mangler
              bilag — det er den raskeste veien til et ferdig regnskap.
            </Tip>
          </>
        ),
      },
      {
        id: "avstemming",
        title: "Bankavstemming",
        content: (
          <>
            <p>
              Bankavstemming matcher banktransaksjoner mot bilag i regnskapet.
              Ciri gjor dette automatisk for deg.
            </p>
            <Step number={1} title="Ga til avstemming">
              Apne <PathBreadcrumb path="Bank → Avstemming" />.
            </Step>
            <Step number={2} title="Se foreslåtte matcher">
              Ciri foreslår matcher basert pa belop, dato og leverandor.
              Gronne rader betyr treff.
            </Step>
            <Step number={3} title="Godkjenn eller korriger">
              Godkjenn korrekte matcher med ett klikk. Feil matcher kan
              avvises og kobles manuelt.
            </Step>
            <Tip>
              Hvis en transaksjon ikke har et tilhorende bilag, kan du
              opprette ett direkte fra avstemmingssiden.
            </Tip>
          </>
        ),
      },
      {
        id: "bank-regler",
        title: "Transaksjonsregler",
        content: (
          <>
            <p>
              Under <PathBreadcrumb path="Bank → Regler" /> kan du opprette
              automatiske regler for transaksjoner.
            </p>
            <p className="mt-3">Regeltyper:</p>
            <div className="my-3 space-y-2">
              {[
                { type: "Auto-kategorisering", desc: "Sett kategori automatisk basert pa avsender eller beskrivelse" },
                { type: "Auto-matching", desc: "Match automatisk med bilag fra spesifikk leverandor" },
                { type: "Ignorer", desc: "Marker transaksjoner som irrelevante (f.eks. interne overforsler)" },
                { type: "Splitt", desc: "Del opp en transaksjon i flere posteringer" },
              ].map((item) => (
                <div key={item.type} className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#1a2e23]">{item.type}</p>
                  <p className="text-[11px] text-[#8a9a8e]">{item.desc}</p>
                </div>
              ))}
            </div>
          </>
        ),
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // FAKTURA
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "faktura",
    title: "Faktura",
    icon: ReceiptIcon,
    description: "Opprett, send og spor profesjonelle fakturaer med automatisk purring.",
    subsections: [
      {
        id: "hva-er-faktura",
        title: "Hva er en faktura?",
        content: (
          <>
            <p>
              En <strong>faktura</strong> er et betalingskrav du sender til en
              kunde for varer eller tjenester. I Norge stiller Bokforingsloven
              krav til hva en faktura ma inneholde for a vaere gyldig.
            </p>
            <div className="my-4 space-y-2">
              {[
                { term: "Fakturanummer", def: "Et unikt, lopende nummer som identifiserer fakturaen. Ma vaere fortlopende uten hull i nummerserien." },
                { term: "KID-nummer", def: "Kundeidentifikasjon som gjor at innbetalingen automatisk kan kobles til riktig faktura i banken." },
                { term: "Forfallsdato", def: "Datoen kunden ma betale innen. Standard i Norge er 14 eller 30 dager." },
                { term: "MVA-spesifikasjon", def: "Fakturaen ma vise MVA-belop og -sats separat. For MVA-registrerte bedrifter er dette lovpalagt." },
                { term: "Organisasjonsnummer", def: "Bade avsenders og mottakers org.nr. ma fremga av fakturaen." },
                { term: "Purring", def: "En paminnelse som sendes nar forfallsdatoen er passert. Etter norsk lov kan du legge pa purregebyr etter 14 dagers varsel." },
              ].map((item) => (
                <div key={item.term} className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#1a2e23]">{item.term}</p>
                  <p className="text-[11px] text-[#8a9a8e]">{item.def}</p>
                </div>
              ))}
            </div>
          </>
        ),
      },
      {
        id: "ciri-faktura",
        title: "Slik automatiserer Ciri fakturering",
        content: (
          <>
            <p>
              Ciri handterer hele fakturaens livssyklus — fra opprettelse til
              innbetaling er registrert i regnskapet.
            </p>
            <Step number={1} title="Automatisk nummerering og KID">
              Fakturanummer tildeles fortlopende. KID-nummer genereres
              automatisk for sikker identifisering av innbetalinger.
            </Step>
            <Step number={2} title="MVA beregnes riktig">
              Basert pa produkttype og kundens MVA-status velger Ciri riktig
              sats (25%, 15%, 12% eller 0%). Snudd avregning handteres
              automatisk for utenlandske kunder.
            </Step>
            <Step number={3} title="Sending og sporing">
              Fakturaen sendes via e-post med unik lenke. Du ser nar kunden
              apner den, og statusen oppdateres automatisk.
            </Step>
            <Step number={4} title="Automatisk purring">
              Nar forfallsdatoen passeres, sender Ciri purring automatisk
              (hvis aktivert). Du kan ogsa sende manuelt med ett klikk.
            </Step>
            <Step number={5} title="Innbetaling registreres">
              Nar betalingen kommer inn pa bankkontoen, matcher Ciri den mot
              fakturaen via KID-nummeret og markerer den som betalt.
            </Step>
            <Tip>
              Kunder kan se og betale fakturaen via en offentlig lenke — ingen
              innlogging kreves. Lenken viser fakturadetaljer, betalingsstatus
              og betalingsinformasjon.
            </Tip>
          </>
        ),
      },
      {
        id: "opprett-faktura",
        title: "Opprett faktura",
        content: (
          <>
            <Step number={1} title="Ny faktura">
              Ga til <PathBreadcrumb path="Bank → Faktura" /> og klikk{" "}
              <strong>+ Ny faktura</strong>.
            </Step>
            <Step number={2} title="Fyll inn kunde og linjer">
              Velg kunde (eller opprett ny), legg til linjer med beskrivelse,
              antall, pris og MVA-sats. Ciri foreslår MVA basert pa
              produkttype.
            </Step>
            <Step number={3} title="Forhåndsvis">
              Se PDF-forhandsvisning for du sender. Fakturaen far automatisk
              fakturanummer, KID-nummer og forfallsdato.
            </Step>
            <Step number={4} title="Send">
              Send via e-post direkte fra Ciri, eller last ned PDF for
              manuell utsendelse.
            </Step>
            <Tip>
              Fakturaer far automatisk statussporing: <em>Sendt → Sett → Betalt</em>.
              Du kan sende purring med ett klikk.
            </Tip>
          </>
        ),
      },
      {
        id: "faktura-sporing",
        title: "Sporing og purring",
        content: (
          <>
            <p>
              Alle utgående fakturaer spores automatisk med tidslinje:
            </p>
            <div className="my-4 flex items-center gap-2">
              {["Opprettet", "Sendt", "Sett", "Betalt"].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-full bg-[#3E715C]/10 px-2.5 py-1 text-[10px] font-medium text-[#3E715C]">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#3E715C]" />
                    {step}
                  </div>
                  {i < 3 && (
                    <ChevronRightIcon className="h-3 w-3 text-[#d4dbd6]" />
                  )}
                </div>
              ))}
            </div>
            <p>
              Hvis en faktura ikke er betalt innen forfallsdato, kan du sende
              automatisk purring via <strong>Send påminnelse</strong>-knappen.
            </p>
          </>
        ),
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // MVA
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "mva",
    title: "MVA-håndtering",
    icon: CalculatorIcon,
    description: "Automatisk MVA-beregning, fradragsveiviser og rapportering til Skatteetaten.",
    subsections: [
      {
        id: "hva-er-mva",
        title: "Hva er MVA?",
        content: (
          <>
            <p>
              <strong>Merverdiavgift (MVA)</strong> er en avgift pa omsetning av
              varer og tjenester i Norge. Som naringsdrivende fungerer du som
              innkrever for staten — du legger MVA pa salget ditt og trekker fra
              MVA pa innkjopene dine.
            </p>
            <div className="my-4 space-y-2">
              {[
                { term: "Utgaende MVA", def: "MVA du legger pa nar du selger varer eller tjenester. Dette skylder du staten." },
                { term: "Inngaende MVA", def: "MVA du betaler nar du kjoper varer eller tjenester til bedriften. Dette far du tilbake fra staten (fradrag)." },
                { term: "MVA-oppgjor", def: "Differansen mellom utgaende og inngaende MVA. Er utgaende storst, betaler du differansen til Skatteetaten." },
                { term: "MVA-termin", def: "Perioden du rapporterer for. De fleste sma bedrifter rapporterer annenhver maned (6 terminer per ar)." },
                { term: "Snudd avregning", def: "Nar du kjoper tjenester fra utlandet, ma du selv beregne og rapportere MVA (reverse charge)." },
              ].map((item) => (
                <div key={item.term} className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#1a2e23]">{item.term}</p>
                  <p className="text-[11px] text-[#8a9a8e]">{item.def}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 font-semibold text-[13px] text-[#1a2e23]">MVA-satser i Norge</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { rate: "25%", label: "Alminnelig sats", examples: "De fleste varer og tjenester" },
                { rate: "15%", label: "Naeringsmiddel", examples: "Mat og drikke (ikke alkohol)" },
                { rate: "12%", label: "Lav sats", examples: "Transport, kino, hotell, NRK" },
                { rate: "0%", label: "Fritatt", examples: "Eksport, helse, undervisning" },
              ].map((item) => (
                <div key={item.rate} className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-[#3E715C]">{item.rate}</p>
                  <p className="text-[11px] font-semibold text-[#1a2e23]">{item.label}</p>
                  <p className="mt-0.5 text-[10px] text-[#8a9a8e]">{item.examples}</p>
                </div>
              ))}
            </div>
          </>
        ),
      },
      {
        id: "ciri-mva",
        title: "Slik automatiserer Ciri MVA",
        content: (
          <>
            <p>
              MVA-handtering er en av de mest tidkrevende oppgavene i
              regnskapet. Ciri automatiserer hele prosessen fra beregning til
              innsending.
            </p>
            <Step number={1} title="Automatisk MVA-koding">
              Nar et bilag behandles, identifiserer Ciri riktig MVA-sats
              basert pa leverandor, varekategori og belopsstorrelse. Snudd
              avregning oppdages automatisk for utenlandske tjenester.
            </Step>
            <Step number={2} title="Lopende beregning">
              MVA-oppgjoret oppdateres i sanntid nar nye bilag bokfores. Du
              ser alltid gjeldende utgaende MVA, inngaende MVA og netto
              skyldig belop.
            </Step>
            <Step number={3} title="Fradragskontroll">
              Ciris interaktive fradragsveiviser hjelper deg a avgjore
              fradragsretten for tvilstilfeller — representasjon, bil,
              hjemmekontor og blandingsbruk.
            </Step>
            <Step number={4} title="Terminoversikt">
              Ved terminens slutt viser Ciri en komplett oppstilling med alle
              poster. Eventuelle avvik eller mangler flagges automatisk.
            </Step>
            <Step number={5} title="Innsending til Altinn">
              MVA-meldingen genereres i riktig XML-format og sendes direkte
              til Skatteetaten via Altinn. Du signerer med ID-porten.
            </Step>
            <Tip>
              I <strong>Autonom modus</strong> forbereder Ciri MVA-meldingen
              komplett — du trenger bare a signere. I{" "}
              <strong>Assistent modus</strong> gjennomgar du oppstillingen
              for innsending.
            </Tip>
          </>
        ),
      },
      {
        id: "mva-oversikt",
        title: "MVA-oversikt",
        content: (
          <>
            <p>
              Under <PathBreadcrumb path="Regnskap → MVA" /> ser du en oversikt
              over gjeldende og tidligere MVA-terminer, inkludert beregnet
              belop, fradrag og status.
            </p>
            <p className="mt-3">
              Ciri beregner automatisk utgaende og inngaende MVA fra
              bokforte poster. Du ser alltid oppdatert saldo.
            </p>
            <Tip>
              Klikk pa en termin for a se detaljert oppstilling av alle
              MVA-poster med lenke til originalbilag.
            </Tip>
          </>
        ),
      },
      {
        id: "fradragsveiviser",
        title: "Fradragsveiviser",
        content: (
          <>
            <p>
              Usikker pa om du har rett til MVA-fradrag? Bruk Ciris
              interaktive fradragsveiviser.
            </p>
            <Step number={1} title="Velg utgiftstype">
              Velg hva du har kjopt — f.eks. kontorutstyr, bil, mat,
              representasjon.
            </Step>
            <Step number={2} title="Svar pa spørsmål">
              Ciri stiller 2–3 sporsmal for a avgjore fradragsretten.
            </Step>
            <Step number={3} title="Få svar">
              Du far et klart svar med prosent fradrag og lovhenvisning.
            </Step>
          </>
        ),
      },
      {
        id: "mva-innsending",
        title: "Innsending til Skatteetaten",
        content: (
          <>
            <p>
              Nar en termin er klar, kan du sende MVA-meldingen direkte til
              Skatteetaten via Altinn-integrasjonen.
            </p>
            <Step number={1} title="Kontroller oppstillingen">
              Ga gjennom alle poster. Ciri markerer eventuelle avvik eller
              mangler.
            </Step>
            <Step number={2} title="Generer MVA-melding">
              Klikk <strong>Generer melding</strong>. Ciri lager XML i riktig
              format.
            </Step>
            <Step number={3} title="Send via Altinn">
              Klikk <strong>Send til Altinn</strong>. Du logger inn med ID-porten
              for a signere.
            </Step>
            <Tip>
              Du kan ogsa laste ned MVA-meldingen som PDF for arkivering
              eller revisjon.
            </Tip>
          </>
        ),
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // LONN
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "lonn",
    title: "Lonn og personal",
    icon: UsersIcon,
    description: "Lonnskjoring, skattekort, feriepenger og A-melding — alt pa ett sted.",
    subsections: [
      {
        id: "hva-er-lonn",
        title: "Hva er lonnskjoring?",
        content: (
          <>
            <p>
              <strong>Lonnskjoring</strong> er prosessen der du beregner og
              utbetaler lonn til ansatte, trekker skatt, og rapporterer til
              myndighetene. I Norge er dette strengt regulert med flere
              lovpaalagte krav.
            </p>
            <div className="my-4 space-y-2">
              {[
                { term: "Brutto lonn", def: "Det totale lonnsbelopet for den ansatte. Skattetrekk og andre trekk gjores fra dette belopet." },
                { term: "Skattetrekk", def: "Belop som trekkes fra brutto basert pa den ansattes skattekort. Arbeidsgiver er ansvarlig for a trekke riktig." },
                { term: "Arbeidsgiveravgift", def: "En avgift arbeidsgiver betaler til staten, typisk 14,1% av brutto lonn. Satsen varierer etter geografisk sone." },
                { term: "Feriepenger", def: "Opptjent feriepengetillegg (10,2% av feriepengegrunnlaget, 12% for ansatte over 60). Utbetales normalt i juni." },
                { term: "A-melding", def: "Manedlig rapport til Skatteetaten med opplysninger om lonn, skattetrekk og arbeidsgiveravgift for alle ansatte." },
                { term: "Skattekort", def: "Digitalt dokument fra Skatteetaten som angir hvor mye skatt som skal trekkes. Oppdateres arlig." },
              ].map((item) => (
                <div key={item.term} className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#1a2e23]">{item.term}</p>
                  <p className="text-[11px] text-[#8a9a8e]">{item.def}</p>
                </div>
              ))}
            </div>
            <Tip>
              A-meldingen ma sendes innen den 5. i maneden etter lønnsutbetaling.
              For sen innlevering kan medføre dagboter.
            </Tip>
          </>
        ),
      },
      {
        id: "ciri-lonn",
        title: "Slik automatiserer Ciri lonnskjoring",
        content: (
          <>
            <p>
              Lonnskjoring involverer mange beregninger og frister. Ciri
              automatiserer hele prosessen fra skattekort til A-melding.
            </p>
            <Step number={1} title="Skattekort hentes automatisk">
              Ciri henter digitale skattekort fra Skatteetaten for alle
              ansatte. Du far varsel hvis et skattekort endres midt i aret.
            </Step>
            <Step number={2} title="Beregning av alle trekk">
              Skattetrekk, arbeidsgiveravgift, feriepenger og eventuelle
              tillegg/trekk beregnes automatisk basert pa gjeldende satser
              og den ansattes lonn.
            </Step>
            <Step number={3} title="Lonnsslipper genereres">
              Hver ansatt far en detaljert lonnsslipp med brutto, alle trekk
              og netto utbetalt.
            </Step>
            <Step number={4} title="A-melding sendes">
              A-meldingen genereres automatisk med alle paalagte felter og
              sendes til Skatteetaten innen fristen.
            </Step>
            <Step number={5} title="Bokforing opprettes">
              Alle lonnsrelaterte posteringer — lonn, skattetrekk, AGA,
              feriepenger — bokfores automatisk pa riktige kontoer.
            </Step>
            <Tip>
              Ciri beregner lopende feriepengeavsetning gjennom aret, sa du
              alltid vet noyaktig hvor mye som er opptjent og avsatt.
            </Tip>
          </>
        ),
      },
      {
        id: "ansatte",
        title: "Administrer ansatte",
        content: (
          <>
            <p>
              Under <PathBreadcrumb path="Lonn" /> ser du alle ansatte med
              lonn, skattetrekk, feriepenger og status.
            </p>
            <Step number={1} title="Legg til ansatt">
              Klikk <strong>+ Ny ansatt</strong>. Fyll inn navn,
              personnummer, lonn og bankkontonummer.
            </Step>
            <Step number={2} title="Hent skattekort">
              Ciri henter skattekort automatisk fra Skatteetaten. Du far
              varsel hvis skattekortet endres.
            </Step>
            <Step number={3} title="Sett lønnsdetaljer">
              Velg ansettelsestype (heltid/deltid), sett brutto månedslönn,
              og definer feriedager.
            </Step>
          </>
        ),
      },
      {
        id: "lonnskjoring",
        title: "Kjor lonn",
        content: (
          <>
            <Step number={1} title="Start lonnskjoring">
              Ga til <PathBreadcrumb path="Lonn" /> og klikk{" "}
              <strong>Kjor lonn</strong>.
            </Step>
            <Step number={2} title="Kontroller">
              Se oversikt over brutto, skattetrekk, arbeidsgiveravgift og
              netto for hver ansatt. Korriger eventuelt tillegg eller
              trekk.
            </Step>
            <Step number={3} title="Godkjenn og betal">
              Godkjenn lonnskjoringen. Ciri genererer lonnsslipper og
              oppretter betalingsfiler.
            </Step>
            <Step number={4} title="A-melding sendes">
              A-meldingen genereres og sendes automatisk til Skatteetaten
              innen den 5. i neste maned.
            </Step>
          </>
        ),
      },
      {
        id: "feriepenger",
        title: "Feriepenger",
        content: (
          <>
            <p>
              Under <PathBreadcrumb path="Lonn → Feriepenger" /> administrerer
              du opptjening og utbetaling av feriepenger.
            </p>
            <p className="mt-3">
              Ciri beregner feriepenger automatisk basert pa ferieloven (10,2%
              av feriepengegrunnlaget, 12% for ansatte over 60 ar).
            </p>
            <Tip>
              Feriepenger utbetales normalt i juni. Ciri varsler deg nar det
              er tid for utbetaling og genererer korrekte posteringer.
            </Tip>
          </>
        ),
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // RAPPORTER
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "rapporter",
    title: "Rapporter",
    icon: FileBarChartIcon,
    description: "Resultatregnskap, balanse, arsoppgjor og SAF-T-eksport.",
    subsections: [
      {
        id: "hva-er-rapporter",
        title: "Norske rapporteringskrav",
        content: (
          <>
            <p>
              Norsk lov stiller krav til en rekke okonomiske rapporter. Disse
              brukes av bedriften selv, revisorer, skattemyndigheter og
              kreditorer.
            </p>
            <div className="my-4 space-y-2">
              {[
                { term: "Resultatregnskap", def: "Viser bedriftens inntekter og kostnader for en gitt periode. Bunnlinjen er arsresultatet — overskudd eller underskudd." },
                { term: "Balanse", def: "Viser hva bedriften eier (eiendeler), skylder (gjeld) og har igjen (egenkapital) per en gitt dato. Ma alltid vaere i balanse: eiendeler = gjeld + egenkapital." },
                { term: "Arsregnskap", def: "Den arlige rapporten med resultat, balanse, noter og eventuelt styrets beretning. Ma sendes til Bronnoysundregistrene." },
                { term: "Noter", def: "Tilleggsinformasjon til arsregnskapet som forklarer vesentlige poster — f.eks. regnskapsprinsipper, lonelofte og sikkerhetsstillelser." },
                { term: "SAF-T", def: "Standard Audit File — Tax. Et XML-format Skatteetaten krever ved bokettersyn. Inneholder hele kontoplanen, alle posteringer og kundedata." },
                { term: "Kontantstromoppstilling", def: "Viser hvordan penger har stromt inn og ut av bedriften, gruppert i drift, investering og finansiering." },
              ].map((item) => (
                <div key={item.term} className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#1a2e23]">{item.term}</p>
                  <p className="text-[11px] text-[#8a9a8e]">{item.def}</p>
                </div>
              ))}
            </div>
          </>
        ),
      },
      {
        id: "ciri-rapporter",
        title: "Slik genererer Ciri rapporter",
        content: (
          <>
            <p>
              Alle rapporter genereres automatisk fra bokforingsdataene dine —
              alltid oppdatert, alltid korrekte.
            </p>
            <Step number={1} title="Sanntidsoppdatering">
              Resultat og balanse oppdateres i sanntid nar nye posteringer
              bokfores. Du trenger aldri a &ldquo;kjore&rdquo; en rapport —
              den er alltid klar.
            </Step>
            <Step number={2} title="Drilldown til bilag">
              Alle tall er klikkbare. Klikk pa et belop for a se
              underliggende posteringer, og videre til originalbilag. Full
              sporbarhet fra rapport til dokument.
            </Step>
            <Step number={3} title="Arsregnskap med sjekkliste">
              Ved arsoppgjor viser Ciri en komplett sjekkliste: alle bilag
              matchet? Kontoer avstemt? MVA levert? Nar alt er klart,
              genereres arsregnskapet automatisk.
            </Step>
            <Step number={4} title="SAF-T pa ett klikk">
              SAF-T v1.30-filen genereres med alle pliktige felter og
              valideres automatisk mot Skatteetatens skjema for du laster
              ned.
            </Step>
            <Step number={5} title="PDF-eksport">
              Alle rapporter kan lastes ned som profesjonelle
              PDF-dokumenter, klare for revisor eller styret.
            </Step>
            <Tip>
              Gi revisoren din direkte lesetilgang i Ciri. Da kan de se
              rapporter, bilag og posteringer uten at du trenger a eksportere
              noe.
            </Tip>
          </>
        ),
      },
      {
        id: "resultat-balanse",
        title: "Resultat og balanse",
        content: (
          <>
            <p>
              Under <PathBreadcrumb path="Regnskap → Resultat" /> og{" "}
              <PathBreadcrumb path="Regnskap → Balanse" /> finner du sanntids
              oppstillinger.
            </p>
            <p className="mt-3">
              <strong>Resultatregnskapet</strong> viser inntekter og kostnader
              for valgt periode. Du kan velge manedlig, kvartalsvis eller arlig
              visning.
            </p>
            <p className="mt-3">
              <strong>Balansen</strong> viser eiendeler, gjeld og egenkapital
              per dato. Klikk pa en konto for a se alle posteringer.
            </p>
            <Tip>
              Alle tall er klikkbare — du kan drille ned fra rapport til
              konto til enkelbilag.
            </Tip>
          </>
        ),
      },
      {
        id: "arsoppgjor",
        title: "Arsoppgjor",
        content: (
          <>
            <p>
              Under <PathBreadcrumb path="Rapporter → Arsregnskap" /> finner
              du en komplett sjekkliste for arsoppgjor.
            </p>
            <Step number={1} title="Sjekkliste">
              Ciri viser en liste over alt som må vaere pa plass: alle
              fakturaer matchet, kontoer avstemt, MVA levert osv.
            </Step>
            <Step number={2} title="Generer rapport">
              Nar sjekklisten er komplett, genererer Ciri arsregnskapet med
              resultat, balanse, noter og kontantstrom.
            </Step>
            <Step number={3} title="Del med revisor">
              Eksporter som PDF eller gi revisor direkte tilgang i Ciri.
            </Step>
            <Step number={4} title="Send til Brønnøysund">
              Arsregnskapet sendes elektronisk til Bronnoysundregistrene.
            </Step>
          </>
        ),
      },
      {
        id: "saf-t",
        title: "SAF-T eksport",
        content: (
          <>
            <p>
              SAF-T (Standard Audit File — Tax) er et XML-format som
              Skatteetaten krever ved bokettersyn.
            </p>
            <Step number={1} title="Velg periode">
              Ga til MVA-siden og velg <strong>SAF-T eksport</strong>. Velg
              hele aret eller spesifikke perioder.
            </Step>
            <Step number={2} title="Generer filen">
              Ciri genererer SAF-T v1.30-filen med alle pliktige felter.
            </Step>
            <Step number={3} title="Validering">
              Filen valideres automatisk mot Skatteetatens skjema. Feil
              vises med forklaring.
            </Step>
            <Step number={4} title="Last ned">
              Last ned XML-filen og lever til Skatteetaten eller revisor.
            </Step>
          </>
        ),
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // E-POST AUTOMATISERING
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "e-post",
    title: "E-post automatisering",
    icon: MailIcon,
    description: "La Ciri hente fakturaer fra innboksen automatisk — ingen manuell opplasting.",
    subsections: [
      {
        id: "hva-er-e-post-automasjon",
        title: "Hvordan e-postautomatisering fungerer",
        content: (
          <>
            <p>
              De fleste fakturaer kommer inn via e-post. Tradisjonelt ma du
              apne hver e-post, laste ned vedlegget, og manuelt registrere
              bilaget i regnskapssystemet. Ciri automatiserer hele denne
              kjeden.
            </p>
            <div className="my-4 rounded-xl border border-[#d4dbd6] bg-[#f5f7f2]/50 p-4">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#8a9a8e]">
                Automatiseringskjeden
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {["E-post mottas", "Vedlegg identifisert", "OCR-analyse", "Bilag opprettet", "Kontoforslag", "Bokfort"].map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-full bg-[#3E715C]/10 px-2.5 py-1 text-[10px] font-medium text-[#3E715C]">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#3E715C]" />
                      {step}
                    </div>
                    {i < 5 && (
                      <ChevronRightIcon className="h-3 w-3 text-[#d4dbd6]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <p>
              Irrelevante e-poster (nyhetsbrev, reklame, bekreftelser) filtreres
              automatisk ut. Kun fakturaer, kvitteringer og kreditnotaer
              behandles.
            </p>
            <Tip>
              Ciri stotter bade Gmail og Outlook/Microsoft 365. Tilkoblingen
              bruker OAuth — Ciri far aldri tilgang til passordet ditt.
            </Tip>
          </>
        ),
      },
      {
        id: "koble-e-post",
        title: "Koble til e-postkonto",
        content: (
          <>
            <Step number={1} title="Ga til innstillinger">
              Apne <PathBreadcrumb path="System → E-post" />.
            </Step>
            <Step number={2} title="Velg leverandor">
              Koble til Google (Gmail) eller Microsoft (Outlook/365). Du
              logger inn via OAuth — Ciri lagrer aldri passordet ditt.
            </Step>
            <Step number={3} title="Velg mapper">
              Velg hvilke e-postmapper Ciri skal overvake. Standard er
              innboksen.
            </Step>
            <Step number={4} title="Aktiver overvaking">
              Sla pa automatisk overvakning. Ciri sjekker nye e-poster
              hvert 5. minutt.
            </Step>
          </>
        ),
      },
      {
        id: "automatisk-bilag",
        title: "Automatisk bilagsopprettelse",
        content: (
          <>
            <p>
              Nar Ciri finner en e-post med vedlegg (PDF-faktura, bilde),
              skjer folgende automatisk:
            </p>
            <Step number={1} title="Vedlegg oppdages">
              Ciri skanner vedlegget og vurderer om det er en faktura,
              kvittering eller irrelevant.
            </Step>
            <Step number={2} title="OCR og ekstraksjon">
              Relevante vedlegg behandles med AI Vision. Leverandor, belop
              og MVA trekkes ut.
            </Step>
            <Step number={3} title="Bilag opprettes">
              Et nytt bilag opprettes automatisk med foreslatt kontering.
              Du far varsel i dashboardet.
            </Step>
            <Tip>
              Irrelevante e-poster (nyhetsbrev, reklame) filtreres ut
              automatisk. Du kan justere filtreringen under innstillinger.
            </Tip>
          </>
        ),
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // SIKKERHET
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "sikkerhet",
    title: "Sikkerhet og GDPR",
    icon: ShieldCheckIcon,
    description: "Kryptering, tilgangskontroll, norsk datalagring og personvernrettigheter.",
    subsections: [
      {
        id: "hva-er-sikkerhet",
        title: "Sikkerhet i skybasert regnskap",
        content: (
          <>
            <p>
              Regnskapsdata er blant de mest sensitive opplysningene en bedrift
              har. Ciri er bygget med sikkerhet som forste prioritet — fra
              infrastruktur til brukergrensesnitt.
            </p>
            <div className="my-4 space-y-2">
              {[
                { term: "GDPR", def: "EUs personvernforordning som regulerer behandling av personopplysninger. Ciri overholder alle krav, inkludert rett til innsyn, sletting og portabilitet." },
                { term: "Bokforingsloven", def: "Stiller krav til oppbevaring av regnskapsdata i minimum 5 ar. Ciri sikrer lovpalagt oppbevaring med kryptert backup." },
                { term: "Norsk datalagring", def: "Alle data lagres pa servere i Norge/EOS. Ingen data overføres til land utenfor EOS-omradet." },
                { term: "OAuth 2.0", def: "Sikker autentiseringsprotokoll brukt for banktilkobling og e-postintegrasjon. Ciri lagrer aldri passord — kun krypterte tilgangsnokkler." },
                { term: "Maskinporten", def: "Digdirs sikkerhetslining for maskin-til-maskin-kommunikasjon med offentlige API-er (Altinn, Skatteetaten)." },
              ].map((item) => (
                <div key={item.term} className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#1a2e23]">{item.term}</p>
                  <p className="text-[11px] text-[#8a9a8e]">{item.def}</p>
                </div>
              ))}
            </div>
          </>
        ),
      },
      {
        id: "kryptering",
        title: "Kryptering",
        content: (
          <>
            <p>All data i Ciri er kryptert i flere lag:</p>
            <div className="my-3 space-y-2">
              <div className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2">
                <p className="text-[12px] font-semibold text-[#1a2e23]">AES-256 i hvile</p>
                <p className="text-[11px] text-[#8a9a8e]">Alle dokumenter og sensitive data krypteres for lagring.</p>
              </div>
              <div className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2">
                <p className="text-[12px] font-semibold text-[#1a2e23]">TLS 1.3 i transit</p>
                <p className="text-[11px] text-[#8a9a8e]">All kommunikasjon mellom nettleseren og serverne vare.</p>
              </div>
              <div className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2">
                <p className="text-[12px] font-semibold text-[#1a2e23]">Norsk datalagring</p>
                <p className="text-[11px] text-[#8a9a8e]">Servere i Norge med kryptert backup til EOS-datasentre.</p>
              </div>
            </div>
          </>
        ),
      },
      {
        id: "tilgang",
        title: "Tilgangskontroll",
        content: (
          <>
            <p>
              Ciri stotter rollebasert tilgang med tre nivaer:
            </p>
            <div className="my-3 space-y-1.5">
              {[
                { role: "Admin", desc: "Full tilgang til alle funksjoner, innstillinger og brukeradministrasjon", color: "bg-[#3E715C]" },
                { role: "Regnskapsforer", desc: "Tilgang til bokforing, rapporter og MVA. Kan ikke endre innstillinger.", color: "bg-[#5B906F]" },
                { role: "Lesetilgang", desc: "Kun visning av rapporter og oversikter. Kan ikke opprette eller endre.", color: "bg-[#96AFA8]" },
              ].map((item) => (
                <div key={item.role} className="flex items-start gap-2.5 rounded-lg border border-[#d4dbd6] px-3 py-2">
                  <div className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", item.color)} />
                  <div>
                    <p className="text-[12px] font-semibold text-[#1a2e23]">{item.role}</p>
                    <p className="text-[11px] text-[#8a9a8e]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Tip>
              Aktiver tofaktorautentisering (2FA) for alle brukere under{" "}
              <PathBreadcrumb path="System → Sikkerhet" />.
            </Tip>
          </>
        ),
      },
      {
        id: "gdpr",
        title: "GDPR-rettigheter",
        content: (
          <>
            <p>Som Ciri-bruker har du folgende rettigheter iht. GDPR:</p>
            <div className="my-3 space-y-2">
              {[
                { right: "Rett til innsyn", desc: "Se alle personopplysninger vi lagrer om deg." },
                { right: "Rett til sletting", desc: "Be om fullstendig sletting av alle data innen 30 dager." },
                { right: "Rett til portabilitet", desc: "Eksporter alle dine data i standardformater." },
                { right: "Rett til korrigering", desc: "Korriger feilaktige opplysninger nar som helst." },
              ].map((item) => (
                <div key={item.right} className="rounded-lg border border-[#d4dbd6] bg-[#f5f7f2]/50 px-3 py-2">
                  <p className="text-[12px] font-semibold text-[#1a2e23]">{item.right}</p>
                  <p className="text-[11px] text-[#8a9a8e]">{item.desc}</p>
                </div>
              ))}
            </div>
          </>
        ),
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // TEKNISK ARKITEKTUR
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: "teknisk-arkitektur",
    title: "Teknisk arkitektur",
    icon: CpuIcon,
    description: "Tre-fase avstemmingspipeline, konfidensscoring, regelsystem, vekting og hvordan Ciri laerer over tid.",
    subsections: [

      // ── TRE-FASE PIPELINE ──
      {
        id: "tre-fase-pipeline",
        title: "Tre-fase avstemmingspipeline",
        content: (
          <>
            <p>
              Ciris avstemmingssystem opererer som en <strong>tre-fase pipeline</strong>.
              Hver fase bygger pa den forrige. Fase 1 og 2 er rent mekaniske
              (ingen AI), mens Fase 3 bruker Claude som en siste sikkerhetsport.
            </p>

            <div className="my-6 rounded-xl border border-[#d4dbd6] bg-[#f5f7f2]/50 p-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#3E715C]/20 bg-[#3E715C]/5 p-4 text-center">
                  <p className="text-[10px] font-bold tracking-wider uppercase text-[#3E715C]">
                    Fase 1
                  </p>
                  <p className="mt-1.5 text-[12px] font-semibold text-[#1a2e23]">
                    Regler + scoring
                  </p>
                  <p className="mt-1 text-[10px] text-[#8a9a8e]">
                    Regelmotor matcher kjente monstre. Multi-faktor scorer ukjente par.
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-center">
                  <p className="text-[10px] font-bold tracking-wider uppercase text-amber-700">
                    Fase 2
                  </p>
                  <p className="mt-1.5 text-[12px] font-semibold text-[#1a2e23]">
                    Klyngevalidering
                  </p>
                  <p className="mt-1 text-[10px] text-[#8a9a8e]">
                    Matcher sjekkes mot historiske suksessmonstre for a verifisere troverdighet.
                  </p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-center">
                  <p className="text-[10px] font-bold tracking-wider uppercase text-blue-600">
                    Fase 3
                  </p>
                  <p className="mt-1.5 text-[12px] font-semibold text-[#1a2e23]">
                    AI-inspeksjon
                  </p>
                  <p className="mt-1 text-[10px] text-[#8a9a8e]">
                    Claude validerer utvalgte matcher ukentlig for endelig godkjenning.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-[#8a9a8e]">
                <span className="rounded-lg bg-white px-2.5 py-1 border border-[#d4dbd6]">
                  Ny transaksjon
                </span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
                <span className="rounded-lg bg-[#3E715C]/10 px-2.5 py-1 font-semibold text-[#3E715C]">
                  Fase 1
                </span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
                <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                  Fase 2
                </span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-semibold text-blue-600">
                  Fase 3
                </span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
                <span className="rounded-lg bg-white px-2.5 py-1 border border-[#d4dbd6]">
                  Postert / Foreslatt
                </span>
              </div>
            </div>

            <p>
              Seksjonene nedenfor forklarer hvert konsept i detalj: forst regler
              og scoring (Fase 1), deretter klynger (Fase 2), og til slutt
              AI-inspeksjon (Fase 3).
            </p>
          </>
        ),
      },

      // ── REGELSYSTEMET (Fase 1) ──
      {
        id: "regelsystemet",
        title: "Regelsystemet",
        content: (
          <>
            <p>
              Regler automatiserer handtering av gjentakende transaksjoner. De
              opprettes enten manuelt av brukeren, eller laeres automatisk fra
              korrigeringer.
            </p>

            {/* Rule types */}
            <p className="mb-3 mt-6 text-[13px] font-semibold text-[#1a2e23]">
              Regeltyper
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  type: "AUTO_MATCH",
                  label: "Auto-match",
                  desc: "Match transaksjon til et spesifikt bilagmonster automatisk",
                  color: "border-[#3E715C]/20 bg-[#3E715C]/5",
                },
                {
                  type: "AUTO_CATEGORY",
                  label: "Auto-kategorisering",
                  desc: "Sett kategori, kontonummer og MVA-kode automatisk",
                  color: "border-blue-200 bg-blue-50/50",
                },
                {
                  type: "IGNORE",
                  label: "Ignorer",
                  desc: "Marker som privat/irrelevant — f.eks. personlige kjop",
                  color: "border-[#d4dbd6] bg-[#f5f7f2]/50",
                },
                {
                  type: "SPLIT",
                  label: "Splitt",
                  desc: "Del transaksjon pa flere kontoer — f.eks. 50% kontor, 50% privat",
                  color: "border-purple-200 bg-purple-50/50",
                },
              ].map((item) => (
                <div
                  key={item.type}
                  className={cn(
                    "rounded-xl border px-4 py-3",
                    item.color
                  )}
                >
                  <p className="text-[10px] font-bold tracking-wider uppercase text-[#8a9a8e]">
                    {item.type}
                  </p>
                  <p className="mt-1 text-[12px] font-semibold text-[#1a2e23]">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#4a5e52]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Criteria matching */}
            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Kriteriesystemet (JSONB-matching)
            </p>
            <p className="mb-4">
              Hver regel har et sett kriterier. Alle kriterier er OG-kombinert —
              hver oppgitt betingelse ma matche for at regelen skal utloses.
            </p>

            <div className="rounded-xl border border-[#d4dbd6] bg-[#f5f7f2]/50 p-4">
              <div className="space-y-2">
                {[
                  {
                    field: "description_contains",
                    example: '"SPOTIFY"',
                    desc: "Delstreng i transaksjonsbeskrivelse (ufølsom for store/sma bokstaver)",
                  },
                  {
                    field: "amount_min / amount_max",
                    example: "99 – 199",
                    desc: "Belopet (absoluttverdi) er innenfor et intervall",
                  },
                  {
                    field: "amount_exact",
                    example: "119",
                    desc: "Belopet matcher noyaktig",
                  },
                  {
                    field: "merchant_name",
                    example: '"Spotify"',
                    desc: "Avsendernavn matcher eksakt",
                  },
                  {
                    field: "direction",
                    example: '"debit"',
                    desc: "Transaksjonens retning (debit = ut, credit = inn)",
                  },
                ].map((item) => (
                  <div
                    key={item.field}
                    className="rounded-lg bg-white px-3 py-2"
                  >
                    <div className="flex items-baseline gap-2">
                      <code className="text-[11px] font-bold text-[#3E715C]">
                        {item.field}
                      </code>
                      <span className="text-[10px] text-[#8a9a8e]">
                        f.eks. {item.example}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#4a5e52]">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Rule evaluation flow */}
            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Regelutforelse
            </p>
            <div className="max-w-xs">
              <FlowStep label="Hent aktive regler" detail="Sortert etter prioritet (hoy → lav)" />
              <FlowStep label="For hver regel: sjekk kriterier" detail="Alle betingelser ma matche" />
              <FlowStep label="Forste treff vinner" detail="Regelen utfores, resten hoppes over" />
              <FlowStep label="Oppdater bruksstatistikk" detail="times_applied +1" last />
            </div>

            {/* Effectiveness */}
            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Selvdeaktivering
            </p>
            <p className="mb-4">
              Hver regel sporer sin egen noyaktighet. Hvis brukeren overstyrer
              resultatet for ofte, deaktiveres regelen automatisk.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#3E715C]/20 bg-[#3E715C]/5 p-4">
                <p className="text-[12px] font-semibold text-[#3E715C]">
                  Effektiv regel
                </p>
                <p className="mt-1 text-[11px] text-[#4a5e52]">
                  Overstyring &lt; 30%
                </p>
                <div className="mt-3 flex items-center gap-3 text-[11px]">
                  <span className="text-[#8a9a8e]">Brukt: 50</span>
                  <span className="text-[#8a9a8e]">Overstyrt: 3</span>
                  <span className="font-bold text-[#3E715C]">Rate: 6%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#d4dbd6]">
                  <div className="h-full w-[6%] rounded-full bg-[#3E715C]" />
                </div>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                <p className="text-[12px] font-semibold text-red-600">
                  Ineffektiv regel (deaktivert)
                </p>
                <p className="mt-1 text-[11px] text-[#4a5e52]">
                  Overstyring ≥ 30%
                </p>
                <div className="mt-3 flex items-center gap-3 text-[11px]">
                  <span className="text-[#8a9a8e]">Brukt: 20</span>
                  <span className="text-[#8a9a8e]">Overstyrt: 8</span>
                  <span className="font-bold text-red-600">Rate: 40%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#d4dbd6]">
                  <div className="h-full w-[40%] rounded-full bg-red-400" />
                </div>
              </div>
            </div>
          </>
        ),
      },

      // ── KONFIDENSSCORING (Fase 1) ──
      {
        id: "konfidensscoring",
        title: "Konfidensscoring og vekting",
        content: (
          <>
            <p>
              Nar Ciri matcher en banktransaksjon mot et bilag, beregnes en
              konfidensscoring basert pa <strong>seks uavhengige faktorer</strong>.
              Hver faktor har en fast vekt, og summen avgjar konfidensniva.
            </p>

            {/* Weight bars */}
            <div className="my-6 space-y-4 rounded-xl border border-[#d4dbd6] bg-[#f5f7f2]/50 p-5">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#8a9a8e]">
                Faktorvekter
              </p>
              <WeightBar
                label="Eksakt belop"
                weight={0.35}
                description="Transaksjonsbelop matcher bilagsbelop noyaktig"
              />
              <WeightBar
                label="Referanse / KID"
                weight={0.30}
                description="Betalingsreferanse inneholder bilagsnummer eller KID"
              />
              <WeightBar
                label="Beloptoleranse"
                weight={0.20}
                description="Belop innenfor 2% avvik (kun nar eksakt match feiler)"
              />
              <WeightBar
                label="Navnelikhet"
                weight={0.15}
                description="Leverandornavn matcher motpart (fuzzy matching, terskel 60%)"
              />
              <WeightBar
                label="Datonaerhet"
                weight={0.15}
                description="Transaksjonsdato innen 14 dager fra bilagsdato (lineaert avtak)"
              />
              <WeightBar
                label="Historiske monstre"
                weight={0.10}
                description="Laerte regler fra tidligere tilbakemeldinger"
              />
            </div>

            {/* Scoring flow */}
            <p className="mb-4 text-[13px] font-semibold text-[#1a2e23]">
              Scoringsflyt
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="space-y-0">
                  <FlowStep
                    label="Hent uposterte bilag"
                    detail="Maks 100, sortert etter dato"
                  />
                  <FlowStep
                    label="Beregn 6 faktorer per par"
                    detail="Transaksjon × Bilag"
                  />
                  <FlowStep
                    label="Summer vektede scorer"
                    detail="Total = Σ (faktor × vekt)"
                  />
                  <FlowStep
                    label="Filtrer < 0.30 bort"
                    detail="Minimum terskel for kandidat"
                  />
                  <FlowStep
                    label="Klassifiser konfidens"
                    detail="HOY / MEDIUM / LAV"
                    last
                  />
                </div>
              </div>

              {/* Confidence thresholds */}
              <div className="space-y-3">
                <div className="rounded-xl border border-[#3E715C]/20 bg-[#3E715C]/5 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#3E715C]" />
                    <span className="text-[13px] font-bold text-[#3E715C]">
                      HOY — score ≥ 0.90
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#4a5e52]">
                    Nesten sikker match. Kan auto-bekreftes i Assistent- og
                    Autonom-modus.
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="text-[13px] font-bold text-amber-700">
                      MEDIUM — score 0.70–0.89
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#4a5e52]">
                    Sannsynlig match. Auto-bekreftes kun i Autonom-modus,
                    ellers foreslatt.
                  </p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="text-[13px] font-bold text-red-600">
                      LAV — score &lt; 0.70
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#4a5e52]">
                    Usikker match. Vises alltid som forslag — krever manuell
                    gjennomgang.
                  </p>
                </div>
              </div>
            </div>

            {/* Scoring examples */}
            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Eksempler
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ScoreExample
                title="Faktura med KID — perfekt match"
                items={[
                  { label: "Eksakt belop (kr 12 500)", score: "+0.35", hit: true },
                  { label: "Referanse matcher F-2025-042", score: "+0.30", hit: true },
                  { label: "Beloptoleranse (hoppet)", score: "0.00", hit: false },
                  { label: "Navn: Telenor → 87% likhet", score: "+0.13", hit: true },
                  { label: "Dato: 3 dager forskjell", score: "+0.12", hit: true },
                ]}
                total="0.90"
                level="HIGH"
              />
              <ScoreExample
                title="Vipps-betaling — delvis match"
                items={[
                  { label: "Eksakt belop (kr 4 980)", score: "+0.35", hit: true },
                  { label: "Ingen referanse", score: "0.00", hit: false },
                  { label: "Beloptoleranse (hoppet)", score: "0.00", hit: false },
                  { label: "Navn: Byggmakker → 68% likhet", score: "+0.10", hit: true },
                  { label: "Dato: 5 dager forskjell", score: "+0.10", hit: true },
                ]}
                total="0.55"
                level="LOW"
              />
            </div>

            <Tip>
              Referanse/KID-matching bruker bade direkte substringsoking og
              numerisk ekstraksjon. Vanlige betalingsprefixer som
              &ldquo;VIPPS*&rdquo;, &ldquo;KORTBETALING&rdquo; osv. fjernes for
              sammenligning.
            </Tip>
          </>
        ),
      },

      // ── KLYNGER OG LAERINGSSYKLUSEN (Fase 2) ──
      {
        id: "klynger",
        title: "Klynger og laeringssyklusen",
        content: (
          <>
            <p>
              Klynger er kjernen i Ciris langsiktige laering. Mens regler
              handterer enkeltmonstre, bygger klynger en <strong>helhetlig
              forstaaelse</strong> av bedriftens utgifts- og inntektsmonstre
              over tid.
            </p>

            {/* What is a cluster */}
            <p className="mb-3 mt-6 text-[13px] font-semibold text-[#1a2e23]">
              Hva er en klynge?
            </p>
            <p className="mb-4">
              En klynge er en gruppering av bekreftede treff etter{" "}
              <strong>kontonummer</strong> og <strong>kategori</strong>. Hver
              gang du bekrefter en avstemming, opprettes et datapunkt i den
              relevante klyngen. Etter hvert som datapunkter akkumuleres fra
              ulike leverandorer og belop, vokser klyngen i styrke.
            </p>

            <div className="my-4 rounded-xl border border-[#d4dbd6] bg-[#f5f7f2]/50 p-4">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#8a9a8e] mb-3">
                Eksempel: Klyngen &ldquo;Kontorrekvisita&rdquo; (konto 6540)
              </p>
              <div className="space-y-1.5 text-[11px] text-[#4a5e52]">
                <div className="flex items-center gap-2">
                  <CheckIcon className="h-3 w-3 text-[#3E715C] shrink-0" />
                  <span>Elkjop — kr 4 299 (skjerm) → bekreftet 28. jan</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon className="h-3 w-3 text-[#3E715C] shrink-0" />
                  <span>Komplett.no — kr 1 890 (tastatur) → bekreftet 3. feb</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon className="h-3 w-3 text-[#3E715C] shrink-0" />
                  <span>Clas Ohlson — kr 349 (kabler) → bekreftet 10. feb</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon className="h-3 w-3 text-[#3E715C] shrink-0" />
                  <span>Dustin — kr 2 150 (headset) → bekreftet 15. feb</span>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[#8a9a8e]">
                Fire datapunkter, fire leverandorer — alle bekreftet til konto
                6540.
              </p>
            </div>

            {/* The learning cycle */}
            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Laeringssyklusen
            </p>
            <p className="mb-4">
              Hele Ciris laering folger en syklus der hver handling forsterker
              systemets forstaaelse:
            </p>

            <div className="max-w-sm">
              <FlowStep
                label="Banktransaksjoner importeres"
                detail="Daglig synkronisering fra bankkonto"
              />
              <FlowStep
                label="Ciri analyserer og foreslar"
                detail="Multi-faktor matching mot bilag"
              />
              <FlowStep
                label="Du bekrefter eller korrigerer"
                detail="Avstemming med konfidensscore"
              />
              <FlowStep
                label="Regler laeres fra handlinger"
                detail="AUTO_MATCH, AUTO_CATEGORY, IGNORE"
              />
              <FlowStep
                label="Klynger bygges fra datapunkter"
                detail="Gruppering etter konto og kategori"
              />
              <FlowStep
                label="Styrke beregnes"
                detail="Volum + diversitet + paalitelighet + aktualitet"
              />
              <FlowStep
                label="Autonom bokforing aktiveres"
                detail="Nar klynger er sterke nok"
                last
              />
            </div>

            {/* Strength formula */}
            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Styrkeformelen
            </p>
            <p className="mb-4">
              Klyngestyrke beregnes som en vektet sum av fire faktorer.
              Resultatet bestemmer om klyngen er <strong>svak</strong>,{" "}
              <strong>voksende</strong> eller <strong>sterk</strong>.
            </p>

            <div className="my-4 space-y-4 rounded-xl border border-[#d4dbd6] bg-[#f5f7f2]/50 p-5">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#8a9a8e]">
                Styrkeberegning
              </p>
              <WeightBar
                label="Volum (antall datapunkter)"
                weight={0.30}
                description="Flere bekreftede treff gir hoyere volum-score"
              />
              <WeightBar
                label="Diversitet (unike leverandorer)"
                weight={0.30}
                description="Ulike leverandorer til samme konto styrker klyngen"
              />
              <WeightBar
                label="Paalitelighet (riktige vs overstyrte)"
                weight={0.25}
                description="Lav overstyringsrate gir hoy paalitelighet"
              />
              <WeightBar
                label="Aktualitet (nylige datapunkter)"
                weight={0.15}
                description="Ferske datapunkter teller mer enn gamle"
              />
            </div>

            {/* Hard minimums */}
            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Harde minimumskrav
            </p>
            <p className="mb-4">
              Uavhengig av vektet score, settes styrken til{" "}
              <strong>0</strong> hvis noen av disse minimumene ikke er oppfylt:
            </p>

            <div className="rounded-xl border border-[#d4dbd6] bg-[#f5f7f2]/50 p-5">
              <div className="space-y-2">
                {[
                  { field: "Datapunkter", req: "≥ 8", desc: "Minimum 8 bekreftede treff i klyngen" },
                  { field: "Leverandorer", req: "≥ 3", desc: "Minimum 3 unike leverandornavn" },
                  { field: "Overstyringsrate", req: "≤ 20%", desc: "Maks 20% av treff overstyrt av bruker" },
                ].map((item) => (
                  <div
                    key={item.field}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-[12px]"
                  >
                    <span className="flex items-center gap-2 text-[#1a2e23]">
                      <CheckIcon className="h-3.5 w-3.5 text-[#3E715C]" />
                      {item.field}
                      <span className="text-[10px] text-[#8a9a8e]">
                        — {item.desc}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] font-medium text-[#3E715C]">
                      {item.req}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strength levels */}
            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Styrkenivaaer
            </p>
            <div className="space-y-3">
              <div className="rounded-xl border border-[#d4dbd6] bg-white p-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#8a9a8e]" />
                  <span className="text-[13px] font-bold text-[#8a9a8e]">
                    Svak — styrke &lt; 0.4
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-[#4a5e52]">
                  Faerre enn 8 datapunkter, eller lav diversitet. Klyngen gir
                  ingen autonom autoritet — fungerer kun som statistikk.
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="text-[13px] font-bold text-amber-700">
                    Voksende — styrke 0.4–0.7
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-[#4a5e52]">
                  Minimum 8 datapunkter og 3 leverandorer. Klyngen brukes til
                  forbedret matching, men gir ikke autonom bokforing alene.
                </p>
              </div>
              <div className="rounded-xl border border-[#3E715C]/20 bg-[#3E715C]/5 p-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#3E715C]" />
                  <span className="text-[13px] font-bold text-[#3E715C]">
                    Sterk — styrke &gt; 0.7
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-[#4a5e52]">
                  Hoy diversitet, lav feilrate, jevnlig aktivitet. Denne
                  klyngen kvalifiserer for autonom bokforing nar globale krav er
                  oppfylt.
                </p>
              </div>
            </div>


            {/* Cluster gatekeeper */}
            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Klyngen som portvakt (Fase 2)
            </p>
            <p className="mb-4">
              I Fase 2 av pipelinen fungerer klynger som en <strong>portvakt</strong> for
              auto-bokforing. Klyngestyrke og tilpasningsgrad bestemmer om en
              match kan auto-bokfores eller ma gjennomgas manuelt.
            </p>

            <div className="my-4 rounded-xl border border-[#d4dbd6] overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[#f5f7f2]">
                    <th className="px-4 py-3 text-left font-semibold text-[#1a2e23]">Klyngestyrke</th>
                    <th className="px-3 py-3 text-left font-semibold text-[#1a2e23]">Tilpasning</th>
                    <th className="px-3 py-3 text-left font-semibold text-[#1a2e23]">Krav til match</th>
                    <th className="px-3 py-3 text-left font-semibold text-[#1a2e23]">Resultat</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#d4dbd6]">
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-[#3E715C]/10 px-2 py-0.5 text-[10px] font-bold text-[#3E715C]">Sterk</span>
                    </td>
                    <td className="px-3 py-3 text-[#4a5e52]">Hoy</td>
                    <td className="px-3 py-3 text-[#4a5e52]">MEDIUM eller HOY</td>
                    <td className="px-3 py-3 text-[#3E715C] font-semibold">Kan auto-bokfores</td>
                  </tr>
                  <tr className="border-t border-[#d4dbd6]">
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-[#3E715C]/10 px-2 py-0.5 text-[10px] font-bold text-[#3E715C]">Sterk</span>
                    </td>
                    <td className="px-3 py-3 text-[#4a5e52]">Delvis</td>
                    <td className="px-3 py-3 text-[#4a5e52]">Kun HOY</td>
                    <td className="px-3 py-3 text-[#3E715C] font-semibold">Kan auto-bokfores</td>
                  </tr>
                  <tr className="border-t border-[#d4dbd6]">
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Voksende</span>
                    </td>
                    <td className="px-3 py-3 text-[#4a5e52]">Hoy / Delvis</td>
                    <td className="px-3 py-3 text-[#4a5e52]">Kun HOY</td>
                    <td className="px-3 py-3 text-amber-700 font-semibold">Kan auto-bokfores</td>
                  </tr>
                  <tr className="border-t border-[#d4dbd6]">
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Svak / Ingen</span>
                    </td>
                    <td className="px-3 py-3 text-[#4a5e52]">—</td>
                    <td className="px-3 py-3 text-[#4a5e52]">—</td>
                    <td className="px-3 py-3 text-red-600 font-semibold">Aldri auto-bokfor</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Tip>
              Uten en klynge kan Ciri <strong>aldri</strong> auto-bokfore en transaksjon,
              uansett hvor hoy matchscoren er. Klyngen er den obligatoriske portvakten.
            </Tip>

            {/* Cluster growth example */}
            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Klyngevekst over tid
            </p>
            <div className="space-y-3">
              {[
                {
                  period: "Start",
                  points: 0,
                  merchants: 0,
                  strength: 0,
                  level: "Ingen data",
                  desc: "Klyngen eksisterer ikke enna — ingen bekreftede treff for denne kontoen.",
                  color: "bg-[#d4dbd6]",
                },
                {
                  period: "Maned 1",
                  points: 3,
                  merchants: 1,
                  strength: 0.1,
                  level: "Svak",
                  desc: "3 bekreftelser fra 1 leverandor. Under minimum (8 pkt, 3 lev.).",
                  color: "bg-[#8a9a8e]",
                },
                {
                  period: "Maned 2",
                  points: 6,
                  merchants: 2,
                  strength: 0.25,
                  level: "Svak",
                  desc: "6 datapunkter, 2 leverandorer. Naermer seg, men fortsatt under minimum.",
                  color: "bg-[#8a9a8e]",
                },
                {
                  period: "Maned 3",
                  points: 10,
                  merchants: 3,
                  strength: 0.52,
                  level: "Voksende",
                  desc: "Alle minimumskrav oppfylt! Klyngen begynner a pavirke matching-konfidens.",
                  color: "bg-amber-400",
                },
                {
                  period: "Maned 5",
                  points: 24,
                  merchants: 5,
                  strength: 0.82,
                  level: "Sterk",
                  desc: "Hoy diversitet, ingen overstyringer. Kvalifiserer for autonom bokforing.",
                  color: "bg-[#3E715C]",
                },
              ].map((item) => (
                <div
                  key={item.period}
                  className="rounded-xl border border-[#d4dbd6] bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#1a2e23]">
                      {item.period}
                    </span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-[#8a9a8e]">
                        {item.points} pkt · {item.merchants} lev.
                      </span>
                      <span className="font-bold tabular-nums text-[#3E715C]">
                        {item.strength.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e8ede9]">
                    <div
                      className={cn("h-full rounded-full", item.color)}
                      style={{ width: `${Math.max(item.strength * 100, 2)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-[#4a5e52]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* What confirmation creates */}
            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Hva skjer nar du bekrefter en avstemming?
            </p>

            <div className="rounded-xl border border-[#d4dbd6] bg-[#f5f7f2]/50 p-5">
              {/* Confirm path */}
              <div className="rounded-xl border border-[#3E715C]/20 bg-[#3E715C]/5 p-4">
                <p className="text-[10px] font-bold tracking-wider uppercase text-[#3E715C]">
                  Bekreftelse
                </p>
                <div className="mt-3 space-y-1.5 text-[11px] text-[#4a5e52]">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-3 w-3 text-[#3E715C] shrink-0" />
                    Transaksjon matches med bilaget
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-3 w-3 text-[#3E715C] shrink-0" />
                    Nytt datapunkt opprettes i klyngen (konto + kategori)
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-3 w-3 text-[#3E715C] shrink-0" />
                    Konfidens for lignende fremtidige treff okes
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-3 w-3 text-[#3E715C] shrink-0" />
                    Klyngestyrken beregnes pa nytt
                  </div>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <ArrowDownIcon className="h-4 w-4 text-[#8a9a8e]" />
              </div>

              {/* Reject path */}
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                <p className="text-[10px] font-bold tracking-wider uppercase text-red-600">
                  Avvisning / overstyring
                </p>
                <div className="mt-3 space-y-1.5 text-[11px] text-[#4a5e52]">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 flex items-center justify-center text-red-500 shrink-0 text-[10px] font-bold">&times;</span>
                    Matchen forkastes
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 flex items-center justify-center text-red-500 shrink-0 text-[10px] font-bold">&times;</span>
                    Konfidens for lignende treff senkes
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 flex items-center justify-center text-red-500 shrink-0 text-[10px] font-bold">&times;</span>
                    Overstyringsrate i klyngen okes
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 flex items-center justify-center text-red-500 shrink-0 text-[10px] font-bold">&times;</span>
                    Hvis rate &gt; 20% → klyngestyrke faller til 0
                  </div>
                </div>
              </div>
            </div>

            {/* Autonomy requirements */}
            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Globale krav for autonom bokforing
            </p>
            <p className="mb-4">
              Autonom-modus krever at <strong>begge</strong> disse kravene er
              oppfylt:
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#3E715C]/20 bg-[#3E715C]/5 p-4">
                <p className="text-[12px] font-semibold text-[#3E715C]">
                  5+ paalitelige regler
                </p>
                <p className="mt-1 text-[11px] text-[#4a5e52]">
                  Regler med ≥ 80% treffsikkerhet og ≥ 5 bruk.
                </p>
              </div>
              <div className="rounded-xl border border-[#3E715C]/20 bg-[#3E715C]/5 p-4">
                <p className="text-[12px] font-semibold text-[#3E715C]">
                  1+ sterk klynge
                </p>
                <p className="mt-1 text-[11px] text-[#4a5e52]">
                  Minst en klynge med styrke &gt; 0.7.
                </p>
              </div>
            </div>

            <Tip>
              Du kan se klyngenes status under{" "}
              <PathBreadcrumb path="Bank → Regler" /> i seksjonen
              &ldquo;Klynger og laering&rdquo;. Hver klynge viser antall
              datapunkter, leverandorer, styrke og styrkenivaa.
            </Tip>
          </>
        ),
      },

      // ── AI-INSPEKSJON (FASE 3) ──
      {
        id: "ai-inspeksjon",
        title: "AI-inspeksjon (Fase 3)",
        content: (
          <>
            <p>
              Det eneste steget i pipelinen som involverer AI. Kjorer pa fast
              tidsplan og validerer matcher som allerede har bestatt regler,
              scoring og klyngevalidering.
            </p>

            <div className="my-6 rounded-xl border border-[#d4dbd6] bg-[#f5f7f2]/50 p-5">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#8a9a8e] mb-4">
                Batchdetaljer
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-white px-3 py-2.5 border border-[#d4dbd6]">
                  <p className="text-[10px] font-bold tracking-wider uppercase text-[#8a9a8e]">Tidsplan</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#1a2e23]">Man + Fre kl. 06:00</p>
                </div>
                <div className="rounded-lg bg-white px-3 py-2.5 border border-[#d4dbd6]">
                  <p className="text-[10px] font-bold tracking-wider uppercase text-[#8a9a8e]">Modell</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#1a2e23]">Claude Opus</p>
                </div>
                <div className="rounded-lg bg-white px-3 py-2.5 border border-[#d4dbd6]">
                  <p className="text-[10px] font-bold tracking-wider uppercase text-[#8a9a8e]">Typisk batch</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#1a2e23]">5-15 matcher/uke</p>
                </div>
              </div>
            </div>

            <Step number={1} title="Samle batch">
              Hent alle matcher med readiness tier 1 eller 2 (regler + sterke
              klynger). Tier 3-4 gar aldri hit — de vises direkte til brukeren.
            </Step>
            <Step number={2} title="Bygg prompt">
              Systemkontekst, klyngeoppsummeringer og matchliste med scorer
              og bilagsdetaljer sendes til Claude.
            </Step>
            <Step number={3} title="Claude validerer">
              Claude sjekker hver match for: riktig kontokode, rimelig belop
              for kategorien, duplikater, og samsvar mellom bilag og transaksjon.
            </Step>
            <Step number={4} title="Utfor resultat">
              Godkjente matcher auto-bokfores. Flaggede matcher sendes til bruker
              med Claudes begrunnelse.
            </Step>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#3E715C]/20 bg-[#3E715C]/5 p-4">
                <p className="text-[10px] font-bold tracking-wider uppercase text-[#3E715C]">
                  Godkjent av AI
                </p>
                <div className="mt-3 space-y-1.5 text-[11px] text-[#4a5e52]">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-3 w-3 text-[#3E715C] shrink-0" />
                    Auto-bokfor (opprett posteringer, merk POSTERT)
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-3 w-3 text-[#3E715C] shrink-0" />
                    Registrer klyngedatapunkt
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-3 w-3 text-[#3E715C] shrink-0" />
                    Oppdater regelstatistikk
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <p className="text-[10px] font-bold tracking-wider uppercase text-amber-700">
                  Flagget av AI
                </p>
                <div className="mt-3 space-y-1.5 text-[11px] text-[#4a5e52]">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 flex items-center justify-center text-amber-500 shrink-0 text-[10px] font-bold">!</span>
                    Flytt til FORESLATT (brukergjennomgang)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 flex items-center justify-center text-amber-500 shrink-0 text-[10px] font-bold">!</span>
                    Inkluder Claudes bekymring i forklaring
                  </div>
                </div>
              </div>
            </div>

            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Eksempel: AI flagging
            </p>
            <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <span className="text-[11px] font-bold text-amber-700">!</span>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-amber-800">
                    Match #3 flagget
                  </p>
                  <p className="mt-1 text-[11px] text-[#4a5e52] italic">
                    &ldquo;Belopet kr 12 990 er uvanlig hoyt for IT-abonnement (konto 6540).
                    Gjennomsnitt i klyngen er kr 49-2 890. Kan dette vaere maskinvare
                    (konto 1200)?&rdquo;
                  </p>
                </div>
              </div>
            </div>

            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Kostnad
            </p>
            <div className="rounded-xl border border-[#d4dbd6] bg-white p-4">
              <div className="space-y-2">
                {[
                  { label: "~1 200 transaksjoner/ar", detail: "Typisk ~10M NOK/ar bedrift" },
                  { label: "~450 nar Fase 3", detail: "Etter regler + filtrering" },
                  { label: "104 batcher/ar", detail: "Man + Fre, ~4-5 matcher per batch" },
                  { label: "~$6,50/ar per kunde", detail: "Opus: $15/M input, $75/M output" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg bg-[#f5f7f2]/80 px-3 py-2 text-[11px]"
                  >
                    <span className="font-semibold text-[#1a2e23]">{item.label}</span>
                    <span className="text-[#8a9a8e]">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            <Tip>
              Hele det mekaniske systemet handterer matching og scoring. Claude
              fungerer kun som en ekstra sikkerhetsport for matcher systemet
              allerede er sikre pa, for de bokfores.
            </Tip>
          </>
        ),
      },

      // ── LAERING FRA TILBAKEMELDINGER ──
      {
        id: "laering",
        title: "Laering fra tilbakemeldinger",
        content: (
          <>
            <p>
              Ciri &ldquo;trener&rdquo; ikke et nevralt nettverk — istedet
              bygger systemet <strong>eksplisitte regler</strong> fra
              brukerkorrigeringer. Hver gang du retter en match, laerer Ciri
              et monster den bruker neste gang.
            </p>

            {/* Training feedback loop schematic */}
            <p className="mb-3 mt-6 text-[13px] font-semibold text-[#1a2e23]">
              Tilbakemeldingsloyfen
            </p>

            <div className="rounded-xl border border-[#d4dbd6] bg-[#f5f7f2]/50 p-5">
              {/* Step 1: Ciri suggests */}
              <div className="rounded-xl border border-[#d4dbd6] bg-white p-4">
                <p className="text-[10px] font-bold tracking-wider uppercase text-[#8a9a8e]">
                  Steg 1 — Ciri foreslar
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 rounded-lg bg-[#f5f7f2] px-3 py-2">
                    <p className="text-[11px] font-semibold text-[#1a2e23]">
                      Transaksjon
                    </p>
                    <p className="text-[10px] text-[#8a9a8e]">
                      REMA 1000 TORSHOV — kr 189,00
                    </p>
                  </div>
                  <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-[#8a9a8e]" />
                  <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-amber-700">
                      Foreslatt: Bilag F-2025-10
                    </p>
                    <p className="text-[10px] text-[#8a9a8e]">
                      Konfidens: 72% (MEDIUM)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <ArrowDownIcon className="h-4 w-4 text-[#8a9a8e]" />
              </div>

              {/* Step 2: User feedback */}
              <div className="rounded-xl border border-[#d4dbd6] bg-white p-4">
                <p className="text-[10px] font-bold tracking-wider uppercase text-[#8a9a8e]">
                  Steg 2 — Bruker korrigerer
                </p>
                <div className="mt-3 flex gap-2">
                  <div className="flex-1 rounded-lg bg-[#f5f7f2] px-3 py-2 text-center text-[11px] text-[#8a9a8e]">
                    Bekreft
                  </div>
                  <div className="flex-1 rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-center text-[11px] font-semibold text-red-600">
                    Avvis: &ldquo;dette er privat&rdquo;
                  </div>
                  <div className="flex-1 rounded-lg bg-[#f5f7f2] px-3 py-2 text-center text-[11px] text-[#8a9a8e]">
                    Korriger bilag
                  </div>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <ArrowDownIcon className="h-4 w-4 text-[#8a9a8e]" />
              </div>

              {/* Step 3: Pattern extraction */}
              <div className="rounded-xl border border-[#d4dbd6] bg-white p-4">
                <p className="text-[10px] font-bold tracking-wider uppercase text-[#8a9a8e]">
                  Steg 3 — Monsterekstraksjon
                </p>
                <div className="mt-3 space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#8a9a8e]">Input:</span>
                    <code className="rounded bg-[#f5f7f2] px-2 py-0.5 text-[#1a2e23]">
                      KORTBETALING REMA 1000 TORSHOV
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#8a9a8e]">Fjern prefiks:</span>
                    <code className="rounded bg-[#f5f7f2] px-2 py-0.5 text-[#1a2e23]">
                      REMA 1000 TORSHOV
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#8a9a8e]">Nokkelord:</span>
                    <code className="rounded bg-[#3E715C]/10 px-2 py-0.5 font-bold text-[#3E715C]">
                      REMA
                    </code>
                    <span className="text-[10px] text-[#8a9a8e]">
                      (forste ord &gt; 2 tegn, ikke tall)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <ArrowDownIcon className="h-4 w-4 text-[#8a9a8e]" />
              </div>

              {/* Step 4: Rule created */}
              <div className="rounded-xl border border-[#3E715C]/20 bg-[#3E715C]/5 p-4">
                <p className="text-[10px] font-bold tracking-wider uppercase text-[#3E715C]">
                  Steg 4 — Ny regel opprettet
                </p>
                <div className="mt-3 space-y-1 text-[11px]">
                  <div className="flex gap-2">
                    <span className="text-[#8a9a8e] w-16 shrink-0">Navn:</span>
                    <span className="font-semibold text-[#1a2e23]">
                      Ignorer: REMA 1000
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#8a9a8e] w-16 shrink-0">Type:</span>
                    <span className="text-[#1a2e23]">IGNORE</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#8a9a8e] w-16 shrink-0">Kriterie:</span>
                    <code className="rounded bg-white/60 px-1.5 py-0.5 text-[#3E715C]">
                      description_contains: &ldquo;REMA&rdquo;
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[#8a9a8e] w-16 shrink-0">Aksjon:</span>
                    <span className="text-[#1a2e23]">
                      Marker som privat
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <ArrowDownIcon className="h-4 w-4 text-[#8a9a8e]" />
              </div>

              {/* Step 5: Future */}
              <div className="rounded-xl border border-[#3E715C]/30 bg-[#3E715C]/10 p-4 text-center">
                <p className="text-[12px] font-semibold text-[#3E715C]">
                  Neste &ldquo;REMA 1000&rdquo;-transaksjon → automatisk
                  ignorert
                </p>
                <p className="mt-1 text-[10px] text-[#4a5e52]">
                  Ingen brukerinteraksjon nodvendig
                </p>
              </div>
            </div>

            {/* Training timeline */}
            <p className="mb-3 mt-8 text-[13px] font-semibold text-[#1a2e23]">
              Laeringskurve over tid
            </p>

            <div className="space-y-3">
              {[
                {
                  period: "Dag 1",
                  pct: 0,
                  desc: "Ingen regler — alle transaksjoner ga gjennom multi-faktor matcher. Brukeren gjennomgar alt manuelt.",
                  color: "bg-red-400",
                },
                {
                  period: "Uke 2",
                  pct: 30,
                  desc: "5 IGNORE-regler opprettet fra korrigeringer. Personlige utgifter (dagligvare, streaming) auto-ignorert.",
                  color: "bg-amber-400",
                },
                {
                  period: "Maned 2",
                  pct: 60,
                  desc: "15+ aktive regler. De fleste gjentakende transaksjoner handtert automatisk. Brukeren gjennomgar kun ukjente.",
                  color: "bg-amber-300",
                },
                {
                  period: "Maned 6",
                  pct: 80,
                  desc: "Stabilt regelsett. Darlige regler selvdeaktivert (>30% overstyring). Systemet handterer ~80% automatisk.",
                  color: "bg-[#3E715C]",
                },
              ].map((item) => (
                <div
                  key={item.period}
                  className="rounded-xl border border-[#d4dbd6] bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#1a2e23]">
                      {item.period}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums text-[#3E715C]">
                      ~{item.pct}% automatisert
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e8ede9]">
                    <div
                      className={cn("h-full rounded-full", item.color)}
                      style={{ width: `${item.pct || 2}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-[#4a5e52]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <Tip>
              Du kan ogsa opprette regler manuelt under{" "}
              <PathBreadcrumb path="Bank → Regler" /> — for eksempel
              &ldquo;Telenor = konto 6900 Telefon&rdquo;. Manuelle regler
              fungerer identisk med laerte regler.
            </Tip>
          </>
        ),
      },

      // ── AUTONOMIMATRISE ──
      {
        id: "autonomimatrise",
        title: "Autonominivaer og auto-postering",
        content: (
          <>
            <p>
              Bedriftens <strong>autonominiva</strong> avgjar hvilke
              konfidensnivaer som auto-bekreftes vs. presenteres for
              gjennomgang.
            </p>

            {/* Autonomy matrix */}
            <div className="my-6 overflow-hidden rounded-xl border border-[#d4dbd6]">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[#f5f7f2]">
                    <th className="px-4 py-3 text-left font-semibold text-[#1a2e23]">
                      Modus
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-[#3E715C]">
                      <div className="flex items-center justify-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-[#3E715C]" />
                        Hoy (≥0.90)
                      </div>
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-amber-700">
                      <div className="flex items-center justify-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-amber-400" />
                        Medium
                      </div>
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-red-600">
                      <div className="flex items-center justify-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-red-400" />
                        Lav
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#d4dbd6]">
                    <td className="px-4 py-3 font-medium text-[#1a2e23]">
                      Assistent
                      <p className="text-[10px] font-normal text-[#8a9a8e]">
                        Auto ved hoy konfidens
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <AutonomyCell mode="auto" />
                    </td>
                    <td className="px-3 py-3">
                      <AutonomyCell mode="suggest" />
                    </td>
                    <td className="px-3 py-3">
                      <AutonomyCell mode="suggest" />
                    </td>
                  </tr>
                  <tr className="border-t border-[#d4dbd6]">
                    <td className="px-4 py-3 font-medium text-[#1a2e23]">
                      Autonom
                      <p className="text-[10px] font-normal text-[#8a9a8e]">
                        Auto ved hoy + medium
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <AutonomyCell mode="auto" />
                    </td>
                    <td className="px-3 py-3">
                      <AutonomyCell mode="auto" />
                    </td>
                    <td className="px-3 py-3">
                      <AutonomyCell mode="suggest" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Auto-posting gate for bilags */}
            <p className="mb-3 text-[13px] font-semibold text-[#1a2e23]">
              Auto-postering av bilag (OCR-pipeline)
            </p>
            <p className="mb-4">
              Nar et bilag behandles via OCR, kan det auto-posteres hvis
              <strong> alle</strong> folgende krav er oppfylt:
            </p>

            <div className="rounded-xl border border-[#d4dbd6] bg-[#f5f7f2]/50 p-5">
              <div className="space-y-2">
                {[
                  { field: "OCR-konfidens", req: "≥ 90%" },
                  { field: "Leverandornavn", req: "Identifisert" },
                  { field: "Bruttobelop", req: "> 0" },
                  { field: "Fakturadato", req: "Gyldig dato" },
                  { field: "Beskrivelse", req: "Utfylt" },
                  { field: "Kontokode", req: "Foreslatt" },
                  { field: "MVA-kode", req: "Identifisert" },
                ].map((item) => (
                  <div
                    key={item.field}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-[12px]"
                  >
                    <span className="flex items-center gap-2 text-[#1a2e23]">
                      <CheckIcon className="h-3.5 w-3.5 text-[#3E715C]" />
                      {item.field}
                    </span>
                    <span className="font-mono text-[11px] font-medium text-[#3E715C]">
                      {item.req}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2 text-[11px]">
                <div className="flex-1 rounded-lg bg-[#3E715C]/10 px-3 py-2 text-center font-semibold text-[#3E715C]">
                  Alle oppfylt → POSTERT
                </div>
                <div className="flex-1 rounded-lg bg-amber-50 px-3 py-2 text-center font-semibold text-amber-700">
                  Noe mangler → VENTER
                </div>
              </div>
            </div>

            <Tip>
              Hvis auto-postering feiler (f.eks. ugyldig kontooppsett), settes
              bilaget tilbake til VENTER med en forklaring i statusfeltet.
            </Tip>
          </>
        ),
      },
    ],
  },
];

// ============================================================================
// SEARCH
// ============================================================================

function flattenForSearch() {
  const results: { sectionId: string; subsectionId: string; title: string; sectionTitle: string }[] = [];
  for (const section of DOC_SECTIONS) {
    for (const sub of section.subsections) {
      results.push({
        sectionId: section.id,
        subsectionId: sub.id,
        title: sub.title,
        sectionTitle: section.title,
      });
    }
  }
  return results;
}

const ALL_ITEMS = flattenForSearch();

// ============================================================================
// PAGE COMPONENT
// ============================================================================

function DokumentasjonContent() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");

  const initialSection = sectionParam && DOC_SECTIONS.some((s) => s.id === sectionParam)
    ? sectionParam
    : "kom-i-gang";

  const [activeSection, setActiveSection] = useState<string>(initialSection);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([initialSection])
  );
  const [search, setSearch] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle section param changes
  useEffect(() => {
    if (sectionParam && DOC_SECTIONS.some((s) => s.id === sectionParam)) {
      setActiveSection(sectionParam);
      setExpandedSections((prev) => new Set(prev).add(sectionParam));
    }
  }, [sectionParam]);

  // Track scroll for back-to-top
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Toggle section expand
  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Navigate to subsection
  const navigateTo = useCallback(
    (sectionId: string, subsectionId: string) => {
      setActiveSection(sectionId);
      setExpandedSections((prev) => new Set(prev).add(sectionId));
      setSearch("");
      // Scroll to element
      setTimeout(() => {
        const el = document.getElementById(subsectionId);
        if (el) {
          const yOffset = -100;
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 50);
    },
    []
  );

  // Copy anchor link
  const copyLink = useCallback((id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/dokumentasjon#${id}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  // Filtered search results
  const searchResults = search.length > 1
    ? ALL_ITEMS.filter(
        (item) =>
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.sectionTitle.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  // Get active section data
  const activeSectionData = DOC_SECTIONS.find((s) => s.id === activeSection);

  return (
    <div
      className="min-h-screen bg-white text-[#1a2e23]"
      style={{ fontFamily: "var(--font-hedvig-letters-serif), Georgia, serif" }}
    >
      <MarketingNav />

      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}
      <section className="border-b border-[#d4dbd6] bg-[#f5f7f2] pt-28 pb-12 sm:pt-36 sm:pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 text-[#5B906F]">
              <BookOpenIcon className="h-5 w-5" />
              <span className="text-[12px] font-bold tracking-[0.15em] uppercase">
                Dokumentasjon
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
              Alt du trenger for a bruke Ciri
            </h1>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[#4a5e52]">
              Steg-for-steg-guider, referanser og tips for a fa mest mulig ut
              av AI-regnskapet ditt.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative mt-8 max-w-md"
          >
            <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a8e]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sok i dokumentasjonen..."
              className="w-full rounded-xl border border-[#d4dbd6] bg-white py-2.5 pl-10 pr-4 text-[13px] text-[#1a2e23] placeholder-[#8a9a8e] outline-none transition-all focus:border-[#3E715C]/40 focus:ring-2 focus:ring-[#3E715C]/10"
            />

            {/* Search results dropdown */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full left-0 right-0 z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-[#d4dbd6] bg-white shadow-lg shadow-black/5"
                >
                  {searchResults.map((result) => (
                    <button
                      key={result.subsectionId}
                      onClick={() =>
                        navigateTo(result.sectionId, result.subsectionId)
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f5f7f2] border-b border-[#d4dbd6]/50 last:border-0"
                    >
                      <HashIcon className="h-3.5 w-3.5 shrink-0 text-[#8a9a8e]" />
                      <div>
                        <p className="text-[13px] font-medium text-[#1a2e23]">
                          {result.title}
                        </p>
                        <p className="text-[11px] text-[#8a9a8e]">
                          {result.sectionTitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* MAIN LAYOUT — sidebar + content                                  */}
      {/* ================================================================ */}
      <div className="mx-auto flex max-w-6xl gap-0">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <nav className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto border-r border-[#d4dbd6] py-8 pr-6 pl-6">
            <div className="space-y-1">
              {DOC_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isExpanded = expandedSections.has(section.id);

                return (
                  <div key={section.id}>
                    <button
                      onClick={() => {
                        setActiveSection(section.id);
                        toggleSection(section.id);
                      }}
                      className={cn(
                        "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors",
                        isActive
                          ? "bg-[#3E715C]/8 text-[#3E715C]"
                          : "text-[#4a5e52] hover:bg-[#f5f7f2] hover:text-[#1a2e23]"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-[13px] font-medium">
                        {section.title}
                      </span>
                      <ChevronRightIcon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                          isExpanded && "rotate-90"
                        )}
                      />
                    </button>

                    {/* Subsection links */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-4 border-l border-[#d4dbd6] pl-4 py-1">
                            {section.subsections.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() =>
                                  navigateTo(section.id, sub.id)
                                }
                                className="block w-full rounded-md px-2 py-1.5 text-left text-[12px] text-[#8a9a8e] transition-colors hover:text-[#3E715C] hover:bg-[#3E715C]/5"
                              >
                                {sub.title}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Content */}
        <main ref={contentRef} className="min-w-0 flex-1 px-6 py-8 lg:px-12 lg:py-12">
          {/* Mobile section selector */}
          <div className="mb-8 lg:hidden">
            <select
              value={activeSection}
              onChange={(e) => {
                setActiveSection(e.target.value);
                setExpandedSections((prev) => new Set(prev).add(e.target.value));
              }}
              className="w-full rounded-xl border border-[#d4dbd6] bg-[#f5f7f2] px-4 py-3 text-[13px] text-[#1a2e23] outline-none"
            >
              {DOC_SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>

          {/* Section header */}
          {activeSectionData && (
            <motion.div
              key={activeSectionData.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3E715C]/10">
                  <activeSectionData.icon className="h-5 w-5 text-[#5B906F]" />
                </div>
                <div>
                  <h2 className="text-2xl font-normal tracking-tight text-[#1a2e23]">
                    {activeSectionData.title}
                  </h2>
                  <p className="text-[13px] text-[#8a9a8e]">
                    {activeSectionData.description}
                  </p>
                </div>
              </div>

              <div className="mt-2 h-px bg-gradient-to-r from-[#d4dbd6] to-transparent" />

              {/* Subsections */}
              <div className="mt-8 space-y-12">
                {activeSectionData.subsections.map((sub) => (
                  <section key={sub.id} id={sub.id} className="scroll-mt-28">
                    <div className="group flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#1a2e23]">
                        {sub.title}
                      </h3>
                      <button
                        onClick={() => copyLink(sub.id)}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        title="Kopier lenke"
                      >
                        {copied === sub.id ? (
                          <CheckIcon className="h-3.5 w-3.5 text-[#5B906F]" />
                        ) : (
                          <LinkIcon className="h-3.5 w-3.5 text-[#8a9a8e] hover:text-[#3E715C]" />
                        )}
                      </button>
                    </div>
                    <div className="mt-4 text-[14px] leading-relaxed text-[#4a5e52]">
                      {sub.content}
                    </div>
                  </section>
                ))}
              </div>

              {/* Next section link */}
              {(() => {
                const currentIndex = DOC_SECTIONS.findIndex(
                  (s) => s.id === activeSection
                );
                const nextSection = DOC_SECTIONS[currentIndex + 1];
                if (!nextSection) return null;
                return (
                  <div className="mt-16 border-t border-[#d4dbd6] pt-8">
                    <button
                      onClick={() => {
                        setActiveSection(nextSection.id);
                        setExpandedSections((prev) =>
                          new Set(prev).add(nextSection.id)
                        );
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="group flex items-center gap-4 rounded-2xl border border-[#d4dbd6] bg-[#f5f7f2]/50 px-6 py-5 transition-all hover:border-[#3E715C]/30 hover:shadow-lg hover:shadow-[#3E715C]/5"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3E715C]/10 transition-colors group-hover:bg-[#3E715C]/20">
                        <nextSection.icon className="h-5 w-5 text-[#5B906F]" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#8a9a8e]">
                          Neste
                        </p>
                        <p className="text-[15px] font-medium text-[#1a2e23]">
                          {nextSection.title}
                        </p>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 text-[#8a9a8e] transition-transform group-hover:translate-x-1 group-hover:text-[#3E715C]" />
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </main>

        {/* Right sidebar — quick links / on this page */}
        <aside className="hidden w-48 shrink-0 xl:block">
          <div className="sticky top-24 py-8 pl-6">
            {activeSectionData && (
              <>
                <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#8a9a8e]">
                  Pa denne siden
                </p>
                <div className="mt-3 space-y-1">
                  {activeSectionData.subsections.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() =>
                        navigateTo(activeSectionData.id, sub.id)
                      }
                      className="block w-full rounded-md px-2 py-1 text-left text-[11px] text-[#8a9a8e] transition-colors hover:text-[#3E715C]"
                    >
                      {sub.title}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Help link */}
            <div className="mt-8 rounded-xl border border-[#d4dbd6] bg-[#f5f7f2]/50 p-4">
              <p className="text-[11px] font-semibold text-[#1a2e23]">
                Trenger du hjelp?
              </p>
              <p className="mt-1 text-[10px] text-[#8a9a8e]">
                Spor Ciri direkte i appen eller ta kontakt med support.
              </p>
              <Link
                href="/dashboard/chat"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#3E715C] px-3 py-1.5 text-[10px] font-medium text-white transition-colors hover:bg-[#5B906F]"
              >
                <Image
                  src="/ciribakgrunn.png"
                  alt=""
                  width={14}
                  height={14}
                  className="rounded-full"
                />
                Spor Ciri
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Back to top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-8 right-8 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-[#d4dbd6] bg-white text-[#4a5e52] shadow-lg transition-colors hover:bg-[#f5f7f2] hover:text-[#3E715C]"
          >
            <ArrowUpIcon className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <MarketingFooter />
    </div>
  );
}

export default function DokumentasjonPage() {
  return (
    <Suspense>
      <DokumentasjonContent />
    </Suspense>
  );
}
