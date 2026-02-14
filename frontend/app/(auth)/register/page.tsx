"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MailIcon,
  LockIcon,
  BuildingIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  SearchIcon,
  EyeIcon,
  BrainCircuitIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ScaleIcon,
  AlertTriangleIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import CiriLogo from "@/components/layout/ciri-logo";
import { cn } from "@/lib/utils";

const autonomyLevels = [
  {
    id: "assistant",
    name: "Assistent",
    icon: SparklesIcon,
    description: "Ciri foreslår og håndterer rutineoppgaver, du godkjenner viktige beslutninger",
    details: "Anbefalt for de fleste bedrifter",
    recommended: true,
    color: "primary"
  },
  {
    id: "autonomous",
    name: "Autonom",
    icon: BrainCircuitIcon,
    description: "Ciri håndterer alt innenfor lovens rammer – du observerer",
    details: "For travle eiere som stoler på Ciri fullt ut",
    color: "purple"
  }
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [companyResults, setCompanyResults] = useState<Array<{
    orgNumber: string;
    name: string;
    address: string;
    postalCode: string;
    city: string;
    industry: string;
    industryCode: string;
  }>>([]);
  const [selectedCompany, setSelectedCompany] = useState<{
    orgNumber: string;
    name: string;
    address: string;
    postalCode: string;
    city: string;
    industry: string;
    industryCode: string;
  } | null>(null);
  const [autonomyLevel, setAutonomyLevel] = useState("assistant");
  const [isSearching, setIsSearching] = useState(false);
  const [autonomyConsent, setAutonomyConsent] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside and cleanup timeout
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Search Brønnøysund API for companies
  const handleCompanySearch = (searchTerm: string) => {
    setCompanySearch(searchTerm);
    setSelectedCompany(null);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchTerm.length < 2) {
      setCompanyResults([]);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    // Debounce the API call
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Call Brønnøysund Enhetsregisteret API
        const response = await fetch(
          `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(searchTerm)}&size=10`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch from Brønnøysund");
        }

        const data = await response.json();

        // Map API response to our format
        const results = (data._embedded?.enheter || []).map((company: {
          organisasjonsnummer: string;
          navn: string;
          forretningsadresse?: {
            adresse?: string[];
            postnummer?: string;
            poststed?: string;
          };
          naeringskode1?: {
            beskrivelse?: string;
            kode?: string;
          };
        }) => ({
          orgNumber: company.organisasjonsnummer,
          name: company.navn,
          address: company.forretningsadresse?.adresse?.[0] || "",
          postalCode: company.forretningsadresse?.postnummer || "",
          city: company.forretningsadresse?.poststed || "",
          industry: company.naeringskode1?.beskrivelse || "",
          industryCode: company.naeringskode1?.kode || "",
        }));

        setCompanyResults(results);
      } catch (error) {
        console.error("Error searching Brønnøysund:", error);
        setCompanyResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelectCompany = (company: {
    orgNumber: string;
    name: string;
    address: string;
    postalCode: string;
    city: string;
    industry: string;
    industryCode: string;
  }) => {
    setSelectedCompany(company);
    setCompanySearch(company.name);
    setShowResults(false);
    setCompanyResults([]);
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    router.push("/dashboard");
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/ciribakgrunn.png')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/60 to-[var(--primary)]/10 backdrop-blur-[2px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl"
        >
          <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/80 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-[var(--primary)]/10 to-transparent px-8 py-6">
              <div className="flex items-center gap-3">
                <CiriLogo size="md" />
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    Opprett konto
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Kom i gang med Ciri på 2 minutter
                  </p>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="mt-6 flex items-center gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                        step >= s
                          ? "bg-[var(--primary)] text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {step > s ? <CheckIcon className="size-4" /> : s}
                    </div>
                    {s < 3 && (
                      <div
                        className={cn(
                          "h-0.5 w-12 mx-2 transition-colors",
                          step > s ? "bg-[var(--primary)]" : "bg-muted"
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Steps */}
            <div className="px-8 py-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Account */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="email">E-post</Label>
                      <div className="relative">
                        <MailIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="din@epost.no"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Passord</Label>
                      <div className="relative">
                        <LockIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Minimum 12 tegn"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Bruk store og små bokstaver, tall og spesialtegn
                      </p>
                    </div>

                    <Button
                      onClick={nextStep}
                      className="w-full gap-2"
                      size="lg"
                      disabled={!email || password.length < 12}
                    >
                      Fortsett
                      <ArrowRightIcon className="size-4" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 2: Company */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div ref={containerRef} className="relative space-y-2">
                      <Label htmlFor="companySearch">Søk etter bedrift</Label>
                      <p className="text-xs text-muted-foreground">
                        Søk på bedriftsnavn eller organisasjonsnummer
                      </p>
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="companySearch"
                          placeholder="F.eks. Nordlys Konsulenter AS"
                          value={companySearch}
                          onChange={(e) => handleCompanySearch(e.target.value)}
                          onFocus={() => companyResults.length > 0 && setShowResults(true)}
                          className="pl-10"
                          autoComplete="off"
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <span className="size-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent block" />
                          </div>
                        )}

                        {/* Search Results Dropdown */}
                        <AnimatePresence>
                          {showResults && companyResults.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-auto rounded-lg border bg-white shadow-xl"
                            >
                              {companyResults.map((company) => (
                                <button
                                  key={company.orgNumber}
                                  type="button"
                                  className="w-full px-4 py-3 text-left hover:bg-[var(--primary)]/5 border-b last:border-0 transition-colors"
                                  onClick={() => handleSelectCompany(company)}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="font-medium text-sm">{company.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {company.address}, {company.postalCode} {company.city}
                                      </p>
                                    </div>
                                    <span className="text-xs font-mono text-muted-foreground shrink-0">
                                      {company.orgNumber.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {company.industry}
                                  </p>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* No Results */}
                      {showResults && companySearch.length >= 2 && companyResults.length === 0 && !isSearching && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="rounded-lg border border-dashed p-4 text-center"
                        >
                          <p className="text-sm text-muted-foreground">
                            Ingen bedrifter funnet for &quot;{companySearch}&quot;
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Prøv å søke på et annet navn eller org.nummer
                          </p>
                        </motion.div>
                      )}
                    </div>

                    {/* Selected Company */}
                    {selectedCompany && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-green-200 bg-green-50 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-green-100 p-2">
                            <CheckIcon className="size-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <p className="font-medium text-green-900">{selectedCompany.name}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCompany(null);
                                  setCompanySearch("");
                                }}
                                className="text-xs text-green-600 hover:text-green-800 hover:underline"
                              >
                                Endre
                              </button>
                            </div>
                            <p className="text-sm text-green-700">
                              {selectedCompany.address}, {selectedCompany.postalCode} {selectedCompany.city}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-green-600">
                              <span className="font-mono">
                                Org.nr: {selectedCompany.orgNumber.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}
                              </span>
                              <span>•</span>
                              <span>{selectedCompany.industry}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={prevStep} className="gap-2">
                        <ArrowLeftIcon className="size-4" />
                        Tilbake
                      </Button>
                      <Button
                        onClick={nextStep}
                        className="flex-1 gap-2"
                        size="lg"
                        disabled={!selectedCompany}
                      >
                        Fortsett
                        <ArrowRightIcon className="size-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Autonomy Level */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <div className="space-y-3">
                      <Label>Velg Ciri&apos;s autonominivå</Label>
                      <div className="space-y-3">
                        {autonomyLevels.map((level) => (
                          <Card
                            key={level.id}
                            className={cn(
                              "cursor-pointer transition-all",
                              autonomyLevel === level.id
                                ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]"
                                : "hover:border-muted-foreground/30"
                            )}
                            onClick={() => {
                              setAutonomyLevel(level.id);
                              if (level.id !== "autonomous") {
                                setAutonomyConsent(false);
                              }
                            }}
                          >
                            <CardHeader className="flex flex-row items-center gap-4 py-4">
                              <div
                                className={cn(
                                  "rounded-lg p-2",
                                  autonomyLevel === level.id
                                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                <level.icon className="size-5" />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="flex items-center gap-2 text-base">
                                  {level.name}
                                  {level.recommended && (
                                    <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                                      Anbefalt
                                    </span>
                                  )}
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  {level.description}
                                </CardDescription>
                              </div>
                              <div
                                className={cn(
                                  "size-5 rounded-full border-2 transition-colors",
                                  autonomyLevel === level.id
                                    ? "border-[var(--primary)] bg-[var(--primary)]"
                                    : "border-muted-foreground/30"
                                )}
                              >
                                {autonomyLevel === level.id && (
                                  <CheckIcon className="size-full p-0.5 text-white" />
                                )}
                              </div>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Legal consent for Autonomous mode */}
                    {autonomyLevel === "autonomous" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/20"
                      >
                        <div className="flex items-start gap-3">
                          <ScaleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" />
                          <div className="flex-1 space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                Fullmakt og ansvar
                              </p>
                              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                I autonom modus vil Ciri sende MVA-meldinger, SAF-T rapporter og andre lovpålagte dokumenter til Skatteetaten via Altinn på dine vegne.
                              </p>
                            </div>

                            <div className="space-y-2 rounded-lg bg-white/50 p-3 dark:bg-black/10">
                              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                                Ved å velge autonom modus bekrefter du at:
                              </p>
                              <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
                                <li className="flex items-start gap-2">
                                  <CheckIcon className="mt-0.5 size-3 shrink-0" />
                                  <span>Du gir Ciri fullmakt til å sende inn rapporter til offentlige myndigheter</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <CheckIcon className="mt-0.5 size-3 shrink-0" />
                                  <span>Du forblir juridisk ansvarlig for alle innleveringer (jf. Skatteforvaltningsloven)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <CheckIcon className="mt-0.5 size-3 shrink-0" />
                                  <span>Du vil regelmessig gjennomgå Ciri&apos;s handlinger og verifisere at data er korrekt</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <CheckIcon className="mt-0.5 size-3 shrink-0" />
                                  <span>Ciri vil varsle deg før viktige frister og gi deg mulighet til å stoppe automatiske handlinger</span>
                                </li>
                              </ul>
                            </div>

                            <div className="flex items-start gap-3 pt-1">
                              <Checkbox
                                id="autonomy-consent"
                                checked={autonomyConsent}
                                onCheckedChange={(checked) => setAutonomyConsent(checked === true)}
                                className="mt-0.5"
                              />
                              <label
                                htmlFor="autonomy-consent"
                                className="text-sm font-medium text-amber-800 dark:text-amber-200 cursor-pointer"
                              >
                                Jeg forstår og godtar vilkårene for autonom modus
                              </label>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={prevStep} className="gap-2">
                        <ArrowLeftIcon className="size-4" />
                        Tilbake
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        className="flex-1 gap-2"
                        size="lg"
                        disabled={isLoading || (autonomyLevel === "autonomous" && !autonomyConsent)}
                      >
                        {isLoading ? (
                          <>
                            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Oppretter konto...
                          </>
                        ) : (
                          <>
                            Opprett konto
                            <ArrowRightIcon className="size-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="border-t bg-muted/30 px-8 py-4">
              <p className="text-center text-sm text-muted-foreground">
                Har du allerede konto?{" "}
                <Link
                  href="/login"
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  Logg inn
                </Link>
              </p>
            </div>
          </div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex justify-center gap-6 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-1">
              <ShieldCheckIcon className="size-4" />
              <span>Kryptert data</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckIcon className="size-4" />
              <span>Ingen kredittkort</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
