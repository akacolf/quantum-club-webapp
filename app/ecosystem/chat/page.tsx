"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { dbfs } from "@/app/(firebase)/client";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

interface ChatMessage {
  id: string;
  text: string;
  username: string;
  rank: string;
  telegramId: string;
  createdAt: Timestamp | null;
}

const MESSAGES_LIMIT = 100;

function formatTime(timestamp: Timestamp | null): string {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateDivider(timestamp: Timestamp | null): string {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function getRankColor(rank: string): string {
  if (!rank) return "text-muted-foreground";
  const r = rank.toLowerCase();
  if (r === "diamond" || r === "legendary") return "text-cyan-400";
  if (r === "gold") return "text-yellow-400";
  if (r === "silver") return "text-gray-300";
  if (r === "bronze") return "text-amber-600";
  return "text-muted-foreground";
}

function getRankIcon(rank: string): string {
  if (!rank) return "";
  const r = rank.toLowerCase();
  if (r === "diamond" || r === "legendary") return "💎";
  if (r === "gold") return "🥇";
  if (r === "silver") return "🥈";
  if (r === "bronze") return "🥉";
  return "⚡";
}

export default function QCChatPage() {
  const { telegramId, username, rank } = useUserContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef(true);

  // Track if the user is scrolled near the bottom
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  }, []);

  // Auto-scroll to bottom when new messages arrive (if user is at bottom)
  const scrollToBottom = useCallback((force = false) => {
    if (force || isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Subscribe to real-time messages
  useEffect(() => {
    const messagesRef = collection(dbfs, "ecosystem-chat", "global", "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(MESSAGES_LIMIT));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          text: data.text,
          username: data.username || "Quantum User",
          rank: data.rank || "",
          telegramId: data.telegramId || "",
          createdAt: data.createdAt,
        });
      });
      setMessages(msgs);
      setIsLoading(false);
      // Auto-scroll after new messages are rendered
      setTimeout(() => scrollToBottom(), 50);
    });

    return () => unsubscribe();
  }, [scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom(true);
    }
  }, [isLoading, messages.length, scrollToBottom]);

  // Send a message
  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || !telegramId || isSending) return;

    setIsSending(true);
    setNewMessage("");

    try {
      const messagesRef = collection(dbfs, "ecosystem-chat", "global", "messages");
      await addDoc(messagesRef, {
        text,
        username: username || "Quantum User",
        rank: rank || "",
        telegramId,
        createdAt: serverTimestamp(),
      });
      scrollToBottom(true);
    } catch (error) {
      console.error("Failed to send message:", error);
      setNewMessage(text); // Restore the message on failure
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Check if we need a date divider
  const shouldShowDateDivider = (index: number): boolean => {
    if (index === 0) return true;
    const current = messages[index].createdAt;
    const prev = messages[index - 1].createdAt;
    if (!current || !prev) return false;
    return current.toDate().toDateString() !== prev.toDate().toDateString();
  };

  // Check if this is a consecutive message from the same user
  const isConsecutive = (index: number): boolean => {
    if (index === 0) return false;
    return messages[index].telegramId === messages[index - 1].telegramId
      && !shouldShowDateDivider(index);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/30">
          <Icon icon="solar:chat-round-dots-bold" className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold">QC Global Chat</h1>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary px-1.5 py-0">
              Live
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {messages.length} messages • Quantum Club Community
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scroll-smooth"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <Icon icon="solar:chat-round-dots-bold" className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Be the first to say something in QC Global Chat!
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwnMessage = msg.telegramId === telegramId;
            const consecutive = isConsecutive(i);
            const showDate = shouldShowDateDivider(i);

            return (
              <div key={msg.id}>
                {/* Date divider */}
                {showDate && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-border/40" />
                    <span className="text-[10px] text-muted-foreground font-medium px-2">
                      {formatDateDivider(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                )}

                {/* Message */}
                <div
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} ${
                    consecutive ? "mt-0.5" : "mt-2.5"
                  }`}
                >
                  <div
                    className={`max-w-[80%] ${
                      isOwnMessage
                        ? "bg-primary/15 border border-primary/20 rounded-2xl rounded-br-md"
                        : "bg-card border border-border/50 rounded-2xl rounded-bl-md"
                    } px-3 py-2`}
                  >
                    {/* Username + rank (only show for non-consecutive messages from others) */}
                    {!isOwnMessage && !consecutive && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-semibold text-foreground">
                          {msg.username}
                        </span>
                        {msg.rank && (
                          <span className={`text-[10px] ${getRankColor(msg.rank)}`}>
                            {getRankIcon(msg.rank)} {msg.rank}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-end gap-2">
                      <p className="text-[13px] text-foreground leading-snug break-words whitespace-pre-wrap flex-1">
                        {msg.text}
                      </p>
                      <span className="text-[9px] text-muted-foreground shrink-0 self-end pb-0.5">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-border/50 bg-card/50 backdrop-blur-sm px-3 py-2.5 pb-safe">
        {!telegramId ? (
          <div className="flex items-center justify-center py-2">
            <p className="text-xs text-muted-foreground">Sign in to chat</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                maxLength={500}
                className="w-full bg-background border border-border/50 rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icon icon="solar:plain-bold" className="w-5 h-5 text-white -rotate-45" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
