"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  MenuIcon,
  XIcon,
  BrainCircuitIcon,
  LandmarkIcon,
  ReceiptIcon,
  CalculatorIcon,
  UsersIcon,
  FileBarChartIcon,
  ShieldCheckIcon,
  MailIcon,
  SparklesIcon,
  BookOpenIcon,
  HeadphonesIcon,
  NewspaperIcon,
  MessageCircleIcon,
  BuildingIcon,
  UserIcon,
  StoreIcon,
  BriefcaseIcon,
  ArrowRightIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import React from "react";

// ============================================================================
// DATA
// ============================================================================

const PRODUCT_FEATURES: {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    title: "AI Bokforing",
    href: "/produkt/ai-bokforing",
    description: "Automatisk kategorisering og kontering av bilag med AI.",
    icon: BrainCircuitIcon,
  },
  {
    title: "Bankavstemming",
    href: "/produkt/bankavstemming",
    description: "Smart matching av transaksjoner mot bilag.",
    icon: LandmarkIcon,
  },
  {
    title: "Faktura",
    href: "/produkt/fakturering",
    description: "Opprett, send og spor profesjonelle fakturaer.",
    icon: ReceiptIcon,
  },
  {
    title: "MVA-handtering",
    href: "/produkt/mva",
    description: "Automatisk MVA-beregning og rapportering.",
    icon: CalculatorIcon,
  },
  {
    title: "Lonn og A-melding",
    href: "/produkt/lonn",
    description: "Lonnskjoring, skattekort og A-melding.",
    icon: UsersIcon,
  },
  {
    title: "Rapporter",
    href: "/produkt/rapporter",
    description: "Arsregnskap, balanse og resultat som PDF.",
    icon: FileBarChartIcon,
  },
];

const PRODUCT_HIGHLIGHTS: {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    title: "E-post automatisering",
    href: "/produkt/e-post",
    description: "Hent fakturaer fra innboksen automatisk.",
    icon: MailIcon,
  },
  {
    title: "Sikkerhet & GDPR",
    href: "/produkt/sikkerhet",
    description: "Norsk datalagring og full personvern.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Dokumentasjon",
    href: "/dokumentasjon",
    description: "Guider, API-referanser og kom i gang.",
    icon: BookOpenIcon,
  },
];

const SOLUTIONS: {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Enkeltpersonforetak",
    href: "/losninger/enkeltpersonforetak",
    description: "Enkelt regnskap for selvstendig naringsdrivende.",
    icon: UserIcon,
  },
  {
    title: "Aksjeselskap",
    href: "/losninger/aksjeselskap",
    description: "Komplett regnskap med arsoppgjor og styreprotokoll.",
    icon: BuildingIcon,
  },
  {
    title: "Regnskapsforere",
    href: "/losninger/regnskapsforere",
    description: "Administrer flere klienter fra ett dashboard.",
    icon: BriefcaseIcon,
  },
  {
    title: "Nettbutikk",
    href: "/losninger/nettbutikk",
    description: "Integrasjon med Shopify, WooCommerce og Klarna.",
    icon: StoreIcon,
  },
];

const RESOURCES: {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Dokumentasjon",
    href: "#",
    description: "Guider og API-referanser for utviklere.",
    icon: BookOpenIcon,
  },
  {
    title: "Blogg",
    href: "#",
    description: "Nyheter, tips og oppdateringer fra Ciri.",
    icon: NewspaperIcon,
  },
  {
    title: "Brukerstotte",
    href: "#",
    description: "Fa hjelp fra teamet vart eller Ciri AI.",
    icon: HeadphonesIcon,
  },
  {
    title: "Kontakt oss",
    href: "#",
    description: "Snakk med salg eller support.",
    icon: MessageCircleIcon,
  },
];


// ============================================================================
// LIST ITEM
// ============================================================================

const ListItem = React.forwardRef<
  HTMLAnchorElement,
  { className?: string; title?: string; children?: React.ReactNode; icon: LucideIcon; href?: string }
