"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MailIcon, ArrowLeftIcon, CheckCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CiriLogo from "@/components/layout/ciri-logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitted(true);
    setIsLoading(false);
  };

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
          className="w-full max-w-md"
        >
          <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/80 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-[var(--primary)]/10 to-transparent px-8 py-6">
              <div className="flex items-center gap-3">
                <CiriLogo size="md" />
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    Glemt passord?
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Vi sender deg en tilbakestillingslenke
                  </p>
                </div>
              </div>
            </div>

            {/* Form / Success */}
            <div className="px-8 py-6">
              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircleIcon className="size-8 text-green-600" />
                  </div>
                  <h2 className="mb-2 text-lg font-semibold">Sjekk e-posten din</h2>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Vi har sendt en tilbakestillingslenke til{" "}
                    <span className="font-medium text-foreground">{email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Finner du den ikke? Sjekk søppelpost-mappen eller{" "}
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-[var(--primary)] hover:underline"
                    >
                      prøv igjen
                    </button>
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
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
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isLoading || !email}
                  >
                    {isLoading ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        Sender...
                      </>
                    ) : (
                      "Send tilbakestillingslenke"
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-muted/30 px-8 py-4">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftIcon className="size-4" />
                Tilbake til innlogging
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
