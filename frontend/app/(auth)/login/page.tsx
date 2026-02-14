"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon, ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import CiriLogo from "@/components/layout/ciri-logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      router.push("/dashboard");
    } catch {
      setError("Feil e-post eller passord. Prøv igjen.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image with Overlay */}
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
          {/* Card */}
          <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/80 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-[var(--primary)]/10 to-transparent px-8 py-6">
              <div className="flex items-center gap-3">
                <CiriLogo size="md" />
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    Velkommen tilbake
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Logg inn på din Ciri-konto
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 px-8 py-6">
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </motion.div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  E-post
                </Label>
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

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Passord
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[var(--primary)] hover:underline"
                  >
                    Glemt passord?
                  </Link>
                </div>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label
                  htmlFor="remember"
                  className="text-sm font-normal text-muted-foreground cursor-pointer"
                >
                  Husk meg på denne enheten
                </Label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full gap-2"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Logger inn...
                  </>
                ) : (
                  <>
                    Logg inn
                    <ArrowRightIcon className="size-4" />
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white/80 px-2 text-muted-foreground">
                    eller
                  </span>
                </div>
              </div>

              {/* BankID Button (Placeholder) */}
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                size="lg"
                disabled
              >
                <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
                </svg>
                BankID (kommer snart)
              </Button>
            </form>

            {/* Footer */}
            <div className="border-t bg-muted/30 px-8 py-4">
              <p className="text-center text-sm text-muted-foreground">
                Har du ikke konto?{" "}
                <Link
                  href="/register"
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  Registrer deg gratis
                </Link>
              </p>
            </div>
          </div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex justify-center gap-6 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-1">
              <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
              <span>Kryptert</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span>GDPR-kompatibel</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span>Norsk hosting</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