>(({ className, title, children, icon: Icon, href }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          href={href || "#"}
          className={cn(
            "group/item flex select-none items-start gap-3 rounded-xl p-3 leading-none no-underline outline-hidden transition-colors hover:bg-[#3E715C]/5",
            className
          )}
          ref={ref}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#3E715C]/8 text-[#5B906F] transition-colors group-hover/item:bg-[#3E715C]/15 group-hover/item:text-[#3E715C]">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-[#1a2e23]">{title}</div>
            <p className="mt-0.5 text-xs leading-relaxed text-[#8a9a8e]">
              {children}
            </p>
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

// ============================================================================
// NAV COMPONENT
// ============================================================================

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-colors duration-500",
          scrolled
            ? "bg-white/90 backdrop-blur-xl border-b border-[#d4dbd6] shadow-sm"
            : "bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-[var(--marketing-container)] items-center justify-between px-6 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-[#5B906F]/30 transition-all group-hover:ring-[#5B906F]/60">
              <Image
                src="/ciribakgrunn.png"
                alt="Ciri"
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-xl tracking-tight text-[#1a2e23]">
              Ciri
            </span>
          </Link>

          {/* Desktop navigation with dropdowns */}
          <div className="hidden md:block">
            <NavigationMenu>
              <NavigationMenuList>
                {/* PRODUKT mega menu */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-sm text-[#4a5e52] hover:bg-[#3E715C]/5 hover:text-[#1a2e23] data-[state=open]:bg-[#3E715C]/5 data-[state=open]:text-[#1a2e23]">
                    Produkt
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="p-0">
                    <div className="grid w-[720px] grid-cols-5 gap-0 divide-x divide-[#d4dbd6]/60">
                      {/* Left: Features grid */}
                      <div className="col-span-3 p-5">
                        <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.15em] uppercase text-[#3E715C]">
                          Funksjoner
                        </p>
                        <ul className="grid grid-cols-2 gap-1">
                          {PRODUCT_FEATURES.map((item) => (
                            <ListItem
                              key={item.title}
                              href={item.href}
                              icon={item.icon}
                              title={item.title}
                            >
                              {item.description}
                            </ListItem>
                          ))}
                        </ul>
                      </div>

                      {/* Right: Highlights + CTA */}
                      <div className="col-span-2 flex flex-col p-5">
                        <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.15em] uppercase text-[#3E715C]">
                          Hoyepunkter
                        </p>
                        <ul className="grid gap-1">
                          {PRODUCT_HIGHLIGHTS.map((item) => (
                            <ListItem
                              key={item.title}
                              href={item.href}
                              icon={item.icon}
                              title={item.title}
                            >
                              {item.description}
                            </ListItem>
                          ))}
                        </ul>

                        {/* Featured CTA */}
                        <div className="mt-auto pt-4">
                          <Link
                            href="/register"
                            className="group flex items-center gap-3 rounded-xl bg-[#3E715C]/8 p-4 transition-colors hover:bg-[#3E715C]/12"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3E715C] text-white">
                              <SparklesIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[#1a2e23]">
                                Prov Ciri gratis
                              </p>
                              <p className="text-xs text-[#8a9a8e]">
                                14 dager uten kredittkort
                              </p>
                            </div>
                            <ArrowRightIcon className="h-4 w-4 text-[#3E715C] transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* LOSNINGER */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-sm text-[#4a5e52] hover:bg-[#3E715C]/5 hover:text-[#1a2e23] data-[state=open]:bg-[#3E715C]/5 data-[state=open]:text-[#1a2e23]">
                    Losninger
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="p-5">
                    <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.15em] uppercase text-[#3E715C]">
                      Hvem er du?
                    </p>
                    <ul className="grid w-[480px] grid-cols-2 gap-1">
                      {SOLUTIONS.map((item) => (
                        <ListItem
                          key={item.title}
                          href={item.href}
                          icon={item.icon}
                          title={item.title}
                        >
                          {item.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* RESSURSER */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-sm text-[#4a5e52] hover:bg-[#3E715C]/5 hover:text-[#1a2e23] data-[state=open]:bg-[#3E715C]/5 data-[state=open]:text-[#1a2e23]">
                    Ressurser
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="p-5">
                    <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.15em] uppercase text-[#3E715C]">
                      Ressurser
                    </p>
                    <ul className="grid w-[480px] grid-cols-2 gap-1">
                      {RESOURCES.map((item) => (
                        <ListItem
                          key={item.title}
                          href={item.href}
                          icon={item.icon}
                          title={item.title}
                        >
                          {item.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm text-[#4a5e52] transition-colors hover:text-[#1a2e23] sm:block"
            >
              Logg inn
            </Link>
            <Link
              href="/register"
              className="hidden rounded-full bg-[#3E715C] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-[#5B906F] hover:shadow-lg hover:shadow-[#3E715C]/25 sm:block"
            >
              Kom i gang
            </Link>
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-[#4a5e52] transition-colors hover:bg-[#3E715C]/5 hover:text-[#1a2e23] md:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-white/98 backdrop-blur-xl"
          >
            <div className="flex h-16 items-center justify-between px-6">
              <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
                <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-[#5B906F]/30">
                  <Image src="/ciribakgrunn.png" alt="Ciri" width={36} height={36} className="h-full w-full object-cover" />
                </div>
                <span className="text-xl tracking-tight text-[#1a2e23]">Ciri</span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-[#4a5e52] hover:text-[#1a2e23]"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 pt-8 pb-20" style={{ maxHeight: "calc(100vh - 64px)" }}>
              {/* Produkt section */}
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#3E715C]">Produkt</p>
              <div className="mt-3 space-y-1">
                {PRODUCT_FEATURES.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.04 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-[#3E715C]/5"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3E715C]/8 text-[#5B906F]">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1a2e23]">{item.title}</p>
                        <p className="text-xs text-[#8a9a8e]">{item.description}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Losninger section */}
              <p className="mt-8 text-[10px] font-bold tracking-[0.15em] uppercase text-[#3E715C]">Losninger</p>
              <div className="mt-3 space-y-1">
                {SOLUTIONS.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-[#3E715C]/5"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3E715C]/8 text-[#5B906F]">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1a2e23]">{item.title}</p>
                        <p className="text-xs text-[#8a9a8e]">{item.description}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Quick links */}
              <p className="mt-8 text-[10px] font-bold tracking-[0.15em] uppercase text-[#3E715C]">Mer</p>
              <div className="mt-3 space-y-1">
                {RESOURCES.map((r) => ({ label: r.title, href: r.href, icon: r.icon })).map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.04 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-[#3E715C]/5"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3E715C]/8 text-[#5B906F]">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-medium text-[#1a2e23]">{item.label}</p>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mt-10 flex flex-col items-center gap-4"
              >
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="w-full rounded-full bg-[#3E715C] py-3.5 text-center text-base font-medium text-white"
                >
                  Kom i gang gratis
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-[#8a9a8e]"
                >
                  Logg inn
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
