"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useProfilePhoto } from "@/app/(hooks)/useProfilePhoto";
import { dbfs } from "@/app/(firebase)/client";
import {
  encryptMessage,
  decryptMessage,
  isEncryptedMessage,
} from "@/lib/chat-crypto";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

interface ChatMessage {
  id: string;
  text: string;
  senderName: string;
  senderId: string;
  createdAt: Timestamp | null;
  encrypted?: boolean;
}

interface ChatMeta {
  participants: string[];
  participantNames: Record<string, string>;
  isGroup: boolean;
  groupName?: string;
}

const MESSAGES_LIMIT = 100;

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-600", "bg-violet-600", "bg-emerald-600",
    "bg-rose-600", "bg-amber-600", "bg-cyan-600",
    "bg-pink-600", "bg-indigo-600", "bg-teal-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

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
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export default function ChatConversationPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const { telegramId, qcUsername } = useUserContext();

  // Telegram back button navigates back to chat list
  useTelegramBackButton("/ecosystem/chat");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatMeta, setChatMeta] = useState<ChatMeta | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef(true);

  // Get the other participant's telegramId for profile photo
  const otherParticipantId = chatMeta?.participants.find((p) => p !== telegramId) ?? null;
  const myPhoto = useProfilePhoto(telegramId);
  const otherPhoto = useProfilePhoto(otherParticipantId);

  // Track scroll position
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    if (force || isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Load chat metadata
  useEffect(() => {
    if (!chatId) return;

    const loadMeta = async () => {
      try {
        const chatDoc = await getDoc(doc(dbfs, "qc-chats", chatId));
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          setChatMeta({
            participants: data.participants || [],
            participantNames: data.participantNames || {},
            isGroup: data.isGroup || false,
            groupName: data.groupName,
          });
        }
      } catch (error) {
        console.error("Error loading chat meta:", error);
      }
    };

    loadMeta();
  }, [chatId]);

  // Subscribe to messages and decrypt them
  useEffect(() => {
    if (!chatId || !chatMeta) return;

    const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(MESSAGES_LIMIT));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const rawMsgs: {
        id: string;
        rawText: string;
        senderName: string;
        senderId: string;
        createdAt: Timestamp | null;
        encrypted: boolean;
      }[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const rawText = data.text || "";
        rawMsgs.push({
          id: docSnap.id,
          rawText,
          senderName: data.senderName || "Unknown",
          senderId: data.senderId || "",
          createdAt: data.createdAt,
          encrypted: data.encrypted === true,
        });
      });

      // Decrypt messages in parallel
      const decryptedMsgs = await Promise.all(
        rawMsgs.map(async (msg) => {
          let text = msg.rawText;
          if (msg.encrypted && isEncryptedMessage(msg.rawText)) {
            text = await decryptMessage(msg.rawText, chatMeta.participants, chatId);
          }
          return {
            id: msg.id,
            text,
            senderName: msg.senderName,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
            encrypted: msg.encrypted,
          };
        })
      );

      setMessages(decryptedMsgs);
      setIsLoading(false);
      setTimeout(() => scrollToBottom(), 50);
    });

    return () => unsubscribe();
  }, [chatId, chatMeta, scrollToBottom]);

  // Initial scroll
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom(true);
    }
  }, [isLoading, messages.length, scrollToBottom]);

  // Send encrypted message
  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || !telegramId || !chatId || !chatMeta || isSending) return;

    setIsSending(true);
    setNewMessage("");

    const senderName = qcUsername || "Unknown";

    try {
      // Encrypt the message before sending
      const encryptedText = await encryptMessage(
        text,
        chatMeta.participants,
        chatId
      );

      const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");
      await addDoc(messagesRef, {
        text: encryptedText,
        senderName,
        senderId: telegramId,
        createdAt: serverTimestamp(),
        encrypted: true,
      });

      // Update last message preview (show truncated plaintext for the chat list)
      const preview = text.length > 50 ? text.slice(0, 50) + "…" : text;
      await updateDoc(doc(dbfs, "qc-chats", chatId), {
        lastMessage: preview,
        lastMessageBy: telegramId,
        lastMessageAt: serverTimestamp(),
      });

      scrollToBottom(true);
    } catch (error) {
      console.error("Failed to send message:", error);
      setNewMessage(text);
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

  // Date divider logic
  const shouldShowDateDivider = (index: number): boolean => {
    if (index === 0) return true;
    const current = messages[index].createdAt;
    const prev = messages[index - 1].createdAt;
    if (!current || !prev) return false;
    return current.toDate().toDateString() !== prev.toDate().toDateString();
  };

  const isConsecutive = (index: number): boolean => {
    if (index === 0) return false;
    return (
      messages[index].senderId === messages[index - 1].senderId &&
      !shouldShowDateDivider(index)
    );
  };

  // Get display name for the header
  const getHeaderName = (): string => {
    if (!chatMeta) return "Chat";
    if (chatMeta.isGroup && chatMeta.groupName) return chatMeta.groupName;
    // Self-chat (Saved Messages)
    if (chatMeta.participants.length === 1 && chatMeta.participants[0] === telegramId) {
      return "Saved Messages";
    }
    const otherParticipant = chatMeta.participants.find((p) => p !== telegramId);
    if (otherParticipant && chatMeta.participantNames[otherParticipant]) {
      return chatMeta.participantNames[otherParticipant];
    }
    return "Chat";
  };

  const isSelfChat = chatMeta?.participants.length === 1 && chatMeta.participants[0] === telegramId;

  const headerName = getHeaderName();
  const headerInitials = getInitials(headerName);
  const headerAvatarColor = getAvatarColor(headerName);

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            {otherPhoto || (isSelfChat && myPhoto) ? (
              <AvatarImage src={(isSelfChat ? myPhoto : otherPhoto) || undefined} />
            ) : null}
            <AvatarFallback className={`${isSelfChat ? "bg-primary" : headerAvatarColor} text-white text-xs font-semibold`}>
              {isSelfChat ? (
                <Icon icon="solar:bookmark-bold" className="w-5 h-5" />
              ) : (
                headerInitials
              )}
            </AvatarFallback>
          </Avatar>
          {chatMeta?.isGroup && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-card border-2 border-background flex items-center justify-center">
              <Icon icon="solar:users-group-rounded-bold" className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">
            {isSelfChat ? "Saved Messages" : `@${headerName}`}
          </h1>
          <div className="flex items-center gap-1">
            <Icon icon="solar:lock-keyhole-bold" className="w-3 h-3 text-green-400 shrink-0" />
            <span className="text-[11px] text-green-400 leading-none">
              {isSelfChat ? "Encrypted personal notes" : "End-to-end encrypted"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scroll-smooth"
      >
        {/* E2E Encryption Notice */}
        {!isLoading && (
          <div className="flex justify-center py-3 pb-1">
            <div className="bg-muted/50 rounded-full px-3 py-1 flex items-center gap-1.5">
              <Icon icon="solar:lock-keyhole-bold" className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground leading-none">
                {isSelfChat
                  ? "Your saved messages are encrypted. Only you can read them."
                  : `Messages are end-to-end encrypted. Only you and @${headerName} can read them.`}
              </span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <Icon icon="proicons:chat" className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Say hello to start the conversation!
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwnMessage = msg.senderId === telegramId;
            const consecutive = isConsecutive(i);
            const showDate = shouldShowDateDivider(i);

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-border/40" />
                    <span className="text-[10px] text-muted-foreground font-medium px-2">
                      {formatDateDivider(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                )}

                <div
                  className={`flex items-end gap-2 ${isOwnMessage ? "justify-end" : "justify-start"} ${
                    consecutive ? "mt-0.5" : "mt-2.5"
                  }`}
                >
                  {/* Sender avatar for received messages */}
                  {!isOwnMessage && !consecutive && (
                    <Avatar className="h-7 w-7 shrink-0">
                      {(() => {
                        const senderPhoto = msg.senderId === telegramId ? myPhoto : otherPhoto;
                        return senderPhoto ? <AvatarImage src={senderPhoto} /> : null;
                      })()}
                      <AvatarFallback className={`${getAvatarColor(msg.senderName)} text-white text-[10px] font-semibold`}>
                        {getInitials(msg.senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {!isOwnMessage && consecutive && <div className="w-7 shrink-0" />}

                  <div
                    className={`max-w-[75%] ${
                      isOwnMessage
                        ? "bg-primary/15 border border-primary/20 rounded-2xl rounded-br-md"
                        : "bg-card border border-border/50 rounded-2xl rounded-bl-md"
                    } px-3 py-2`}
                  >
                    {/* Show sender name for group chats and non-consecutive messages */}
                    {!isOwnMessage && !consecutive && chatMeta?.isGroup && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-semibold text-primary">
                          @{msg.senderName}
                        </span>
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
      <div className="border-t border-border/50 bg-card/50 backdrop-blur-sm px-3 py-2.5" style={{ paddingBottom: "max(0.625rem, var(--tg-safe-area-inset-bottom, 0px))" }}>
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
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Icon icon="material-symbols:send-rounded" className="w-5 h-5 text-primary-foreground" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
