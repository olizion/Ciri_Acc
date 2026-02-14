"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2Icon,
  SparklesIcon,
  SearchIcon,
  LinkIcon,
  BanknoteIcon,
  Loader2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/api";
import CiriLogo from "@/components/layout/ciri-logo";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import CiriAssessmentCard from "./ciri-assessment-card";
import type { Bilag, MatchAssessment } from "../types";

interface ManualPostDialogProps {
  bilag: Bilag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (bilag: Bilag) => void;
}

function ManualPostDialog({
  bilag,
  open,
  onOpenChange,
  onSuccess,
}: ManualPostDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<Array<{
    id: string;
    booking_date: string;
    amount: number;
    description: string;
    merchant_name: string | null;
    reference: string | null;
  }>>([]);
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Step 2: Ciri assessment state
  const [assessment, setAssessment] = useState<MatchAssessment | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [acknowledgeWarning, setAcknowledgeWarning] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset assessment when transaction selection changes
  const selectTransaction = (txId: string) => {
    setSelectedTx(txId === selectedTx ? null : txId);
    setAssessment(null);
    setAcknowledgeWarning(false);
  };

  // Search unmatched transactions (no amount pre-filter -- user picks freely)
  const searchTransactions = useCallback(async (query: string) => {
    if (!bilag) return;
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      params.set("limit", "20");
      const res = await fetch(`${API_BASE_URL}/api/bank/transactions/search-unmatched?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error("Failed to search transactions:", err);
    } finally {
      setIsSearching(false);
    }
  }, [bilag]);

  // Debounced search
  useEffect(() => {
    if (!open || !bilag) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchTransactions(searchQuery), 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery, open, bilag, searchTransactions]);

  // Reset state on open
  useEffect(() => {
    if (open && bilag) {
      setSelectedTx(null);
      setAssessment(null);
      setAcknowledgeWarning(false);
      setSearchQuery("");
      searchTransactions("");
    }
  }, [open, bilag, searchTransactions]);

  // Step 2: Check match with Ciri's scoring
  const handleCheckMatch = async () => {
    if (!bilag || !selectedTx) return;
    setIsChecking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bilag/${bilag.id}/check-match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: selectedTx }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.detail || "Kunne ikke sjekke kobling");
        return;
      }
      const data: MatchAssessment = await res.json();
      setAssessment(data);
    } catch {
      toast.error("Nettverksfeil ved sjekk av kobling");
    } finally {
      setIsChecking(false);
    }
  };

  // Step 3: Post with optional acknowledgment
  const handlePost = async () => {
    if (!bilag || !selectedTx) return;
    setIsPosting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/bilag/${bilag.id}/manual-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: selectedTx,
          acknowledge_warning: acknowledgeWarning || (assessment?.confidence !== "low"),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.detail?.type === "low_confidence_warning") {
          toast.error("Du må bekrefte at du tar ansvar for denne koblingen.");
        } else {
          toast.error(typeof err.detail === "string" ? err.detail : "Kunne ikke bokføre bilag");
        }
        return;
      }
      const data = await res.json();
      toast.success(data.message || "Bilag koblet og bokført");
      onSuccess(bilag);
    } catch {
      toast.error("Nettverksfeil ved bokføring");
    } finally {
      setIsPosting(false);
    }
  };

  if (!bilag) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="size-5 text-blue-600" />
            Koble bilag til transaksjon
          </DialogTitle>
          <DialogDescription>
            Bilag #{bilag.bilagsnummer} — {bilag.leverandor}, kr {bilag.totalBelop.toLocaleString("nb-NO", { minimumFractionDigits: 2 })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Søk i umatchede transaksjoner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[240px] rounded-lg border">
            {isSearching ? (
              <div className="flex items-center justify-center p-8">
                <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Søker...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <BanknoteIcon className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Ingen umatchede transaksjoner funnet</p>
                <p className="text-xs text-muted-foreground mt-1">Prøv å endre søket eller sjekk at banken er synkronisert</p>
              </div>
            ) : (
              <div className="divide-y">
                {transactions.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => selectTransaction(tx.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 text-left transition-colors hover:bg-muted/50",
                      selectedTx === tx.id && "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.merchant_name || tx.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.booking_date).toLocaleDateString("nb-NO")}
                        {tx.reference && ` · Ref: ${tx.reference}`}
                      </p>
                    </div>
                    <div className="ml-3 text-right shrink-0">
                      <p className={cn(
                        "text-sm font-mono font-medium",
                        tx.amount < 0 ? "text-red-600" : "text-green-600"
                      )}>
                        {tx.amount < 0 ? "\u2212" : "+"}kr {Math.abs(tx.amount).toLocaleString("nb-NO", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    {selectedTx === tx.id && (
                      <CheckCircle2Icon className="ml-2 size-5 text-blue-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Ciri Assessment Panel */}
          <AnimatePresence mode="wait">
            {selectedTx && !assessment && !isChecking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-center"
              >
                <Button
                  onClick={handleCheckMatch}
                  variant="outline"
                  className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  <SparklesIcon className="mr-2 size-4" />
                  La Ciri vurdere koblingen
                </Button>
              </motion.div>
            )}

            {isChecking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-center gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/10"
              >
                <div className="relative size-8">
                  <CiriLogo size="sm" />
                  <Loader2Icon className="absolute -bottom-1 -right-1 size-4 animate-spin text-blue-600" />
                </div>
                <span className="text-sm text-blue-700 dark:text-blue-400">Ciri analyserer koblingen...</span>
              </motion.div>
            )}

            {assessment && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <CiriAssessmentCard
                  assessment={assessment}
                  acknowledgeWarning={acknowledgeWarning}
                  onAcknowledgeChange={setAcknowledgeWarning}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          {assessment && (
            <Button
              onClick={handlePost}
              disabled={isPosting || (assessment.confidence === "low" && assessment.score < 0.3 && !acknowledgeWarning)}
              className={cn(
                assessment.confidence === "high"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : assessment.confidence === "medium"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              )}
            >
              {isPosting ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Bokfører...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 size-4" />
                  Koble og bokfør
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ManualPostDialog;
