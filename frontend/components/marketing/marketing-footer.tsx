"use client";

import Link from "next/link";
import Image from "next/image";

const FOOTER_LINKS = {
  Produkt: [
    { label: "AI Bokforing", href: "/produkt/ai-bokforing" },
    { label: "Bankavstemming", href: "/produkt/bankavstemming" },
    { label: "Fakturering", href: "/produkt/fakturering" },
    { label: "MVA", href: "/produkt/mva" },
    { label: "Lonn", href: "/produkt/lonn" },
    { label: "Rapporter", href: "/produkt/rapporter" },
    { label: "E-post", href: "/produkt/e-post" },
    { label: "Sikkerhet", href: "/produkt/sikkerhet" },
  ],
  Losninger: [
    { label: "Enkeltpersonforetak", href: "/losninger/enkeltpersonforetak" },
    { label: "Aksjeselskap", href: "/losninger/aksjeselskap" },
    { label: "Regnskapsforere", href: "/losninger/regnskapsforere" },
    { label: "Nettbutikk", href: "/losninger/nettbutikk" },
  ],
  Ressurser: [
    { label: "Dokumentasjon", href: "/dokumentasjon" },
    { label: "Blogg", href: "#" },
    { label: "Brukerstotte", href: "#" },
  ],
};

export default function MarketingFooter() {
  return (
    <footer className="relative border-t border-[#d4dbd6] bg-[#f5f7f2]">
      <div className="mx-auto max-w-[var(--marketing-container)] px-6 pt-20 pb-10">
        <div className="grid grid-cols-2 gap-12 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-8 w-8 overflow-hidden rounded-full ring-1 ring-[#5B906F]/20">
                <Image
                  src="/ciribakgrunn.png"
                  alt="Ciri"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-lg text-[#1a2e23]">
                Ciri
              </span>
            </Link>
            <p className="mt-4 max-w-[200px] text-sm leading-relaxed text-[#8a9a8e]">
              AI-drevet regnskap for norske bedrifter. Enklere har det aldri vært.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#3E715C]">
                {title}
              </p>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#8a9a8e] transition-colors hover:text-[#4a5e52]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="mt-16 h-px bg-gradient-to-r from-transparent via-[#d4dbd6] to-transparent" />

        {/* Bottom */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-[#8a9a8e]">
            &copy; {new Date().getFullYear()} Ciri AS. Alle rettigheter reservert.
          </p>
          <div className="flex gap-6 text-xs text-[#8a9a8e]">
            <Link href="#" className="hover:text-[#4a5e52]">Personvern</Link>
            <Link href="#" className="hover:text-[#4a5e52]">Vilkår</Link>
            <Link href="#" className="hover:text-[#4a5e52]">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
