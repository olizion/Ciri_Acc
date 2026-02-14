"use client";

import { useEffect, useState } from "react";
/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { motion } from "framer-motion";

interface CiriLoadingToastProps {
  fileName: string;
  messages: string[];
  messageInterval?: number;
}

export function CiriLoadingToast({
  fileName,
  messages,
  messageInterval = 4000
}: CiriLoadingToastProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, messageInterval);
    return () => clearInterval(interval);
  }, [messages.length, messageInterval]);

  return (
    <div className="flex items-center gap-3">
      {/* Ciri Avatar with pulsating animation */}
      <div className="relative shrink-0">
        <div className="relative size-10 overflow-hidden rounded-full shadow-md ring-2 ring-[var(--primary)]/20">
          <Image
            src="/ciribakgrunn.png"
            alt="Ciri"
            width={40}
            height={40}
            className="size-full object-cover"
          />
        </div>
        {/* Pulsating ring animation */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[var(--primary)]"
          animate={{
            scale: [1, 1.4, 1.4],
            opacity: [0.8, 0, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[var(--primary)]"
          animate={{
            scale: [1, 1.4, 1.4],
            opacity: [0.8, 0, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
            delay: 0.5
          }}
        />
      </div>

      {/* Text content */}
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-sm">Behandler bilag</span>
        <motion.span
          key={messageIndex}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="text-xs text-muted-foreground"
        >
          {messages[messageIndex]}
        </motion.span>
        <span className="text-xs text-muted-foreground/60 truncate mt-0.5">
          {fileName}
        </span>
      </div>
    </div>
  );
}

export function CiriSuccessToast({
  vendor,
  amount,
  vendorLogo
}: {
  vendor: string;
  amount: string;
  vendorLogo?: string | null;
}) {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="flex items-center gap-3">
      {/* Vendor logo or Ciri avatar */}
      <div className="relative size-10 overflow-hidden rounded-full shadow-md ring-2 ring-green-500/30 bg-white">
        {vendorLogo && !logoError ? (
          // Use regular img for external Brandfetch URLs
          <img
            src={vendorLogo}
            alt={vendor}
            width={40}
            height={40}
            className="size-full object-contain p-1"
            onError={() => setLogoError(true)}
          />
        ) : (
          <Image
            src="/ciribakgrunn.png"
            alt="Ciri"
            width={40}
            height={40}
            className="size-full object-cover"
          />
        )}
        {/* Success checkmark overlay */}
        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
          <svg className="size-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-sm">Bilag registrert!</span>
        <span className="text-xs text-muted-foreground">
          {vendor} — {amount}
        </span>
      </div>
    </div>
  );
}

export function CiriErrorToast({
  fileName,
  error
}: {
  fileName: string;
  error: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {/* Ciri avatar (grayscale) with error indicator */}
      <div className="relative shrink-0">
        <div className="relative size-10 overflow-hidden rounded-full shadow-md ring-2 ring-red-500/30">
          <Image
            src="/ciribakgrunn.png"
            alt="Ciri"
            width={40}
            height={40}
            className="size-full object-cover grayscale"
          />
        </div>
        {/* Error X overlay */}
        <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-red-500 flex items-center justify-center">
          <svg className="size-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>

      <div className="flex flex-col">
        <span className="font-medium text-sm">Kunne ikke behandle</span>
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          {error}
        </span>
      </div>
    </div>
  );
}
