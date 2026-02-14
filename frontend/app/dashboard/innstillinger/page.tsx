"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InnstillingerPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/innstillinger/email");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-muted-foreground animate-pulse">Laster innstillinger...</div>
    </div>
  );
}
