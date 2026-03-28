"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { STRATEGY_CONFIG } from "../mock-data";
import type { StrategyConfig } from "../mock-data";
import { SettingsIcon, SaveIcon, BrainCircuitIcon } from "lucide-react";

export function StrategyPanel() {
  const [config, setConfig] = useState<StrategyConfig>(STRATEGY_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);

  const update = <K extends keyof StrategyConfig>(
    key: K,
    value: StrategyConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <SettingsIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Strategi</span>
          {hasChanges && (
            <Button size="sm" className="ml-auto h-7 text-xs">
              <SaveIcon className="mr-1 h-3 w-3" />
              Lagre endringer
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Autonomy level */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium">Autonominivå</p>
              <p className="text-[12px] text-muted-foreground">
                Autopostering via alle 3 faser
              </p>
            </div>
            <Select
              value={config.autonomyLevel}
              onValueChange={(v: StrategyConfig["autonomyLevel"]) =>
                update("autonomyLevel", v)
              }
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="autonomous">Autonom</SelectItem>
                <SelectItem value="assistant">Assistent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Batch schedule */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium">Batch-plan</p>
              <p className="text-[12px] text-muted-foreground">
                Når AI kjører Fase 3
              </p>
            </div>
            <Select
              value={config.batchSchedule}
              onValueChange={(v: StrategyConfig["batchSchedule"]) =>
                update("batchSchedule", v)
              }
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mon_fri">Man + Fre</SelectItem>
                <SelectItem value="daily">Daglig</SelectItem>
                <SelectItem value="weekly">Ukentlig</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* AI Model */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium">AI-modell</p>
              <p className="text-[12px] text-muted-foreground">
                Claude-modell for Fase 3
              </p>
            </div>
            <Select
              value={config.phase3Model}
              onValueChange={(v: StrategyConfig["phase3Model"]) =>
                update("phase3Model", v)
              }
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opus">
                  <span className="flex items-center gap-1.5">
                    <BrainCircuitIcon className="h-3 w-3" />
                    Opus 4.6
                  </span>
                </SelectItem>
                <SelectItem value="sonnet">Sonnet 4.5</SelectItem>
                <SelectItem value="haiku">Haiku 4.5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Auto-ignore private */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium">Ignorer privat</p>
              <p className="text-[12px] text-muted-foreground">
                Auto-ignorer private transaksjoner
              </p>
            </div>
            <Switch
              checked={config.autoIgnorePrivate}
              onCheckedChange={(v) => update("autoIgnorePrivate", v)}
            />
          </div>

          {/* Min confidence threshold */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium">Min. konfidens</p>
              <p className="text-[12px] text-muted-foreground">
                Terskel for Fase 3-kø
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {(config.minConfidenceForQueue * 100).toFixed(0)}%
            </Badge>
          </div>

          {/* Min cluster strength */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium">Min. klyngestyrke</p>
              <p className="text-[12px] text-muted-foreground">
                For klynge-verifisering
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {(config.minClusterStrength * 100).toFixed(0)}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
