"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Maximize2, Zap } from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BubbleChatMessage } from "@/components/ciri-bubble-message";
import { ChatTypingIndicator } from "@/app/dashboard/chat/components/chat-typing-indicator";
import { useChat } from "@/app/dashboard/chat/hooks/use-chat";
import {
  getPageActions,
  dispatchCiriAction,
  type CiriAction,
} from "@/lib/ciri-actions";

// Path → Norwegian page name mapping
const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Dashboardet",
  "/dashboard/bilag": "Bilag",
  "/dashboard/mva": "MVA",
  "/dashboard/bank/faktura": "Fakturaer",
  "/dashboard/bank": "Banktransaksjoner",
  "/dashboard/bank/avstemming": "Bankavstemmingen",
  "/dashboard/bank/regler": "Bankreglene",
  "/dashboard/bank/accounts/connect": "Banktilkoblingen",
  "/dashboard/resultat": "Resultatet",
  "/dashboard/balanse": "Balansen",
  "/dashboard/hovedbok": "Hovedboken",
  "/dashboard/lonn": "Lønnsoversikten",
  "/dashboard/lonn/feriepenger": "Feriepengene",
  "/dashboard/arsregnskap": "Årsregnskapet",
  "/dashboard/rapporter": "Rapportene",
  "/dashboard/innstillinger": "Innstillingene",
  "/dashboard/innstillinger/email": "E-postinnstillingene",
  "/dashboard/varsler": "Varslene",
  "/dashboard/sikkerhet": "Sikkerhetsinnstillingene",
  "/dashboard/hjelp": "Hjelp-siden",
};

function getPageName(pathname: string): string {
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname];
  const segments = pathname.split("/");
  while (segments.length > 1) {
    segments.pop();
    const parent = segments.join("/");
    if (PAGE_NAMES[parent]) return PAGE_NAMES[parent];
  }
  return "denne siden";
}

export function CiriFloatingBubble() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, isTyping, hasUserMessages, sendMessage, addActionResponse } =
    useChat();

  const hidden = pathname === "/dashboard/chat";
  const pageName = getPageName(pathname);
  const actions = getPageActions(pathname);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isTyping) return;
    sendMessage(trimmed);
    setInputValue("");
  }, [inputValue, isTyping, sendMessage]);

  const handleSuggestionClick = useCallback(
    (action: CiriAction) => {
      if (action.isAction) {
        // Fire the event so the page handler picks it up
        dispatchCiriAction(action.id);
        // Show user message + Ciri's confirmation in the chat
        addActionResponse(action.label, action.response ?? "Utført.");
      } else {
        // Regular chat suggestion — send as message
        sendMessage(action.label);
      }
    },
    [sendMessage, addActionResponse]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Focus textarea when popover opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  if (hidden) return null;

  return (
    <div className="fixed right-6 bottom-6 z-50" ref={popoverRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            style={{ transformOrigin: "bottom right" }}
            className="absolute right-0 bottom-20 flex w-[520px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl shadow-[var(--primary)]/10"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-5 py-3.5">
              <CiriLogo size="sm" animated={false} />
              <div className="min-w-0">
                <span className="font-display text-sm font-semibold tracking-tight">
                  Ciri
                </span>
                <p className="truncate text-xs text-muted-foreground">
                  {pageName}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => {
                    router.push("/dashboard/chat");
                    setIsOpen(false);
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Åpne full chat"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto scroll-smooth"
              style={{ height: "480px" }}
            >
              {!hasUserMessages ? (
                /* Welcome state with greeting + suggestions */
                <div className="flex h-full flex-col items-center justify-center gap-5 p-6">
                  <CiriLogo size="lg" animated intensity="subtle" showPulseRings={false} />
                  <div className="text-center">
                    <p className="text-base leading-relaxed text-foreground/90">
                      Ser på{" "}
                      <span className="font-semibold text-[var(--primary)]">
                        {pageName}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Hva kan jeg hjelpe deg med?
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {actions.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => handleSuggestionClick(action)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-4 py-2 text-sm font-medium text-[var(--primary)] transition-all hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/10 active:scale-95"
                      >
                        {action.isAction && (
                          <Zap className="h-3 w-3 fill-current opacity-70" />
                        )}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Message list + persistent suggestion chips */
                <div className="space-y-4 p-4">
                  {messages.map((msg) => (
                    <BubbleChatMessage key={msg.id} message={msg} />
                  ))}
                  <AnimatePresence>
                    {isTyping && <ChatTypingIndicator />}
                  </AnimatePresence>
                  {!isTyping && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {actions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => handleSuggestionClick(action)}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--primary)]/15 bg-[var(--primary)]/5 px-3 py-1.5 text-xs font-medium text-[var(--primary)]/80 transition-all hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] active:scale-95"
                        >
                          {action.isAction && (
                            <Zap className="h-2.5 w-2.5 fill-current opacity-60" />
                          )}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="border-t px-4 py-3">
              <div className="flex gap-2.5">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Skriv melding til Ciri..."
                  className="min-h-[44px] max-h-[100px] resize-none rounded-xl text-sm"
                  rows={1}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  className="h-11 w-11 shrink-0 rounded-xl"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="rounded-full shadow-lg shadow-[var(--primary)]/20 transition-shadow hover:shadow-xl hover:shadow-[var(--primary)]/30"
      >
        <CiriLogo
          size="lg"
          animated={true}
          intensity="subtle"
          showPulseRings={false}
        />
      </motion.button>
    </div>
  );
}
