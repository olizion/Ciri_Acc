"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TagIcon,
  EyeOffIcon,
  ZapIcon,
  SearchIcon,
  ArrowRightIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  ChevronDownIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Rule, RuleType, RulePriority, RuleCriteria, RuleAction } from "../types";
import { categoryLabels, accountOptions } from "../constants";

// ============================================================================
// RuleDialog (Create + Edit)
// ============================================================================

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    rule_type: RuleType;
    priority: RulePriority;
    criteria: RuleCriteria;
    action: RuleAction;
  }) => void;
  editingRule?: Rule | null;
  isSaving: boolean;
  accountOptionsList?: { value: string; label: string }[];
}

export function RuleDialog({
  open,
  onOpenChange,
  onSave,
  editingRule,
  isSaving,
  accountOptionsList,
}: RuleDialogProps) {
  const acctOptions = accountOptionsList ?? accountOptions;
  const isEditing = !!editingRule;

  const [ruleType, setRuleType] = useState<RuleType>("auto_category");
  const [name, setName] = useState("");
  const [instruction, setInstruction] = useState("");
  const [descriptionContains, setDescriptionContains] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [direction, setDirection] = useState<string>("");
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("");
  const [mvaCode, setMvaCode] = useState("");
  const [priority, setPriority] = useState<RulePriority>("medium");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Populate fields when editing
  useEffect(() => {
    if (editingRule) {
      setRuleType(editingRule.rule_type);
      setName(editingRule.name);
      setInstruction("");
      setDescriptionContains(editingRule.criteria.description_contains || "");
      setMerchantName(editingRule.criteria.merchant_name || "");
      setAmountMin(
        editingRule.criteria.amount_min != null
          ? String(editingRule.criteria.amount_min)
          : ""
      );
      setAmountMax(
        editingRule.criteria.amount_max != null
          ? String(editingRule.criteria.amount_max)
          : ""
      );
      setDirection(editingRule.criteria.direction || "");
      setCategory(editingRule.action.category || "");
      setAccount(editingRule.action.account || "");
      setMvaCode(editingRule.action.mva_code || "");
      setPriority(editingRule.priority);
      setShowAdvanced(true);
    } else {
      resetForm();
    }
  }, [editingRule, open]);

  function resetForm() {
    setRuleType("auto_category");
    setName("");
    setInstruction("");
    setDescriptionContains("");
    setMerchantName("");
    setAmountMin("");
    setAmountMax("");
    setDirection("");
    setCategory("");
    setAccount("");
    setMvaCode("");
    setPriority("medium");
    setShowAdvanced(false);
  }

  function handleSave() {
    const data = {
      name,
      rule_type: ruleType,
      priority,
      criteria: {
        description_contains: descriptionContains || undefined,
        merchant_name: merchantName || undefined,
        amount_min: amountMin ? parseFloat(amountMin) : undefined,
        amount_max: amountMax ? parseFloat(amountMax) : undefined,
        direction:
          direction === "debit" || direction === "credit"
            ? direction
            : undefined,
      } as RuleCriteria,
      action: {
        category: category || undefined,
        account: account || undefined,
        mva_code: mvaCode && mvaCode !== "none" ? mvaCode : undefined,
        mark_private: ruleType === "ignore" ? true : undefined,
      } as RuleAction,
    };
    onSave(data);
  }

  const canSave = name.trim().length > 0 && descriptionContains.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? "Rediger regel" : "Opprett ny regel"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Endre betingelser og handlinger for denne regelen."
              : "Beskriv hva du onsker, sa setter Ciri opp regelen for deg."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Natural language instruction area */}
          {!isEditing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquareTextIcon className="size-4 text-[var(--primary)]" />
                <Label className="font-medium">Beskriv regelen din</Label>
              </div>
              <Textarea
                placeholder='F.eks. "Alle transaksjoner fra Spotify mellom 99 og 199 kr skal bokfores som programvare pa konto 6540"'
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Fyll ut feltene nedenfor basert pa instruksjonen din, eller
                legg dem inn direkte.
              </p>
            </div>
          )}

          {/* Rule type selector -- visual pills */}
          <div className="space-y-2">
            <Label>Regeltype</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    value: "auto_category" as RuleType,
                    icon: TagIcon,
                    label: "Kategoriser",
                    desc: "Sett kategori og konto",
                  },
                  {
                    value: "ignore" as RuleType,
                    icon: EyeOffIcon,
                    label: "Ignorer",
                    desc: "Marker som privat",
                  },
                  {
                    value: "auto_match" as RuleType,
                    icon: ZapIcon,
                    label: "Auto-match",
                    desc: "Match med bilag",
                  },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const selected = ruleType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRuleType(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all text-center",
                      selected
                        ? "border-[var(--primary)] bg-[var(--primary)]/5"
                        : "border-border hover:border-muted-foreground/40"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5",
                        selected
                          ? "text-[var(--primary)]"
                          : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        selected ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[12px] text-muted-foreground leading-tight">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>Navn pa regel *</Label>
            <Input
              placeholder="F.eks. Spotify abonnement"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="h-px bg-border" />

          {/* Criteria section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
                <SearchIcon className="size-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-medium text-sm">Nar matcher regelen?</h4>
            </div>

            <div className="space-y-2">
              <Label>Beskrivelse inneholder *</Label>
              <Input
                placeholder="F.eks. SPOTIFY, CIRCLE K, REMA"
                value={descriptionContains}
                onChange={(e) => setDescriptionContains(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Teksten som ma finnes i transaksjonsbeskrivelsen
              </p>
            </div>

            <div className="space-y-2">
              <Label>Butikk/leverandornavn</Label>
              <Input
                placeholder="F.eks. Spotify AB"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min. belop</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Maks. belop</Label>
                <Input
                  type="number"
                  placeholder="inf"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Retning</Label>
              <Select
                value={direction}
                onValueChange={(v) => setDirection(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alle retninger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Alle retninger</SelectItem>
                  <SelectItem value="debit">Utbetaling (negativ)</SelectItem>
                  <SelectItem value="credit">Innbetaling (positiv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action section */}
          {ruleType !== "ignore" && (
            <>
              <div className="h-px bg-border" />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                    <ArrowRightIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="font-medium text-sm">Hva skal skje?</h4>
                </div>

                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Velg kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Kontonummer (NS 4102)</Label>
                  <Select value={account} onValueChange={setAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Velg konto" />
                    </SelectTrigger>
                    <SelectContent>
                      {acctOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>MVA-kode (valgfritt)</Label>
                  <Select value={mvaCode} onValueChange={setMvaCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ingen MVA" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ingen MVA</SelectItem>
                      <SelectItem value="1">1 - Inngaende 25%</SelectItem>
                      <SelectItem value="11">11 - Inngaende 15%</SelectItem>
                      <SelectItem value="13">13 - Inngaende 12%</SelectItem>
                      <SelectItem value="6">6 - Utgaende 25%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {ruleType === "ignore" && (
            <>
              <div className="h-px bg-border" />
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-2">
                  <EyeOffIcon className="size-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Transaksjoner som matcher vil automatisk markeres som
                    private og ekskluderes fra regnskapet.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Advanced: Priority */}
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform",
                showAdvanced && "rotate-180"
              )}
            />
            Avanserte innstillinger
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-1">
                  <Label>Prioritet</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => setPriority(v as RulePriority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">
                        Hoy -- Kjores forst
                      </SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">
                        Lav -- Kjores sist
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Regler med hoyere prioritet kjores for andre. Den forste
                    regelen som matcher vil bli brukt.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving && <Loader2Icon className="size-4 mr-2 animate-spin" />}
            {isEditing ? "Lagre endringer" : "Opprett regel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
