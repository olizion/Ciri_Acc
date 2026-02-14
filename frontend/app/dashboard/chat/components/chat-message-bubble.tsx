"use client";

import { motion } from "framer-motion";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { MiniChart } from "@/components/ciri-mini-chart";
import { InvoiceFormCard } from "./invoice-form-card";
import { Button } from "@/components/ui/button";
import CiriLogo from "@/components/layout/ciri-logo";
import { cn } from "@/lib/utils";
import type { Message } from "../hooks/use-chat";

interface ChatMessageBubbleProps {
  message: Message;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {!isUser && (
        <div className="mt-1 shrink-0">
          <CiriLogo size="sm" animated intensity="subtle" />
        </div>
      )}

      <div className={cn("max-w-[80%] min-w-0", isUser && "order-first")}>
        <div
          className={cn(
            "rounded-2xl px-5 py-4",
            isUser
              ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
              : "border-l-[3px] border-l-[var(--primary)] bg-white shadow-sm dark:bg-card"
          )}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              <Markdown
                className={cn(
                  "prose prose-sm max-w-none dark:prose-invert",
                  // Headings
                  "prose-headings:font-display prose-headings:tracking-tight prose-headings:mb-2.5 prose-headings:mt-1",
                  "prose-h3:text-base prose-h3:font-semibold",
                  // Paragraphs
                  "prose-p:text-sm prose-p:leading-relaxed prose-p:my-2",
                  // Tables
                  "prose-table:text-sm prose-table:my-3",
                  "prose-table:rounded-xl prose-table:overflow-hidden",
                  "[&_table]:w-full [&_table]:border-collapse",
                  "[&_thead]:bg-muted/60",
                  "[&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground/80 [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider",
                  "[&_td]:px-3 [&_td]:py-2 [&_td]:border-t [&_td]:border-border/40",
                  "[&_tr:hover_td]:bg-muted/30",
                  "[&_td:last-child]:text-right [&_th:last-child]:text-right",
                  // Lists
                  "prose-li:text-sm prose-li:my-0.5",
                  "prose-ul:my-2 prose-ol:my-2",
                  // Bold
                  "prose-strong:text-foreground",
                  // Horizontal rules
                  "prose-hr:my-4 prose-hr:border-border/50",
                  // Code
                  "prose-code:text-xs prose-code:bg-muted/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded"
                )}
              >
                {message.content}
              </Markdown>
              {/* Inline charts */}
              {message.charts?.map((chart, i) => (
                <MiniChart key={i} chart={chart} size="lg" />
              ))}
              {/* Inline components */}
              {message.component === "invoice-form" && (
                <div className="mt-3">
                  <InvoiceFormCard />
                </div>
              )}
            </>
          )}
        </div>

        {/* Action buttons */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.actions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className="h-7 rounded-full border-[var(--primary)]/30 px-3 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
