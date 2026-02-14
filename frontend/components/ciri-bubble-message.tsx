"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { MiniChart } from "@/components/ciri-mini-chart";
import { InvoiceFormCard } from "@/app/dashboard/chat/components/invoice-form-card";
import type { Message } from "@/app/dashboard/chat/hooks/use-chat";

export function BubbleChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      className={cn("flex gap-2.5", isUser ? "justify-end" : "justify-start")}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {!isUser && (
        <div className="mt-1 shrink-0">
          <CiriLogo size="sm" animated={false} />
        </div>
      )}

      <div className={cn("min-w-0", isUser ? "max-w-[85%]" : "max-w-[calc(100%-36px)]")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5",
            isUser
              ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
              : "border border-border/50 bg-card shadow-sm"
          )}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              <Markdown
                className={cn(
                  "prose prose-sm max-w-none dark:prose-invert",
                  "prose-headings:font-display prose-headings:tracking-tight prose-headings:mb-2 prose-headings:mt-1",
                  "prose-h3:text-sm prose-h3:font-semibold",
                  "prose-p:text-[13px] prose-p:leading-relaxed prose-p:my-1.5",
                  "prose-table:text-xs prose-table:my-2",
                  "prose-table:rounded-lg prose-table:overflow-hidden",
                  "[&_table]:w-full [&_table]:border-collapse",
                  "[&_thead]:bg-muted/60",
                  "[&_th]:px-2.5 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground/80 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wider",
                  "[&_td]:px-2.5 [&_td]:py-1.5 [&_td]:border-t [&_td]:border-border/40",
                  "[&_tr:hover_td]:bg-muted/30",
                  "[&_td:last-child]:text-right [&_th:last-child]:text-right",
                  "prose-li:text-[13px] prose-li:my-0.5",
                  "prose-ul:my-2 prose-ol:my-2",
                  "prose-strong:text-foreground",
                  "prose-hr:my-3 prose-hr:border-border/50",
                  "prose-code:text-xs prose-code:bg-muted/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded"
                )}
              >
                {message.content}
              </Markdown>
              {message.charts?.map((chart, i) => (
                <MiniChart key={i} chart={chart} size="sm" />
              ))}
              {message.component === "invoice-form" && (
                <div className="mt-2">
                  <InvoiceFormCard />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
