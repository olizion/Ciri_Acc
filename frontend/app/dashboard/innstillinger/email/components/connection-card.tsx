"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2Icon,
  AlertCircleIcon,
  ClockIcon,
  InboxIcon,
  FileTextIcon,
  RefreshCwIcon,
  UnlinkIcon,
  Loader2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmailConnection } from "../types";
import { GoogleIcon, MicrosoftIcon } from "./provider-icons";

const STATUS_CONFIG = {
  active: {
    label: "Aktiv",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: CheckCircle2Icon,
  },
  inactive: {
    label: "Inaktiv",
    color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    icon: ClockIcon,
  },
  error: {
    label: "Feil",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: AlertCircleIcon,
  },
  expired: {
    label: "Utløpt",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: AlertCircleIcon,
  },
} as const;

function formatLastSync(date: string | null): string {
  if (!date) return "Aldri synkronisert";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Akkurat nå";
  if (minutes < 60) return `${minutes} min siden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} timer siden`;
  const days = Math.floor(hours / 24);
  return `${days} dager siden`;
}

interface ConnectionCardProps {
  connection: EmailConnection;
  onToggle: (id: string) => void;
  onSync: (id: string) => void;
  onDisconnect: (id: string) => void;
}

export default function ConnectionCard({
  connection,
  onToggle,
  onSync,
  onDisconnect,
}: ConnectionCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await onSync(connection.id);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const status = STATUS_CONFIG[connection.status] ?? STATUS_CONFIG.inactive;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
      className="group relative"
    >
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 via-transparent to-[var(--primary)]/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <Card className="relative overflow-hidden border-[var(--primary)]/10 bg-gradient-to-br from-white to-[var(--primary)]/[0.02] dark:from-slate-900 dark:to-[var(--primary)]/[0.05]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex size-14 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                {connection.provider === "google" ? (
                  <GoogleIcon className="size-7" />
                ) : (
                  <MicrosoftIcon className="size-7" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold tracking-tight">
                    {connection.email_address}
                  </h3>
                  <Badge variant="outline" className={cn("text-xs", status.color)}>
                    <StatusIcon className="mr-1 size-3" />
                    {status.label}
                  </Badge>
                </div>

                <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <ClockIcon className="size-3.5" />
                  Sist synkronisert: {formatLastSync(connection.last_sync_at)}
                </p>

                {connection.last_error && (
                  <p className="flex items-center gap-1.5 text-sm text-red-500">
                    <AlertCircleIcon className="size-3.5" />
                    {connection.last_error}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm">
                {connection.is_active ? "På" : "Av"}
              </span>
              <Switch
                checked={connection.is_active}
                onCheckedChange={() => onToggle(connection.id)}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--primary)]/10 bg-[var(--primary)]/[0.03] p-4 transition-colors hover:bg-[var(--primary)]/[0.05]">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[var(--primary)]/10 p-2">
                  <InboxIcon className="size-4 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">E-poster behandlet</p>
                  <p className="font-display text-2xl font-bold tracking-tight">
                    {connection.emails_processed.toLocaleString("nb-NO")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--primary)]/10 bg-[var(--primary)]/[0.03] p-4 transition-colors hover:bg-[var(--primary)]/[0.05]">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[var(--primary)]/10 p-2">
                  <FileTextIcon className="size-4 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Bilag opprettet</p>
                  <p className="font-display text-2xl font-bold tracking-tight">
                    {connection.invoices_created.toLocaleString("nb-NO")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={isSyncing || !connection.is_active}
                    className="border-[var(--primary)]/20 hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
                  >
                    {isSyncing ? (
                      <Loader2Icon className="mr-2 size-4 animate-spin" />
                    ) : (
                      <RefreshCwIcon className="mr-2 size-4" />
                    )}
                    Synkroniser nå
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Hent nye e-poster umiddelbart</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
                >
                  <UnlinkIcon className="mr-2 size-4" />
                  Koble fra
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Koble fra e-postkonto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dette vil stoppe automatisk fakturahenting fra {connection.email_address}.
                    Eksisterende bilag vil ikke bli slettet.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDisconnect(connection.id)}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Koble fra
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
