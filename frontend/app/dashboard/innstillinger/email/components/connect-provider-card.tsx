"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LinkIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleIcon, MicrosoftIcon } from "./provider-icons";

const PROVIDER_CONFIG = {
  google: {
    name: "Gmail",
    description: "Koble til din Google-konto for å hente fakturaer fra Gmail automatisk.",
    icon: GoogleIcon,
    gradient: "from-blue-500/10 via-red-500/5 to-yellow-500/10",
  },
  microsoft: {
    name: "Outlook",
    description: "Koble til din Microsoft-konto for å hente fakturaer fra Outlook automatisk.",
    icon: MicrosoftIcon,
    gradient: "from-blue-500/10 via-green-500/5 to-yellow-500/10",
  },
} as const;

interface ConnectProviderCardProps {
  provider: "google" | "microsoft";
  configured: boolean;
  comingSoon?: boolean;
  onConnect: (provider: "google" | "microsoft") => void;
}

export default function ConnectProviderCard({
  provider,
  configured,
  comingSoon = false,
  onConnect,
}: ConnectProviderCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    if (comingSoon) return;
    setIsConnecting(true);
    onConnect(provider);
  };

  const { name, description, icon: Icon, gradient } = PROVIDER_CONFIG[provider];
  const isDisabled = comingSoon || !configured;

  return (
    <motion.div
      whileHover={!isDisabled ? { scale: 1.01 } : undefined}
      whileTap={!isDisabled ? { scale: 0.99 } : undefined}
      className={cn("group relative", !isDisabled && "cursor-pointer")}
      onClick={!isDisabled ? handleConnect : undefined}
    >
      <Card
        className={cn(
          "relative overflow-hidden border-dashed transition-all duration-300",
          isDisabled
            ? "cursor-not-allowed border-slate-200/50"
            : "border-[var(--primary)]/30 hover:border-[var(--primary)]/50 hover:shadow-lg hover:shadow-[var(--primary)]/5"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br transition-opacity duration-300",
            isDisabled ? "opacity-0" : "opacity-0 group-hover:opacity-100",
            gradient
          )}
        />

        {comingSoon && (
          <div className="absolute inset-0 z-10 bg-slate-100/60 backdrop-blur-[1px] dark:bg-slate-900/60" />
        )}

        <CardContent className={cn("relative flex items-center gap-4 p-6", comingSoon && "z-20")}>
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-xl border bg-white shadow-sm transition-all duration-300 dark:bg-slate-800",
              !isDisabled && "group-hover:shadow-md",
              comingSoon && "opacity-50 grayscale"
            )}
          >
            <Icon className="size-7" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "font-display text-lg font-semibold tracking-tight",
                  comingSoon && "text-muted-foreground"
                )}
              >
                {name}
              </h3>
              {comingSoon && (
                <Badge
                  variant="outline"
                  className="border-amber-500/30 bg-amber-500/10 text-xs text-amber-600"
                >
                  Kommer snart
                </Badge>
              )}
            </div>
            <p className={cn("text-muted-foreground text-sm", comingSoon && "opacity-70")}>
              {comingSoon ? "Microsoft Outlook-integrasjon er under utvikling." : description}
            </p>
          </div>

          {!comingSoon && configured ? (
            <Button disabled={isConnecting} className="bg-[var(--primary)] hover:bg-[var(--primary)]/90">
              {isConnecting ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <LinkIcon className="mr-2 size-4" />
              )}
              Koble til
            </Button>
          ) : !comingSoon ? (
            <Badge variant="secondary" className="text-xs">
              Ikke konfigurert
            </Badge>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
