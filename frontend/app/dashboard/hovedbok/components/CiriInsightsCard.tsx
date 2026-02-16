import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CiriLogo from "@/components/layout/ciri-logo";
import {
  SparklesIcon,
  AlertCircleIcon,
  InfoIcon,
  ArrowRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CiriInnsikt } from "../types";

interface CiriInsightsCardProps {
  ciriInnsikter: CiriInnsikt[];
  transaksjonCount: number;
  onNavigateToKonto: (kontonummer: string) => void;
}

export function CiriInsightsCard({ ciriInnsikter, transaksjonCount, onNavigateToKonto }: CiriInsightsCardProps) {
  if (ciriInnsikter.length === 0) return null;

  return (
    <Card className="border-[var(--primary)]/20 bg-gradient-to-r from-[var(--primary)]/5 to-purple-50/50 dark:to-purple-950/20">
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <CiriLogo size="md" />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[var(--primary)]"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Ciri har analysert {transaksjonCount} transaksjoner</p>
              <Badge variant="secondary" className="text-xs">
                <SparklesIcon className="size-3 mr-1" />
                AI
              </Badge>
            </div>
            <div className="space-y-1.5">
              {ciriInnsikter.map((innsikt, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-2 text-sm rounded-md px-3 py-1.5",
                    innsikt.type === "warning"
                      ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                      : "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
                  )}
                >
                  {innsikt.type === "warning" ? (
                    <AlertCircleIcon className="size-4 shrink-0" />
                  ) : (
                    <InfoIcon className="size-4 shrink-0" />
                  )}
                  <span>{innsikt.message}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 px-2 text-xs"
                    onClick={() => onNavigateToKonto(innsikt.konto)}
                  >
                    Se konto {innsikt.konto}
                    <ArrowRightIcon className="size-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
