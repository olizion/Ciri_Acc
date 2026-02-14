"use client";

import dynamic from "next/dynamic";

// Dynamic import to avoid hydration mismatch with Radix UI IDs
const AppSidebar = dynamic(
  () => import("@/components/layout/sidebar/app-sidebar").then((mod) => mod.AppSidebar),
  { ssr: false }
);

export function ClientSidebar({ variant }: { variant?: "inset" | "sidebar" }) {
  return <AppSidebar variant={variant} />;
}
