"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatHeader } from "./components/chat-header";
import { ChatWelcome } from "./components/chat-welcome";
import { ChatMessageBubble } from "./components/chat-message-bubble";
import { ChatTypingIndicator } from "./components/chat-typing-indicator";
import { ChatInput } from "./components/chat-input";
import { useChat } from "./hooks/use-chat";

export default function CiriChatPage() {
  const { messages, isTyping, hasUserMessages, sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or typing
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="relative flex h-[calc(100vh-120px)] flex-col">
      {/* Atmospheric background */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: "url(/ciribakgrunn.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(40px)"
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background via-background/95 to-background" />

      <ChatHeader />

      {/* Chat area */}
      <div className="flex-1 overflow-hidden pt-4">
        <AnimatePresence mode="wait">
          {!hasUserMessages ? (
            <ChatWelcome key="welcome" onSendMessage={sendMessage} />
          ) : (
            <ScrollArea className="h-full" ref={scrollRef}>
              <div className="mx-auto max-w-3xl space-y-5 px-4 pb-4">
                {messages.map((message) => (
                  <ChatMessageBubble key={message.id} message={message} />
                ))}
                <AnimatePresence>
                  {isTyping && <ChatTypingIndicator />}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </AnimatePresence>
      </div>

      <ChatInput
        onSend={sendMessage}
        disabled={isTyping}
        showInlineSuggestions={!hasUserMessages}
      />
    </div>
  );
}
