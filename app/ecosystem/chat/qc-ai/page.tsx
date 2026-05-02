"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useUserStore } from "@/stores/user-store";
import { useFrensStore } from "@/stores/frens-store";
import { toast } from "sonner";

const AI_CHAT_STORAGE_KEY = "qc_ai_chat_main";

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");
}

const SUGGESTED_PROMPTS = [
  "How is the market doing today?",
  "What is Quantum Club?",
  "Tell me about QC's ecosystem",
];

export default function QcAiChatPage() {
  useTelegramBackButton("/ecosystem/chat");

  // Gather user context for personalized responses (same shape as AIChatDrawer)
  const { MainQuantAmount, rank, daily, walletAddress, remainingSolveToEarn } = useUserStore();
  const { referralsNum } = useFrensStore();

  // Keep transport body fresh via ref without recreating the transport on every render
  const userContextRef = useRef({
    qntmBalance: MainQuantAmount || undefined,
    rank: rank || undefined,
    streak: daily || undefined,
    walletConnected: !!walletAddress,
    referralCount: referralsNum || undefined,
    solveToEarnPasses: remainingSolveToEarn,
  });
  userContextRef.current = {
    qntmBalance: MainQuantAmount || undefined,
    rank: rank || undefined,
    streak: daily || undefined,
    walletConnected: !!walletAddress,
    referralCount: referralsNum || undefined,
    solveToEarnPasses: remainingSolveToEarn,
  };

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        body: () => ({
          currentPage: "/ecosystem/chat/qc-ai",
          userContext: userContextRef.current,
        }),
      }),
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    onError: (error) => {
      toast.error(error.message || "Failed to get response");
    },
  });

  const isStreaming = status === "submitted" || status === "streaming";

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);
  const initialPromptRef = useRef(false);

  // Load persisted messages from localStorage on mount (single-session, separate
  // from the multi-session key used by AIChatDrawer so they don't conflict)
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const saved = localStorage.getItem(AI_CHAT_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed as UIMessage[]);
      }
    } catch (err) {
      console.error("Failed to load AI chat history:", err);
    }
  }, [setMessages]);

  useEffect(() => {
    if (initialPromptRef.current || isStreaming) return;
    initialPromptRef.current = true;
    const prompt = new URLSearchParams(window.location.search).get("prompt");
    if (prompt?.trim()) {
      sendMessage({ text: prompt.trim().slice(0, 500) });
    }
  }, [isStreaming, sendMessage]);

  // Persist messages — debounced via the streaming gate so we only save final state
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (isStreaming) return;
    try {
      if (messages.length === 0) {
        localStorage.removeItem(AI_CHAT_STORAGE_KEY);
      } else {
        localStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(messages));
      }
    } catch (err) {
      console.error("Failed to save AI chat history:", err);
    }
  }, [messages, isStreaming]);

  // Auto-scroll to bottom when messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  function submitPrompt(text: string) {
    if (!text.trim() || isStreaming) return;
    sendMessage({ text: text.trim() });
    setInput("");
  }

  function handleSend() {
    submitPrompt(input);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClearChat() {
    setMessages([]);
    try {
      localStorage.removeItem(AI_CHAT_STORAGE_KEY);
    } catch {}
  }

  return (
    <>
    <div className="fixed inset-0 z-40 bg-background" aria-hidden />
    <div className="fixed inset-0 z-[41] flex flex-col">
      {/* Header — native Telegram back button handles navigation */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-sm shrink-0"
        style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-white">
            <Image src="/svg/logo-dark.svg" alt="QC AI" width={20} height={20} />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h1 className="text-sm font-semibold text-foreground truncate">
              Quantum Club AI
            </h1>
            <Icon icon="solar:verified-check-bold" className="w-4 h-4 text-primary shrink-0" />
          </div>
          <p className="text-[11px] text-muted-foreground leading-none">
            {isStreaming ? "Typing…" : "Always here to help"}
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearChat}
            className="w-9 h-9 rounded-full shrink-0"
            aria-label="Clear chat"
          >
            <Icon icon="lucide:trash-2" className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
            <Image src="/svg/logo-white.svg" alt="QC AI" width={44} height={44} />
            <div>
              <p className="text-sm font-semibold text-foreground">Quantum Club AI</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                Ask me anything about Quantum Club — trading, wallet features,
                earning QNTM, or how the ecosystem works.
              </p>
            </div>
            <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-x-auto overscroll-x-contain scrollbar-hide mt-2">
              <div className="flex w-max gap-2.5 pl-[5vw] pr-[5vw] pb-1">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitPrompt(prompt)}
                  className="h-9 shrink-0 rounded-full bg-muted/40 px-4 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            const text = getMessageText(msg);
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {isUser ? (
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Icon icon="lucide:user" className="w-3.5 h-3.5" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarFallback className="bg-background">
                      <Image src="/svg/logo-white.svg" alt="AI" width={14} height={14} />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-[13.5px] leading-[1.4] ${
                    isUser
                      ? "bg-primary/15 rounded-br-md text-foreground"
                      : "bg-card rounded-bl-md text-foreground"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{text}</p>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                      <ReactMarkdown>{text || "…"}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator while the AI is thinking but hasn't emitted a message yet */}
        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2 flex-row">
            <Avatar className="h-7 w-7 shrink-0 mt-0.5">
              <AvatarFallback className="bg-background">
                <Image src="/svg/logo-white.svg" alt="AI" width={14} height={14} />
              </AvatarFallback>
            </Avatar>
            <div className="bg-card rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="bg-card/50 backdrop-blur-sm px-3 py-2.5 shrink-0"
        style={{ paddingBottom: "max(0.625rem, var(--tg-safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Quantum Club AI…"
            maxLength={500}
            disabled={isStreaming}
            className="flex-1 rounded-full px-4 py-2.5 h-auto bg-background border-0 text-base placeholder:text-muted-foreground focus-visible:ring-0"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="w-10 h-10 rounded-full shrink-0 shadow-lg shadow-primary/20"
          >
            {isStreaming ? (
              <ButtonLoader size="sm" />
            ) : (
              <Icon icon="material-symbols:send-rounded" className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
