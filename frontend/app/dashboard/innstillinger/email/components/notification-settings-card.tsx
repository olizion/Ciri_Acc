"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BellIcon,
  MailIcon,
  CalendarDaysIcon,
  ClockIcon,
  SendIcon,
  Loader2Icon,
} from "lucide-react";
import type { NotificationSettings } from "../types";
import { DAY_LABELS } from "../constants";

interface NotificationSettingsCardProps {
  settings: NotificationSettings;
  onSave: (updated: NotificationSettings) => void;
}

export default function NotificationSettingsCard({
  settings: notifSettings,
  onSave,
}: NotificationSettingsCardProps) {
  const [enabled, setEnabled] = useState(notifSettings.notification_enabled);
  const [email, setEmail] = useState(notifSettings.notification_email || "");
  const [day, setDay] = useState(notifSettings.notification_day);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed =
      enabled !== notifSettings.notification_enabled ||
      email !== (notifSettings.notification_email || "") ||
      day !== notifSettings.notification_day;
    setHasChanges(changed);
  }, [enabled, email, day, notifSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({
      notification_enabled: enabled,
      notification_email: email || null,
      notification_day: day,
    });
    setIsSaving(false);
    setHasChanges(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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

        <CardContent className="relative p-6">
          {/* Header row with toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex size-14 items-center justify-center rounded-xl border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary)]/5 shadow-sm">
                <BellIcon className="size-6 text-[var(--primary)]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  Ukentlig oppsummering
                </h3>
                <p className="text-muted-foreground text-sm">
                  Få en e-post med oversikt over transaksjoner som mangler bilag
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm">{enabled ? "På" : "Av"}</span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>

          {/* Settings fields - animated expand */}
          <AnimatePresence>
            {enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="notif-email" className="flex items-center gap-1.5 text-sm font-medium">
                      <MailIcon className="size-3.5 text-[var(--primary)]" />
                      E-postadresse
                    </Label>
                    <Input
                      id="notif-email"
                      type="email"
                      placeholder="din@epost.no"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-[var(--primary)]/15 bg-white/50 transition-colors focus:border-[var(--primary)]/40 focus:ring-[var(--primary)]/20 dark:bg-slate-800/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notif-day" className="flex items-center gap-1.5 text-sm font-medium">
                      <CalendarDaysIcon className="size-3.5 text-[var(--primary)]" />
                      Ukedag
                    </Label>
                    <Select value={String(day)} onValueChange={(v) => setDay(Number(v))}>
                      <SelectTrigger className="border-[var(--primary)]/15 bg-white/50 transition-colors focus:border-[var(--primary)]/40 focus:ring-[var(--primary)]/20 dark:bg-slate-800/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DAY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <ClockIcon className="size-3" />
                    Sendes hver {DAY_LABELS[day]?.toLowerCase()} kl. 08:00
                  </p>

                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges || !email}
                    className="bg-[var(--primary)] hover:bg-[var(--primary)]/90"
                  >
                    {isSaving ? (
                      <Loader2Icon className="mr-2 size-4 animate-spin" />
                    ) : (
                      <SendIcon className="mr-2 size-4" />
                    )}
                    Lagre
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
