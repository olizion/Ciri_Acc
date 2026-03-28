"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { SendIcon, PaperclipIcon, MicIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  showInlineSuggestions?: boolean;
}

const QUICK_SUGGESTIONS = [
  "Vis siste bilag",
  "MVA-status",
  "Resultat hittil i år"
];

export function ChatInput({ onSend, disabled = false, showInlineSuggestions = false }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  return (
    <div className="border-t border-[var(--primary)]/10 pt-4">
      {/* Inline suggestion chips */}
      {showInlineSuggestions && !value && (
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full",
                "border border-[var(--primary)]/20 bg-[var(--primary)]/5",
                "px-3 py-1.5 text-xs font-medium text-[var(--primary)]",
                "transition-colors hover:bg-[var(--primary)]/10"
              )}
            >
              <SparklesIcon className="size-3" />
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <div
          className={cn(
            "relative flex-1 rounded-xl border bg-white transition-shadow dark:bg-card",
            "focus-within:ring-2 focus-within:ring-[var(--primary)]/30 focus-within:border-[var(--primary)]/40"
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Spør Ciri om regnskapet ditt..."
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent px-4 py-3.5 pr-20 text-sm",
              "placeholder:text-muted-foreground/50 focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            style={{ minHeight: 48, maxHeight: 160 }}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground/50 hover:text-muted-foreground"
              tabIndex={-1}
            >
              <PaperclipIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground/50 hover:text-muted-foreground"
              tabIndex={-1}
            >
              <MicIcon className="size-4" />
            </Button>
          </div>
        </div>

        <motion.div whileTap={!disabled && value.trim() ? { scale: 0.92 } : {}}>
          <Button
            size="lg"
            className="size-12 shrink-0 rounded-xl"
            onClick={handleSend}
            disabled={!value.trim() || disabled}
          >
            <SendIcon className="size-5" />
          </Button>
        </motion.div>
      </div>

      <p className="text-muted-foreground/60 mt-2 text-center text-[13px]">
        Ciri kan gjøre feil. Verifiser viktig informasjon.
      </p>
    </div>
  );
}
