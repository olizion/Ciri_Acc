"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getLogoUrl } from "@/lib/brandfetch";
import { vendorDomains } from "../data/vendor-domains";

interface CompanyLogoProps {
  domain?: string;
  companyName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12"
};

function CompanyLogo({
  domain,
  companyName,
  size = "md",
  className
}: CompanyLogoProps) {
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  // Get domain from vendor name if not provided
  const logoDomain = domain || vendorDomains[companyName];

  // Generate initials fallback
  const initials = companyName
    .split(" ")
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();

  // Reset state when domain changes
  useEffect(() => {
    setLogoLoaded(false);
    setLogoFailed(false);
  }, [logoDomain]);

  // No domain or failed to load - show initials
  if (!logoDomain || logoFailed) {
    return (
      <div className={cn(
        sizeClasses[size],
        "flex items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 text-[var(--primary)] font-semibold text-xs",
        className
      )}>
        {initials || "?"}
      </div>
    );
  }

  return (
    <div className={cn(
      sizeClasses[size],
      "relative flex items-center justify-center rounded-lg bg-white border overflow-hidden",
      className
    )}>
      {/* Always show initials as base layer */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--primary)]/10 to-transparent text-[var(--primary)] font-semibold text-xs transition-opacity duration-300",
        logoLoaded && "opacity-0"
      )}>
        {initials}
      </div>
      {/* Logo fades in on top when loaded */}
      <img
        src={getLogoUrl(logoDomain, { size: size === "lg" ? "medium" : "small" }) || ""}
        alt={companyName}
        loading="lazy"
        decoding="async"
        className={cn(
          "object-contain p-1.5 transition-opacity duration-300",
          sizeClasses[size],
          logoLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLogoLoaded(true)}
        onError={() => setLogoFailed(true)}
      />
    </div>
  );
}

export default CompanyLogo;
