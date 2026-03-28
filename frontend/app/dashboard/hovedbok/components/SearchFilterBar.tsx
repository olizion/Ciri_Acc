import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SearchIcon,
  FilterIcon,
  XIcon,
  RefreshCwIcon,
  BuildingIcon,
  FolderIcon,
  WalletIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Filters } from "../types";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onRefresh,
  isRefreshing,
  searchInputRef,
}: SearchFilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilters = Object.entries(filters).filter(([_, value]) => value !== "");

  const removeFilter = (key: string) => {
    onFiltersChange({ ...filters, [key]: "" });
  };

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      ref={searchInputRef}
                      placeholder="Søk på konto, bilag, beskrivelse..."
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="pl-9 pr-20"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm p-3">
                    <p className="font-medium mb-2">Universalt søk</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Søk fritt på tvers av kontoer, bilagsnummer og beskrivelser.
                    </p>
                    <p className="font-medium mb-1 text-xs">Avanserte prefikser:</p>
                    <ul className="text-xs space-y-1">
                      <li className="flex items-center gap-2">
                        <code className="bg-muted px-1.5 py-0.5 rounded font-mono">*</code>
                        <span>Kun konto (f.eks. *1920)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <code className="bg-muted px-1.5 py-0.5 rounded font-mono">=</code>
                        <span>Eksakt beløp (f.eks. =45000)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <code className="bg-muted px-1.5 py-0.5 rounded font-mono">#</code>
                        <span>Bilagsnummer (f.eks. #B-2026)</span>
                      </li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-12 top-1/2 -translate-y-1/2 size-6"
                  onClick={() => onSearchChange("")}
                >
                  <XIcon className="size-3" />
                </Button>
              )}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
                <kbd className="bg-muted px-1.5 py-0.5 rounded text-[12px] font-mono">*</kbd>
                <kbd className="bg-muted px-1.5 py-0.5 rounded text-[12px] font-mono">=</kbd>
                <kbd className="bg-muted px-1.5 py-0.5 rounded text-[12px] font-mono">#</kbd>
              </div>
            </div>

            <Button
              variant={filterOpen ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFilterOpen(!filterOpen)}
              className="gap-2"
            >
              <FilterIcon className="size-4" />
              Filter
              {activeFilters.length > 0 && (
                <Badge variant="secondary" className="ml-1 size-5 p-0 justify-center">
                  {activeFilters.length}
                </Badge>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCwIcon className={cn("size-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map(([key, value]) => (
                <Badge
                  key={key}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {key === "kontoFra" && `Fra konto: ${value}`}
                  {key === "kontoTil" && `Til konto: ${value}`}
                  {key === "avdeling" && `Avdeling: ${value}`}
                  {key === "prosjekt" && `Prosjekt: ${value}`}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-4 p-0 hover:bg-transparent"
                    onClick={() => removeFilter(key)}
                  >
                    <XIcon className="size-3" />
                  </Button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => onFiltersChange({ kontoFra: "", kontoTil: "", avdeling: "", prosjekt: "" })}
              >
                Fjern alle
              </Button>
            </div>
          )}

          <AnimatePresence>
            {filterOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid gap-4 pt-4 border-t sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <WalletIcon className="size-3" />
                      Konto fra
                    </Label>
                    <Input
                      placeholder="f.eks. 1000"
                      value={filters.kontoFra}
                      onChange={(e) => onFiltersChange({ ...filters, kontoFra: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <WalletIcon className="size-3" />
                      Konto til
                    </Label>
                    <Input
                      placeholder="f.eks. 9999"
                      value={filters.kontoTil}
                      onChange={(e) => onFiltersChange({ ...filters, kontoTil: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <BuildingIcon className="size-3" />
                      Avdeling
                    </Label>
                    <Select
                      value={filters.avdeling}
                      onValueChange={(v) => onFiltersChange({ ...filters, avdeling: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Alle avdelinger" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salg">Salg</SelectItem>
                        <SelectItem value="marked">Marked</SelectItem>
                        <SelectItem value="utvikling">Utvikling</SelectItem>
                        <SelectItem value="admin">Administrasjon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <FolderIcon className="size-3" />
                      Prosjekt
                    </Label>
                    <Select
                      value={filters.prosjekt}
                      onValueChange={(v) => onFiltersChange({ ...filters, prosjekt: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Alle prosjekter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="p1">Prosjekt Alpha</SelectItem>
                        <SelectItem value="p2">Prosjekt Beta</SelectItem>
                        <SelectItem value="p3">Prosjekt Gamma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
