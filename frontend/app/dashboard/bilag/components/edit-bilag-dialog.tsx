"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2Icon,
  PencilIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import { accountCodes, mvaCodes } from "../data/constants";
import type { Bilag } from "../types";

interface EditBilagDialogProps {
  bilag: Bilag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (bilag: Bilag) => void;
}

function EditBilagDialog({
  bilag,
  open,
  onOpenChange,
  onSave
}: EditBilagDialogProps) {
  const [formData, setFormData] = useState<Bilag | null>(null);

  // Initialize form data when bilag changes
  useState(() => {
    if (bilag) {
      setFormData({ ...bilag });
    }
  });

  // Update form data when bilag changes
  if (bilag && (!formData || formData.id !== bilag.id)) {
    setFormData({ ...bilag });
  }

  if (!bilag || !formData) return null;

  const handleSubmit = () => {
    if (formData) {
      // Validate required fields
      const hasAllRequired = formData.leverandor &&
        formData.leverandor !== "Ukjent leverandør" &&
        formData.kontonummer &&
        formData.mvaKode;

      if (hasAllRequired) {
        // Update kontonavn based on selected konto
        const selectedAccount = accountCodes.find(a => a.code === formData.kontonummer);
        onSave({
          ...formData,
          kontonavn: selectedAccount?.name || formData.kontonavn
        });
      }
    }
  };

  const isValid = formData.leverandor &&
    formData.leverandor !== "Ukjent leverandør" &&
    formData.kontonummer &&
    formData.mvaKode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilIcon className="size-5" />
            Fullfør bilag #{bilag.bilagsnummer}
          </DialogTitle>
          <DialogDescription>
            Fyll ut manglende informasjon for å fullføre registreringen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ciri guidance */}
          <div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
            <div className="flex items-start gap-3">
              <CiriLogo size="sm" className="shrink-0" />
              <div>
                <p className="font-medium text-[var(--primary)]">La meg hjelpe deg</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {bilag.ciriMessage || "Fyll ut feltene markert med rødt for å fullføre registreringen."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Leverandør */}
            <div className="space-y-2">
              <Label htmlFor="leverandor" className="flex items-center gap-2">
                Leverandør
                {bilag.missingFields?.leverandor && (
                  <Badge variant="destructive" className="text-xs">Påkrevd</Badge>
                )}
              </Label>
              <Input
                id="leverandor"
                value={formData.leverandor}
                onChange={(e) => setFormData({ ...formData, leverandor: e.target.value })}
                placeholder="Skriv inn leverandørnavn"
                className={cn(bilag.missingFields?.leverandor && formData.leverandor === "Ukjent leverandør" && "border-red-300")}
              />
            </div>

            {/* Org.nr */}
            <div className="space-y-2">
              <Label htmlFor="orgnr">Org.nr (valgfritt)</Label>
              <Input
                id="orgnr"
                value={formData.leverandorOrgnr || ""}
                onChange={(e) => setFormData({ ...formData, leverandorOrgnr: e.target.value })}
                placeholder="999 888 777"
              />
            </div>

            {/* Kontonummer */}
            <div className="space-y-2">
              <Label htmlFor="konto" className="flex items-center gap-2">
                Konto
                {bilag.missingFields?.kontonummer && (
                  <Badge variant="destructive" className="text-xs">Påkrevd</Badge>
                )}
              </Label>
              <Select
                value={formData.kontonummer}
                onValueChange={(value) => {
                  const account = accountCodes.find(a => a.code === value);
                  setFormData({
                    ...formData,
                    kontonummer: value,
                    kontonavn: account?.name || ""
                  });
                }}
              >
                <SelectTrigger className={cn(bilag.missingFields?.kontonummer && !formData.kontonummer && "border-red-300")}>
                  <SelectValue placeholder="Velg konto" />
                </SelectTrigger>
                <SelectContent>
                  {accountCodes.map((account) => (
                    <SelectItem key={account.code} value={account.code}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* MVA-kode */}
            <div className="space-y-2">
              <Label htmlFor="mvaKode" className="flex items-center gap-2">
                MVA-kode
                {bilag.missingFields?.mvaKode && (
                  <Badge variant="destructive" className="text-xs">Påkrevd</Badge>
                )}
              </Label>
              <Select
                value={formData.mvaKode}
                onValueChange={(value) => {
                  const mva = mvaCodes.find(m => m.code === value);
                  const newMvaSats = mva?.rate || 0;
                  const newMvaBelop = Math.round(formData.belopEksMva * newMvaSats / 100);
                  setFormData({
                    ...formData,
                    mvaKode: value,
                    mvaSats: newMvaSats,
                    mvaBelop: newMvaBelop,
                    totalBelop: formData.belopEksMva + newMvaBelop
                  });
                }}
              >
                <SelectTrigger className={cn(bilag.missingFields?.mvaKode && !formData.mvaKode && "border-red-300")}>
                  <SelectValue placeholder="Velg MVA-kode" />
                </SelectTrigger>
                <SelectContent>
                  {mvaCodes.map((mva) => (
                    <SelectItem key={mva.code} value={mva.code}>
                      {mva.code} - {mva.name} ({mva.rate}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Beskrivelse */}
          <div className="space-y-2">
            <Label htmlFor="beskrivelse">Beskrivelse</Label>
            <Textarea
              id="beskrivelse"
              value={formData.beskrivelse}
              onChange={(e) => setFormData({ ...formData, beskrivelse: e.target.value })}
              placeholder="Beskriv hva bilaget gjelder"
              rows={2}
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Beløp eks. MVA</span>
              <span className="font-display">kr {formData.belopEksMva.toLocaleString("nb-NO")}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-muted-foreground">MVA ({formData.mvaSats}%)</span>
              <span className="font-display">kr {formData.mvaBelop.toLocaleString("nb-NO")}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between items-center">
              <span className="font-medium">Total</span>
              <span className="font-display text-lg font-bold text-[var(--primary)]">
                kr {formData.totalBelop.toLocaleString("nb-NO")}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            <CheckCircle2Icon className="mr-2 size-4" />
            Fullfør og bokfør
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditBilagDialog;
