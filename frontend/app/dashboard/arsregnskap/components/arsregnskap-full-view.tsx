"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUpIcon, ScaleIcon, DownloadIcon, EyeIcon, Loader2Icon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccountGroupSection } from "./account-group-section";
import type { AccountGroup } from "../types";

interface ArsregnskapFullViewProps {
  resultatData: AccountGroup[];
  balanseAktivaData: AccountGroup[];
  balansePassivaData: AccountGroup[];
  isLoading: boolean;
  year: string;
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 gap-4 py-3 px-4 border-b">
          <div className="col-span-2"><div className="h-4 bg-muted rounded w-16" /></div>
          <div className="col-span-6"><div className="h-4 bg-muted rounded w-48" /></div>
          <div className="col-span-2"><div className="h-4 bg-muted rounded w-20 ml-auto" /></div>
          <div className="col-span-2"><div className="h-4 bg-muted rounded w-20 ml-auto" /></div>
        </div>
      ))}
    </div>
  );
}

export function ArsregnskapFullView({
  resultatData,
  balanseAktivaData,
  balansePassivaData,
  isLoading,
  year,
}: ArsregnskapFullViewProps) {
  const [activeTab, setActiveTab] = useState<"resultat" | "balanse">("resultat");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "resultat" ? "default" : "outline"}
            onClick={() => setActiveTab("resultat")}
            className="gap-2"
          >
            <TrendingUpIcon className="size-4" />
            Resultatregnskap
          </Button>
          <Button
            variant={activeTab === "balanse" ? "default" : "outline"}
            onClick={() => setActiveTab("balanse")}
            className="gap-2"
          >
            <ScaleIcon className="size-4" />
            Balanse
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <DownloadIcon className="size-4 mr-2" />
            Eksporter
          </Button>
          <Button variant="outline" size="sm">
            <EyeIcon className="size-4 mr-2" />
            Skriv ut
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "resultat" && (
          <motion.div
            key="resultat"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="font-display">Resultatregnskap</CardTitle>
                <CardDescription>Regnskapsåret {year}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-12 gap-4 py-3 px-4 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                  <div className="col-span-2">Konto</div>
                  <div className="col-span-6">Beskrivelse</div>
                  <div className="col-span-2 text-right">{year}</div>
                  <div className="col-span-2 text-right">{Number(year) - 1}</div>
                </div>
                {isLoading ? (
                  <TableSkeleton />
                ) : resultatData.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    Ingen posteringer funnet for {year}
                  </div>
                ) : (
                  <div>
                    {resultatData.map((group, index) => (
                      <AccountGroupSection key={group.name} group={group} index={index} year={year} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "balanse" && (
          <motion.div
            key="balanse"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="font-display">Balanse - Eiendeler</CardTitle>
                <CardDescription>Per 31.12.{year}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-12 gap-4 py-3 px-4 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                  <div className="col-span-2">Konto</div>
                  <div className="col-span-6">Beskrivelse</div>
                  <div className="col-span-2 text-right">{year}</div>
                  <div className="col-span-2 text-right">{Number(year) - 1}</div>
                </div>
                {isLoading ? (
                  <TableSkeleton />
                ) : balanseAktivaData.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    Ingen balansedata funnet
                  </div>
                ) : (
                  <div>
                    {balanseAktivaData.map((group, index) => (
                      <AccountGroupSection key={group.name} group={group} index={index} year={year} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="font-display">Balanse - Egenkapital og gjeld</CardTitle>
                <CardDescription>Per 31.12.{year}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-12 gap-4 py-3 px-4 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                  <div className="col-span-2">Konto</div>
                  <div className="col-span-6">Beskrivelse</div>
                  <div className="col-span-2 text-right">{year}</div>
                  <div className="col-span-2 text-right">{Number(year) - 1}</div>
                </div>
                {isLoading ? (
                  <TableSkeleton />
                ) : balansePassivaData.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    Ingen balansedata funnet
                  </div>
                ) : (
                  <div>
                    {balansePassivaData.map((group, index) => (
                      <AccountGroupSection key={group.name} group={group} index={index} year={year} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
