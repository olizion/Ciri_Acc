"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  BrainCircuitIcon,
  SendIcon,
  SparklesIcon,
  ExpandIcon,
  XIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hei! Jeg er Ciri, din AI-regnskapsfører. Hvordan kan jeg hjelpe deg i dag?",
    timestamp: new Date(Date.now() - 1000 * 60 * 30)
  }
];

const suggestions = [
  "Hva er MVA-status?",
  "Vis resultat hittil i år",
  "Hvilke bilag venter?",
  "Forklar balanserapporten"
];

export default function CiriChatWidget() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses: Record<string, string> = {
        "hva er mva-status?": "MVA-status for 6. termin (nov-des 2025):\n\n• Utgående MVA: kr 45 230\n• Inngående MVA: kr 21 780\n• Å betale: kr 23 450\n\nFrist for innsending: 10. februar 2026. Vil du at jeg sender meldingen?",
        "vis resultat hittil i år": "Resultat januar-desember 2025:\n\n• Inntekter: kr 1 245 000\n• Kostnader: kr 892 110\n• Resultat før skatt: kr 352 890\n\nDette er 15% bedre enn samme periode i fjor!",
        "hvilke bilag venter?": "Du har 2 bilag som venter på godkjenning:\n\n1. Ukjent leverandør - kr 2 340\n   Trenger kategori\n\n2. Ruter AS - kr 814\n   Forslag: Reisekostnad\n\nSkal jeg vise dem?",
        "forklar balanserapporten": "Balanserapporten viser hva bedriften eier (eiendeler) og skylder (gjeld + egenkapital) på et gitt tidspunkt.\n\nDin balanse per 31.12.2025:\n• Eiendeler: kr 635 000\n• Egenkapital: kr 420 000 (66%)\n• Gjeld: kr 215 000\n\nEgenkapitalandelen på 66% er sunn - godt over anbefalt 30%."
      };

      const responseContent =
        responses[input.toLowerCase().trim()] ||
        "Jeg forstår spørsmålet ditt. La meg se på regnskapet ditt og komme tilbake med et svar.";

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className={cn("flex flex-col", isExpanded ? "fixed inset-4 z-50" : "h-full")}>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <CiriLogo size="sm" />
              <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white bg-green-500" />
            </div>
            <div>
              <span className="text-base font-semibold">Snakk med Ciri</span>
              <p className="text-muted-foreground text-xs font-normal">Din AI-regnskapsfører</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <XIcon className="size-4" /> : <ExpandIcon className="size-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}>
                {message.role === "assistant" && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary-400)] to-[var(--primary-600)]">
                    <SparklesIcon className="size-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    message.role === "user"
                      ? "bg-[var(--primary)] text-white"
                      : "border bg-muted/50"
                  )}>
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary-400)] to-[var(--primary-600)]">
                  <SparklesIcon className="size-4 text-white" />
                </div>
                <div className="rounded-2xl border bg-muted/50 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="size-2 animate-bounce rounded-full bg-[var(--primary)]" style={{ animationDelay: "0ms" }} />
                    <span className="size-2 animate-bounce rounded-full bg-[var(--primary)]" style={{ animationDelay: "150ms" }} />
                    <span className="size-2 animate-bounce rounded-full bg-[var(--primary)]" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 border-t px-4 py-3">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                className="h-auto rounded-full py-1.5 text-xs"
                onClick={() => handleSuggestionClick(suggestion)}>
                {suggestion}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Spør Ciri om regnskapet..."
              className="min-h-[44px] max-h-32 resize-none rounded-xl"
              rows={1}
            />
            <Button
              size="icon"
              className="size-11 shrink-0 rounded-xl"
              onClick={handleSend}
              disabled={!input.trim() || isTyping}>
              <SendIcon className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
