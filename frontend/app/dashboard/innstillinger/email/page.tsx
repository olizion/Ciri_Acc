"use client";

import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MailCheckIcon,
  SparklesIcon,
  SettingsIcon,
  ZapIcon,
  ShieldCheckIcon,
  FileTextIcon,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import LearnMoreDocs from "@/components/learn-more-docs";
import { useCrystallize } from "@/lib/use-crystallize";
import type { EmailConnection, OAuthStatus, NotificationSettings } from "./types";
import {
  ConnectionCard,
  ConnectProviderCard,
  FeatureHighlight,
  NotificationSettingsCard,
} from "./components";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Ugyldig forespørsel. Prøv igjen.",
  token_exchange_failed: "Kunne ikke fullføre tilkobling. Prøv igjen.",
  userinfo_failed: "Kunne ikke hente brukerinfo. Prøv igjen.",
  connection_failed: "Tilkobling feilet. Prøv igjen.",
};

const DEFAULT_OAUTH_STATUS: OAuthStatus = {
  google_configured: false,
  microsoft_configured: false,
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  notification_email: null,
  notification_day: 1,
  notification_enabled: false,
};

export default function EmailSettingsPage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: connections = [], isLoading } = useQuery({
    queryKey: queryKeys.email.connections,
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/email/oauth/connections?company_id=${COMPANY_ID}`
      );
      if (!res.ok) return [] as EmailConnection[];
      const data = await res.json();
      return (data.connections || []) as EmailConnection[];
    },
  });

  const { data: oauthStatus = DEFAULT_OAUTH_STATUS } = useQuery({
    queryKey: queryKeys.email.oauthStatus,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/email/oauth/status`);
      if (!res.ok) return DEFAULT_OAUTH_STATUS;
      return (await res.json()) as OAuthStatus;
    },
  });

  const { data: notifSettings = DEFAULT_NOTIFICATION_SETTINGS } = useQuery({
    queryKey: queryKeys.email.notificationSettings,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/bank/notification-settings`);
      if (!res.ok) return DEFAULT_NOTIFICATION_SETTINGS;
      return (await res.json()) as NotificationSettings;
    },
  });

  const crystallize = useCrystallize(isLoading);

  // Handle OAuth callback on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    const email = params.get("email");

    if (success) {
      toast.success(`E-postkonto tilkoblet: ${email || ""}`.trim());
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({ queryKey: queryKeys.email.connections });
    } else if (error) {
      toast.error(OAUTH_ERROR_MESSAGES[error] || "Noe gikk galt. Prøv igjen.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [queryClient]);

  // Mutations
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `${API_BASE_URL}/api/email/oauth/connections/${id}/toggle`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Toggle failed");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.email.connections });
      const previous = queryClient.getQueryData<EmailConnection[]>(queryKeys.email.connections);
      queryClient.setQueryData<EmailConnection[]>(queryKeys.email.connections, (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c))
      );
      return { previous };
    },
    onSuccess: (_data, id) => {
      const connection = connections.find((c) => c.id === id);
      toast.success(
        connection?.is_active
          ? "E-postsynkronisering aktivert"
          : "E-postsynkronisering pauset"
      );
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.email.connections, context.previous);
      }
      toast.error("Kunne ikke oppdatere tilkobling");
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `${API_BASE_URL}/api/email/oauth/connections/${id}/sync`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Sync failed");
    },
    onSuccess: () => toast.success("Synkronisering startet"),
    onError: () => toast.error("Kunne ikke starte synkronisering"),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/email/oauth/connections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Disconnect failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.email.connections });
      toast.success("E-postkonto frakoblet");
    },
    onError: () => toast.error("Kunne ikke koble fra e-postkonto"),
  });

  const saveNotificationsMutation = useMutation({
    mutationFn: async (updated: NotificationSettings) => {
      const res = await fetch(`${API_BASE_URL}/api/bank/notification-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("Save failed");
      return (await res.json()) as NotificationSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.email.notificationSettings, data);
      toast.success("Varslingsinnstillinger lagret");
    },
    onError: () => toast.error("Kunne ikke lagre varslingsinnstillinger"),
  });

  const handleConnect = useCallback((provider: "google" | "microsoft") => {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${API_BASE_URL}/api/email/oauth/${provider}/authorize?company_id=${COMPANY_ID}&return_url=${returnUrl}`;
  }, []);

  const handleToggle = useCallback(
    (id: string) => toggleMutation.mutate(id),
    [toggleMutation]
  );
  const handleSync = useCallback(
    (id: string) => syncMutation.mutate(id),
    [syncMutation]
  );
  const handleDisconnect = useCallback(
    (id: string) => disconnectMutation.mutate(id),
    [disconnectMutation]
  );
  const handleSaveNotifications = useCallback(
    (updated: NotificationSettings) => saveNotificationsMutation.mutate(updated),
    [saveNotificationsMutation]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`space-y-2 ${crystallize(1)}`}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 p-3">
            <MailCheckIcon className="size-6 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">
              E-postintegrasjon
            </h1>
            <p className="text-muted-foreground">
              Koble til e-postkontoen din for automatisk fakturahenting
            </p>
          </div>
        </div>
      </motion.div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className={crystallize(2)}
      >
        <Card className="overflow-hidden border-[var(--primary)]/20 bg-gradient-to-r from-[var(--primary)]/5 via-[var(--primary)]/[0.02] to-transparent">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-[var(--primary)]/10 p-3">
                <SparklesIcon className="size-6 text-[var(--primary)]" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-display text-lg font-semibold">
                    Automatisk fakturahenting med Ciri
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    Ciri overvåker innboksen din og henter ut fakturaer automatisk. PDF-vedlegg
                    analyseres med AI og gjøres om til bilag - helt uten manuelt arbeid.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <FeatureHighlight
                    icon={ZapIcon}
                    title="Automatisk"
                    description="Sjekker e-post hvert 5. minutt"
                  />
                  <FeatureHighlight
                    icon={ShieldCheckIcon}
                    title="Sikker"
                    description="Kun lesetilgang til e-post"
                  />
                  <FeatureHighlight
                    icon={FileTextIcon}
                    title="AI-analyse"
                    description="Claude leser og tolker fakturaer"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Connected Accounts */}
      {connections.length > 0 && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Tilkoblede kontoer</h2>
            <Badge variant="secondary" className="bg-[var(--primary)]/10 text-[var(--primary)]">
              {connections.filter((c) => c.is_active).length} aktiv
              {connections.filter((c) => c.is_active).length !== 1 ? "e" : ""}
            </Badge>
          </div>

          <AnimatePresence mode="popLayout">
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onToggle={handleToggle}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
              />
            ))}
          </AnimatePresence>
        </motion.section>
      )}

      {/* Connect New Account */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`space-y-4 ${crystallize(3)}`}
      >
        <h2 className="font-display text-lg font-semibold">
          {connections.length > 0 ? "Koble til flere kontoer" : "Koble til e-postkonto"}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <ConnectProviderCard
            provider="google"
            configured={oauthStatus.google_configured}
            onConnect={handleConnect}
          />
          <ConnectProviderCard
            provider="microsoft"
            configured={oauthStatus.microsoft_configured}
            comingSoon={true}
            onConnect={handleConnect}
          />
        </div>
      </motion.section>

      {/* Notification Settings */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className={`space-y-4 ${crystallize(4)}`}
      >
        <h2 className="font-display text-lg font-semibold">Varsler</h2>
        <NotificationSettingsCard settings={notifSettings} onSave={handleSaveNotifications} />
      </motion.section>

      {/* Help Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
      >
        <div className="flex items-start gap-3">
          <SettingsIcon className="text-muted-foreground mt-0.5 size-5" />
          <div className="text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Tips:</strong> For beste resultat, bruk en
              dedikert e-postadresse for fakturaer (f.eks. faktura@dittfirma.no). Ciri vil kun
              behandle e-poster med relevante vedlegg som PDF, bilder, eller regneark.
            </p>
          </div>
        </div>
      </motion.div>

      <LearnMoreDocs sections={["e-post", "sikkerhet"]} />
    </div>
  );
}
