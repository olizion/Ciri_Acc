"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircleIcon,
  XCircleIcon,
  Loader2Icon,
  ArrowRightIcon,
} from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import { API_BASE_URL } from "@/lib/api";

type CallbackStatus = "loading" | "success" | "error";

export default function TinkCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <TinkCallbackContent />
    </Suspense>
  );
}

function TinkCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function handleCallback() {
      // Get parameters from Tink callback
      const code = searchParams.get("code");
      const credentialsId = searchParams.get("credentialsId");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Check for errors from Tink
      if (error) {
        setStatus("error");
        setErrorMessage(errorDescription || error || "Tilkobling avbrutt");
        return;
      }

      // Get stored session ID
      const sessionId = sessionStorage.getItem("bank_session_id");

      if (!code && !credentialsId) {
        setStatus("error");
        setErrorMessage("Mangler autorisasjonskode fra banken");
        return;
      }

      try {
        // Complete the bank connection
        const response = await fetch(`${API_BASE_URL}/api/bank/accounts/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId || "",
            authorization_code: code || credentialsId || "",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Kunne ikke fullføre tilkoblingen");
        }

        // Clear session storage
        sessionStorage.removeItem("bank_session_id");

        setStatus("success");
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Ukjent feil oppstod");
      }
    }

    handleCallback();
  }, [searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardContent className="p-8 text-center space-y-6">
            {status === "loading" && (
              <>
                <div className="flex size-16 items-center justify-center rounded-full bg-muted mx-auto">
                  <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Fullfører tilkobling...</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Vennligst vent mens vi kobler til banken din
                  </p>
                </div>
              </>
            )}

            {status === "success" && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto"
                >
                  <CheckCircleIcon className="size-8 text-emerald-600 dark:text-emerald-400" />
                </motion.div>
                <div>
                  <h2 className="font-display text-xl font-bold">Tilkobling vellykket!</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Banken din er nå koblet til Ciri. Transaksjoner vil bli synkronisert automatisk.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => router.push("/dashboard/bank/avstemming")}>
                    Gå til avstemming
                    <ArrowRightIcon className="size-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/dashboard/bank")}>
                    Tilbake til bank
                  </Button>
                </div>
              </>
            )}

            {status === "error" && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mx-auto"
                >
                  <XCircleIcon className="size-8 text-red-600 dark:text-red-400" />
                </motion.div>
                <div>
                  <h2 className="font-display text-xl font-bold">Noe gikk galt</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {errorMessage}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => router.push("/dashboard/bank/accounts/connect")}>
                    Prøv igjen
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/dashboard/bank")}>
                    Tilbake til bank
                  </Button>
                </div>
              </>
            )}

            <div className="flex items-center justify-center gap-2 pt-4 border-t">
              <CiriLogo size="sm" />
              <span className="text-xs text-muted-foreground">
                Sikker tilkobling via Tink (Visa)
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
