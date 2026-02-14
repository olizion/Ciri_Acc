import React from "react";
import { ThemeProvider } from "next-themes";
import { fontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import "../globals.css";

export const metadata = {
  title: "Faktura | Ciri",
};

export default function FakturaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div
        className={cn(
          "min-h-screen bg-[#f0f2ed] font-sans",
          fontVariables
        )}
      >
        {children}
      </div>
    </ThemeProvider>
  );
}
