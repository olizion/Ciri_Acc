"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileTextIcon,
  CheckCircle2Icon,
  ClockIcon,
  AlertTriangleIcon,
  SparklesIcon,
  BuildingIcon,
  ReceiptIcon,
  FileIcon,
  DownloadIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
  LinkIcon,
  HashIcon,
  ImageIcon,
  XIcon,
  PencilIcon,
  InfoIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import { formatCurrency, getCurrencyInfo } from "@/lib/currency-conversion";
import { getRevisionsForBilag } from "@/lib/bilag-store";
import { statusConfig, bilagTypeConfig } from "../data/constants";
import CompanyLogo from "./company-logo";
import type { Bilag } from "../types";

interface BilagDetailDialogProps {
  bilag: Bilag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (bilag: Bilag) => void;
  onApprove: (bilag: Bilag) => void;
  onManualPost: (bilag: Bilag) => void;
}

function BilagDetailDialog({
  bilag,
  open,
  onOpenChange,
  onComplete,
  onApprove,
  onManualPost
}: BilagDetailDialogProps) {
  // Merge stored revisions from MVA corrections with bilag's revisjonslogg
  const mergedRevisjonslogg = useMemo(() => {
    if (!bilag) return [];

    // Get stored revisions for this bilag (from MVA corrections)
    const storedRevisions = getRevisionsForBilag(bilag.bilagsnummer);

    // Merge and sort by timestamp (newest first for display, but we'll reverse for chronological)
    const allRevisions = [...bilag.revisjonslogg, ...storedRevisions];
    return allRevisions.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [bilag]);

  if (!bilag) return null;

  const status = statusConfig[bilag.status] ?? statusConfig.venter;
  const StatusIcon = status.icon;
  const type = bilagTypeConfig[bilag.bilagstype] ?? bilagTypeConfig.inngaende_faktura;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[70vw] !max-w-[70vw] sm:!max-w-[70vw]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CompanyLogo
                domain={bilag.leverandorDomain}
                companyName={bilag.leverandor}
                size="lg"
              />
              <div>
                <DialogTitle className="flex items-center gap-2">
                  Bilag #{bilag.bilagsnummer}
                  {bilag.ciriKonfidans && bilag.ciriKonfidans >= 95 && (
                    <Badge variant="outline" className="ml-2 gap-1 text-[var(--primary)]">
                      <SparklesIcon className="size-3" />
                      Ciri {bilag.ciriKonfidans}%
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {bilag.summary || `${type.label} • ${bilag.leverandor}`}
                </DialogDescription>
              </div>
            </div>
            <Badge className={cn("border", status.className)}>
              <StatusIcon className="mr-1 size-3" />
              {status.label}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 pr-4">
            {/* Status Explanation */}
            {bilag.status !== "bokfort" && (
              <div className={cn(
                "rounded-lg border p-4",
                bilag.status === "trenger_gjennomgang" && "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10",
                bilag.status === "venter" && "border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10",
                bilag.status === "venter_transaksjon" && "border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/10"
              )}>
                <div className="flex items-start gap-3">
                  <CiriLogo size="sm" className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium flex items-center gap-2">
                      {bilag.status === "trenger_gjennomgang" && (
                        <>
                          <AlertTriangleIcon className="size-4 text-red-500" />
                          <span className="text-red-700">Jeg trenger din hjelp</span>
                        </>
                      )}
                      {bilag.status === "venter" && (
                        <>
                          <InfoIcon className="size-4 text-amber-600" />
                          <span className="text-amber-700">Venter på din godkjenning</span>
                        </>
                      )}
                      {bilag.status === "venter_transaksjon" && (
                        <>
                          <LinkIcon className="size-4 text-blue-600" />
                          <span className="text-blue-700">Venter på banktransaksjon</span>
                        </>
                      )}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {bilag.ciriMessage || status.description}
                    </p>

                    {/* Missing fields list */}
                    {bilag.missingFields && Object.keys(bilag.missingFields).length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-sm font-medium text-red-700">Manglende felt:</p>
                        <ul className="text-sm text-red-600 space-y-1">
                          {bilag.missingFields.leverandor && (
                            <li className="flex items-center gap-2">
                              <XIcon className="size-3" /> Leverandørnavn
                            </li>
                          )}
                          {bilag.missingFields.leverandorOrgnr && (
                            <li className="flex items-center gap-2">
                              <XIcon className="size-3" /> Organisasjonsnummer
                            </li>
                          )}
                          {bilag.missingFields.kontonummer && (
                            <li className="flex items-center gap-2">
                              <XIcon className="size-3" /> Kontonummer
                            </li>
                          )}
                          {bilag.missingFields.mvaKode && (
                            <li className="flex items-center gap-2">
                              <XIcon className="size-3" /> MVA-kode
                            </li>
                          )}
                          {bilag.missingFields.beskrivelse && (
                            <li className="flex items-center gap-2">
                              <XIcon className="size-3" /> Beskrivelse
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Main Info Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column - Document Details */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-medium">
                  <FileTextIcon className="size-4" />
                  Bilagsinformasjon
                </h3>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Bilagsnummer</span>
                    <span className="font-mono font-medium">#{bilag.bilagsnummer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Bilagstype</span>
                    <span className="font-medium">{type.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Bilagsdato</span>
                    <span className="font-medium">
                      {new Date(bilag.bilagsdato).toLocaleDateString("nb-NO", {
                        day: "numeric", month: "long", year: "numeric"
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Registrert</span>
                    <span className="font-medium">
                      {new Date(bilag.registreringsdato).toLocaleDateString("nb-NO")}
                    </span>
                  </div>
                  {bilag.forfallsdato && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Forfallsdato</span>
                      <span className="font-medium">
                        {new Date(bilag.forfallsdato).toLocaleDateString("nb-NO")}
                      </span>
                    </div>
                  )}
                </div>

                <h3 className="flex items-center gap-2 font-medium pt-2">
                  <BuildingIcon className="size-4" />
                  Leverandør
                </h3>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Navn</span>
                    <span className={cn("font-medium", bilag.missingFields?.leverandor && "text-red-500 italic")}>
                      {bilag.leverandor}
                      {bilag.missingFields?.leverandor && " (mangler)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Org.nr</span>
                    <span className={cn("font-mono", !bilag.leverandorOrgnr && "text-muted-foreground italic")}>
                      {bilag.leverandorOrgnr || "Ikke angitt"}
                    </span>
                  </div>
                  {bilag.leverandorAdresse && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Adresse</span>
                      <span className="text-right text-sm">{bilag.leverandorAdresse}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Financial Details */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-medium">
                  <ReceiptIcon className="size-4" />
                  Beløpsinformasjon
                </h3>

                {/* Currency Conversion Box - Show for foreign invoices */}
                {bilag.originalCurrency && bilag.originalCurrency !== "NOK" && (
                  <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                        Valutakonvertering
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Kurs {bilag.exchangeRateDate}
                      </span>
                    </div>

                    {/* Original -> Converted display */}
                    <div className="flex items-center justify-center gap-4 py-3">
                      {/* Original Amount Box */}
                      <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-3 dark:bg-gray-900">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Original</span>
                        <span className="font-display text-xl font-bold text-gray-700 dark:text-gray-200">
                          {formatCurrency(bilag.originalAmount || 0, bilag.originalCurrency)}
                        </span>
                        <span className="text-xs text-muted-foreground">{getCurrencyInfo(bilag.originalCurrency).nameNo}</span>
                      </div>

                      {/* Arrow */}
                      <div className="flex flex-col items-center">
                        <div className="text-2xl text-blue-500">&rarr;</div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          1 {bilag.originalCurrency} = {bilag.exchangeRate?.toFixed(2)} NOK
                        </span>
                      </div>

                      {/* Converted Amount Box */}
                      <div className="flex flex-col items-center rounded-lg border-2 border-[var(--primary)] bg-[var(--primary)]/5 px-6 py-3">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Bokført</span>
                        <span className="font-display text-xl font-bold text-[var(--primary)]">
                          kr {bilag.totalBelop.toLocaleString("nb-NO")}
                        </span>
                        <span className="text-xs text-muted-foreground">Norske kroner</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* VAT Treatment Notice for foreign invoices */}
                {bilag.vatTreatment && !bilag.vatTreatment.hasVAT && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-900/10">
                    <div className="flex items-start gap-2">
                      <AlertTriangleIcon className="mt-0.5 size-4 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                          {bilag.vatTreatment.vatCodeDescription}
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                          {bilag.vatTreatment.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Beløp eks. MVA</span>
                    <span className="font-display font-medium">
                      kr {bilag.belopEksMva.toLocaleString("nb-NO")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">MVA-grunnlag</span>
                    <span className="font-display">kr {bilag.mvaGrunnlag.toLocaleString("nb-NO")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">MVA ({bilag.mvaSats}%)</span>
                    <span className="font-display">kr {bilag.mvaBelop.toLocaleString("nb-NO")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">MVA-kode</span>
                    <span className={cn("font-mono", bilag.missingFields?.mvaKode && "text-red-500 italic")}>
                      {bilag.mvaKode || "Ikke angitt"}
                      {bilag.missingFields?.mvaKode && " (mangler)"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">Total inkl. MVA</span>
                    <span className="font-display text-lg font-bold text-[var(--primary)]">
                      kr {bilag.totalBelop.toLocaleString("nb-NO")}
                    </span>
                  </div>
                </div>

                <h3 className="flex items-center gap-2 font-medium pt-2">
                  <HashIcon className="size-4" />
                  Kontering
                </h3>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Kontonummer</span>
                    <span className={cn("font-mono font-medium", bilag.missingFields?.kontonummer && "text-red-500 italic")}>
                      {bilag.kontonummer || "Ikke angitt"}
                      {bilag.missingFields?.kontonummer && " (mangler)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Kontonavn</span>
                    <span className="font-medium">{bilag.kontonavn}</span>
                  </div>
                  {bilag.koststed && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Koststed</span>
                      <span>{bilag.koststed}</span>
                    </div>
                  )}
                  {bilag.posteringsreferanse && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Posteringsref.</span>
                      <span className="font-mono text-[var(--primary)]">{bilag.posteringsreferanse}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ciri's Explanation */}
            {bilag.ciriExplanation && (
              <div className="flex items-start gap-3 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
                <CiriLogo size="md" className="shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[var(--primary)] mb-1">Ciri forklarer</p>
                  <p className="text-sm text-[var(--primary)]/80 leading-relaxed">{bilag.ciriExplanation}</p>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <h3 className="font-medium">Beskrivelse</h3>
              <p className="rounded-lg border bg-muted/30 p-4 text-sm">
                {bilag.summary || bilag.beskrivelse}
              </p>
            </div>

            {/* Legal Compliance */}
            <div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="mt-0.5 size-5 text-[var(--primary)]" />
                <div>
                  <h3 className="font-medium text-[var(--primary)]">Bokføringsloven - Oppbevaring</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dette bilaget oppbevares til <span className="font-medium text-foreground">{new Date(bilag.oppbevaringsfrist).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}</span> i
                    henhold til Bokføringsloven § 13. Primær dokumentasjon skal oppbevares i 5 år.
                  </p>
                </div>
              </div>
            </div>

            {/* Original Document */}
            {bilag.originalFilnavn && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 font-medium">
                  <FileIcon className="size-4" />
                  Originaldokument
                </h3>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    {bilag.originalFiltype?.includes("image") ? (
                      <ImageIcon className="size-8 text-muted-foreground" />
                    ) : (
                      <FileTextIcon className="size-8 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">{bilag.originalFilnavn}</p>
                      <p className="text-xs text-muted-foreground">{bilag.originalFiltype}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (bilag.originalFilUrl) {
                          window.open(bilag.originalFilUrl, '_blank');
                        }
                      }}
                      disabled={!bilag.originalFilUrl}
                    >
                      <ExternalLinkIcon className="mr-2 size-4" />
                      Vis
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (bilag.originalFilUrl && bilag.originalFilnavn) {
                          const a = document.createElement('a');
                          a.href = `${bilag.originalFilUrl}?download=true`;
                          a.download = bilag.originalFilnavn;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }
                      }}
                      disabled={!bilag.originalFilUrl}
                    >
                      <DownloadIcon className="mr-2 size-4" />
                      Last ned
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Trail */}
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 font-medium">
                <ClockIcon className="size-4" />
                Revisjonslogg
              </h3>
              <div className="rounded-lg border">
                {mergedRevisjonslogg.map((entry, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-4 p-4",
                      index !== mergedRevisjonslogg.length - 1 && "border-b"
                    )}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      {entry.bruker === "Ciri AI" ? (
                        <SparklesIcon className="size-4 text-[var(--primary)]" />
                      ) : entry.bruker === "System" ? (
                        <LinkIcon className="size-4 text-muted-foreground" />
                      ) : (
                        <FileTextIcon className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{entry.handling}</p>
                      {entry.detaljer && (
                        <p className="text-sm text-muted-foreground">{entry.detaljer}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.bruker} • {new Date(entry.timestamp).toLocaleString("nb-NO")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Lukk
          </Button>
          {bilag.status === "trenger_gjennomgang" && (
            <Button onClick={() => onComplete(bilag)}>
              <PencilIcon className="mr-2 size-4" />
              Fullfør registrering
            </Button>
          )}
          {bilag.status === "venter" && (
            <Button onClick={() => onApprove(bilag)}>
              <CheckCircle2Icon className="mr-2 size-4" />
              Godkjenn og bokfør
            </Button>
          )}
          {bilag.status === "venter_transaksjon" && (
            <Button onClick={() => onManualPost(bilag)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <LinkIcon className="mr-2 size-4" />
              Koble til transaksjon
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BilagDetailDialog;
