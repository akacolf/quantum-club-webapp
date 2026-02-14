"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useProfilePhoto } from "@/app/(hooks)/useProfilePhoto";
import { usePresenceActions, useUserPresence, formatLastSeen } from "@/app/(hooks)/usePresence";
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
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  setDoc,
  deleteField,
  increment,
  Timestamp,
} from "firebase/firestore";

interface ChatMessage {
  id: string;
  text: string;
  senderName: string;
  senderId: string;
  createdAt: Timestamp | null;
  encrypted?: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
}

interface ChatMeta {
  participants: string[];
  participantNames: Record<string, string>;
  isGroup: boolean;
  isGlobal?: boolean;
  groupName?: string;
  joinCode?: string;
  createdBy?: string;
  readPositions?: Record<string, Timestamp>;
  typing?: Record<string, Timestamp>;
}

const MESSAGES_LIMIT = 100;
const TYPING_TIMEOUT_MS = 3000;

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
  const authCtx = useAuth();
  const currentUser = authCtx?.currentUser ?? null;

  useTelegramBackButton("/ecosystem/chat");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatMeta, setChatMeta] = useState<ChatMeta | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef(true);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const participantsRef = useRef<string[]>([]);

  // Reply state
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  // Swipe state for reply gesture
  const swipeRef = useRef<{ startX: number; startY: number; msgId: string | null }>({ startX: 0, startY: 0, msgId: null });

  const otherParticipantId = chatMeta?.participants.find((p) => p !== telegramId) ?? null;
  const myPhoto = useProfilePhoto(telegramId);
  const otherPhoto = useProfilePhoto(otherParticipantId);

  // Presence: track which chat we're viewing (heartbeat managed by layout)
  const { setCurrentChat } = usePresenceActions(telegramId);
  const otherPresence = useUserPresence(
    !chatMeta?.isGroup && !chatMeta?.isGlobal ? otherParticipantId : null
  );

  // Set current chat for presence tracking + mark as read
  useEffect(() => {
    if (!currentUser || !telegramId || !chatId) return;
    setCurrentChat(chatId);

    // Reset unread count and update read position
    const chatRef = doc(dbfs, "qc-chats", chatId);
    updateDoc(chatRef, {
      [`unreadCounts.${telegramId}`]: 0,
      [`readPositions.${telegramId}`]: serverTimestamp(),
    }).catch(() => {});

    return () => {
      setCurrentChat(null);
      // Clear typing on leave
      updateDoc(chatRef, {
        [`typing.${telegramId}`]: deleteField(),
      }).catch(() => {});
      // Clear pending typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [currentUser, telegramId, chatId, setCurrentChat]);

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

  // Subscribe to chat metadata (real-time for typing + readPositions)
  useEffect(() => {
    if (!currentUser || !chatId) return;
    const chatRef = doc(dbfs, "qc-chats", chatId);
    const unsub = onSnapshot(chatRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const participants = data.participants || [];
        participantsRef.current = participants;
        setChatMeta({
          participants,
          participantNames: data.participantNames || {},
          isGroup: data.isGroup || false,
          isGlobal: data.isGlobal || false,
          groupName: data.groupName,
          joinCode: data.joinCode,
          createdBy: data.createdBy,
          readPositions: data.readPositions || {},
          typing: data.typing || {},
        });
      }
    }, (error) => {
      console.error("Chat meta listener error:", error);
    });
    return () => unsub();
  }, [currentUser, chatId]);

  // Subscribe to messages and decrypt them
  const isGroupChat = chatMeta?.isGroup || chatMeta?.isGlobal;
  // Track whether we've set up the messages subscription (only needs chatId + auth)
  const [messagesReady, setMessagesReady] = useState(false);

  // Wait for initial chatMeta to arrive before subscribing to messages
  useEffect(() => {
    if (chatMeta && !messagesReady) setMessagesReady(true);
  }, [chatMeta, messagesReady]);

  useEffect(() => {
    if (!currentUser || !chatId || !messagesReady) return;

    const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(MESSAGES_LIMIT));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Use participantsRef for latest participants (avoids stale closure)
      const participants = [...participantsRef.current];

      const rawMsgs: {
        id: string;
        rawText: string;
        senderName: string;
        senderId: string;
        createdAt: Timestamp | null;
        encrypted: boolean;
        replyTo?: { id: string; text: string; senderName: string };
      }[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        rawMsgs.push({
          id: docSnap.id,
          rawText: data.text || "",
          senderName: data.senderName || "Unknown",
          senderId: data.senderId || "",
          createdAt: data.createdAt,
          encrypted: data.encrypted === true,
          replyTo: data.replyTo || undefined,
        });
      });

      const decryptedMsgs = await Promise.all(
        rawMsgs.map(async (msg) => {
          let text = msg.rawText;
          if (msg.encrypted && isEncryptedMessage(msg.rawText)) {
            text = await decryptMessage(msg.rawText, participants, chatId);
          }
          // Decrypt reply preview if present
          let replyData = msg.replyTo;
          if (replyData?.text && isEncryptedMessage(replyData.text)) {
            const decryptedReply = await decryptMessage(replyData.text, participants, chatId);
            replyData = { ...replyData, text: decryptedReply };
          }
          return {
            id: msg.id,
            text,
            senderName: msg.senderName,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
            encrypted: msg.encrypted,
            replyTo: replyData,
          };
        })
      );

      setMessages(decryptedMsgs);
      setIsLoading(false);
      setTimeout(() => scrollToBottom(), 50);

      // Update read position on new messages
      if (telegramId) {
        updateDoc(doc(dbfs, "qc-chats", chatId), {
          [`unreadCounts.${telegramId}`]: 0,
          [`readPositions.${telegramId}`]: serverTimestamp(),
        }).catch(() => {});
      }
    });

    return () => unsubscribe();
  }, [currentUser, chatId, messagesReady, scrollToBottom, telegramId]);

  // Initial scroll
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom(true);
    }
  }, [isLoading, messages.length, scrollToBottom]);

  // Typing indicator: set/clear typing status
  const setTyping = useCallback(
    (typing: boolean) => {
      if (!telegramId || !chatId) return;
      if (typing === isTypingRef.current) return;
      isTypingRef.current = typing;

      const chatRef = doc(dbfs, "qc-chats", chatId);
      if (typing) {
        updateDoc(chatRef, { [`typing.${telegramId}`]: serverTimestamp() }).catch(() => {});
      } else {
        updateDoc(chatRef, { [`typing.${telegramId}`]: deleteField() }).catch(() => {});
      }
    },
    [telegramId, chatId]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Set typing indicator
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), TYPING_TIMEOUT_MS);
  };

  // Send encrypted message
  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || !telegramId || !chatId || !chatMeta || isSending) return;

    setIsSending(true);
    setNewMessage("");
    setTyping(false);
    const currentReply = replyTo;
    setReplyTo(null);

    const senderName = qcUsername || "Unknown";

    try {
      // Use participantsRef for latest participants
      const participants = participantsRef.current;
      const encryptedText = await encryptMessage(text, participants, chatId);

      // Build message doc
      const messageDoc: Record<string, unknown> = {
        text: encryptedText,
        senderName,
        senderId: telegramId,
        createdAt: serverTimestamp(),
        encrypted: true,
      };

      // Add reply reference if replying
      if (currentReply) {
        // Store encrypted version of reply text for security
        const replyText = currentReply.text.length > 80
          ? currentReply.text.slice(0, 80) + "…"
          : currentReply.text;
        const encryptedReplyText = await encryptMessage(replyText, participants, chatId);
        messageDoc.replyTo = {
          id: currentReply.id,
          text: encryptedReplyText,
          senderName: currentReply.senderName,
        };
      }

      const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");
      await addDoc(messagesRef, messageDoc);

      // Cache preview locally so sender can see it in chat list
      const preview = text.length > 50 ? text.slice(0, 50) + "…" : text;
      try { localStorage.setItem(`qc-preview-${chatId}`, preview); } catch {}

      // Build unread increment for all other participants
      const updates: Record<string, unknown> = {
        lastMessage: encryptedText,
        lastMessageBy: telegramId,
        lastMessageAt: serverTimestamp(),
        [`readPositions.${telegramId}`]: serverTimestamp(),
        [`unreadCounts.${telegramId}`]: 0,
      };
      for (const pid of participants) {
        if (pid !== telegramId) {
          updates[`unreadCounts.${pid}`] = increment(1);
        }
      }
      await updateDoc(doc(dbfs, "qc-chats", chatId), updates);

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

  // Header display name
  const getHeaderName = (): string => {
    if (!chatMeta) return "Chat";
    if (chatMeta.isGlobal) return "QC Global";
    if (chatMeta.isGroup && chatMeta.groupName) return chatMeta.groupName;
    if (!chatMeta.isGroup && chatMeta.participants.length === 1 && chatMeta.participants[0] === telegramId) {
      return "Saved Messages";
    }
    const other = chatMeta.participants.find((p) => p !== telegramId);
    if (other && chatMeta.participantNames[other]) return chatMeta.participantNames[other];
    return "Chat";
  };

  const isSelfChat = !chatMeta?.isGroup && !chatMeta?.isGlobal &&
    chatMeta?.participants.length === 1 && chatMeta.participants[0] === telegramId;

  const headerName = getHeaderName();
  const headerInitials = getInitials(headerName);
  const headerAvatarColor = getAvatarColor(headerName);
  const selfName = qcUsername || "Me";
  const selfInitials = getInitials(selfName);
  const selfAvatarColor = getAvatarColor(selfName);

  // Typing indicator: who is typing (exclude self)
  const typingUsers = chatMeta?.typing
    ? Object.entries(chatMeta.typing)
        .filter(([uid, ts]) => {
          if (uid === telegramId) return false;
          if (!ts || typeof ts.toDate !== "function") return false;
          return Date.now() - ts.toDate().getTime() < 5000;
        })
        .map(([uid]) => chatMeta.participantNames?.[uid] || "Someone")
    : [];

  // Read receipt status for own messages
  const getMessageStatus = (msg: ChatMessage): "sent" | "delivered" | "read" => {
    if (!chatMeta) return "sent";
    // Self-chat: always read (you're both sender and reader)
    if (isSelfChat) return "read";
    if (isGroupChat) return "sent";
    const otherId = chatMeta.participants.find((p) => p !== telegramId);
    if (!otherId) return "sent";

    // Read: other user's readPosition >= this message's createdAt
    const otherReadPos = chatMeta.readPositions?.[otherId];
    if (otherReadPos && msg.createdAt) {
      if (otherReadPos.toDate() >= msg.createdAt.toDate()) return "read";
    }

    // Delivered: other user is online
    if (otherPresence?.isOnline) return "delivered";

    return "sent";
  };

  // Header subtitle text — no typing indicator here (shown as bubble below)
  const getSubtitle = (): { text: string; color: string } => {
    if (isGroupChat) {
      return {
        text: `${chatMeta?.participants.length || 0} members · Encrypted`,
        color: "text-green-400",
      };
    }

    if (isSelfChat) {
      return { text: "Encrypted personal notes", color: "text-green-400" };
    }

    // DM: show online/last seen
    const presenceText = formatLastSeen(otherPresence);
    if (presenceText === "online") {
      return { text: "online", color: "text-green-400" };
    }
    if (presenceText) {
      return { text: presenceText, color: "text-muted-foreground" };
    }

    return { text: "End-to-end encrypted", color: "text-green-400" };
  };

  const subtitle = getSubtitle();

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      {/* Chat Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-sm shrink-0"
        style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            {chatMeta?.isGlobal ? (
              <AvatarImage src="/png/qc-global-logo.png" alt="QC Global" />
            ) : (isSelfChat ? myPhoto : !isGroupChat ? otherPhoto : null) ? (
              <>
                <AvatarImage src={(isSelfChat ? myPhoto : otherPhoto) || undefined} />
                <AvatarFallback className={`${isSelfChat ? selfAvatarColor : headerAvatarColor} text-white text-xs font-semibold`}>
                  {isSelfChat ? selfInitials : headerInitials}
                </AvatarFallback>
              </>
            ) : (
              <AvatarFallback className={`${isSelfChat ? selfAvatarColor : headerAvatarColor} text-white text-xs font-semibold`}>
                {isSelfChat ? selfInitials : headerInitials}
              </AvatarFallback>
            )}
          </Avatar>
          {/* Online indicator dot for DMs */}
          {!isGroupChat && !isSelfChat && otherPresence?.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
          )}
          {isGroupChat && !chatMeta?.isGlobal && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-card border-2 border-background flex items-center justify-center">
              <Icon icon="solar:users-group-rounded-bold" className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-semibold text-foreground truncate">
              {isSelfChat ? "Saved Messages" : isGroupChat ? headerName : `@${headerName}`}
            </h1>
            {chatMeta?.isGlobal && (
              <Icon icon="solar:verified-check-bold" className="w-4 h-4 text-primary shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1">
            {subtitle.color === "text-green-400" && typingUsers.length === 0 && (
              <Icon icon="solar:lock-keyhole-bold" className="w-3 h-3 text-green-400 shrink-0" />
            )}
            <span className={`text-[11px] ${subtitle.color} leading-none truncate`}>
              {subtitle.text}
            </span>
          </div>
        </div>

        {/* Group actions: share */}
        {isGroupChat && chatMeta?.joinCode && (
          <Button
            size="icon"
            variant="ghost"
            className="w-9 h-9 rounded-full shrink-0"
            onClick={() => setShowShareModal(true)}
          >
            <Icon icon="lucide:share-2" className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Share Modal */}
      {isGroupChat && chatMeta?.joinCode && (
        <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
          <DialogContent className="max-w-[340px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center">Share Group</DialogTitle>
              <DialogDescription className="text-center text-xs">
                Invite others to join {headerName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-2">
                  <Icon icon="solar:users-group-rounded-bold" className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-semibold">{headerName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {chatMeta.participants.length} members
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">Join Code</p>
                <p className="text-lg font-mono font-bold tracking-[0.3em] text-foreground">
                  {chatMeta.joinCode}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2 rounded-xl"
                  onClick={() => {
                    const inviteLink = `https://t.me/QuantumClubBot/app?startapp=join_${chatMeta.joinCode}`;
                    const text = `Join "${headerName}" on QC Chat!`;
                    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
                    try {
                      window.Telegram?.WebApp?.openTelegramLink(shareUrl);
                    } catch {
                      window.open(shareUrl, "_blank");
                    }
                    setShowShareModal(false);
                  }}
                >
                  <Icon icon="ic:baseline-telegram" className="w-4 h-4" />
                  Share via Telegram
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 rounded-xl"
                  onClick={() => {
                    const inviteLink = `https://t.me/QuantumClubBot/app?startapp=join_${chatMeta.joinCode}`;
                    navigator.clipboard.writeText(inviteLink);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 1500);
                  }}
                >
                  <Icon icon={codeCopied ? "lucide:check" : "lucide:link"} className="w-4 h-4" />
                  {codeCopied ? "Copied!" : "Copy Link"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Messages */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scroll-smooth"
      >
        {/* Chat Notice */}
        {!isLoading && (
          <div className="flex justify-center py-3 pb-1">
            <div className="bg-muted/50 rounded-full px-3 py-1 flex items-center gap-1.5">
              <Icon
                icon={isGroupChat ? "solar:users-group-rounded-bold" : "solar:lock-keyhole-bold"}
                className="w-3 h-3 text-muted-foreground shrink-0"
              />
              <span className="text-[10px] text-muted-foreground leading-none">
                {chatMeta?.isGlobal
                  ? "Welcome to QC Global. Everyone can chat here."
                  : isGroupChat
                  ? `Group chat · ${chatMeta?.participants.length || 0} members`
                  : isSelfChat
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
            const isSystemMsg = msg.senderId === "system";
            const isOwnMessage = msg.senderId === telegramId;
            const consecutive = isConsecutive(i);
            const showDate = shouldShowDateDivider(i);
            const status = isOwnMessage && !isSystemMsg ? getMessageStatus(msg) : null;

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

                {isSystemMsg ? (
                  <div className="flex justify-center my-1.5">
                    <span className="text-[10px] text-muted-foreground bg-muted/40 rounded-full px-3 py-0.5">
                      {msg.text}
                    </span>
                  </div>
                ) : (
                <div
                  className={`flex items-end gap-2 ${isOwnMessage ? "justify-end" : "justify-start"} ${
                    consecutive ? "mt-0.5" : "mt-2.5"
                  }`}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    swipeRef.current = { startX: touch.clientX, startY: touch.clientY, msgId: msg.id };
                  }}
                  onTouchEnd={(e) => {
                    if (swipeRef.current.msgId !== msg.id) return;
                    const touch = e.changedTouches[0];
                    const dx = touch.clientX - swipeRef.current.startX;
                    const dy = Math.abs(touch.clientY - swipeRef.current.startY);
                    // Swipe right to reply (min 60px horizontal, max 40px vertical drift)
                    if (dx > 60 && dy < 40) {
                      setReplyTo(msg);
                      inputRef.current?.focus();
                    }
                    swipeRef.current = { startX: 0, startY: 0, msgId: null };
                  }}
                >
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
                    {!isOwnMessage && !consecutive && isGroupChat && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-semibold text-primary">
                          @{msg.senderName}
                        </span>
                      </div>
                    )}

                    {/* Reply preview inside bubble */}
                    {msg.replyTo && (
                      <div className="border-l-2 border-primary/50 pl-2 mb-1.5 py-0.5">
                        <p className="text-[10px] font-semibold text-primary">
                          {msg.replyTo.senderName === qcUsername ? "You" : `@${msg.replyTo.senderName}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {msg.replyTo.text}
                        </p>
                      </div>
                    )}

                    <div className="flex items-end gap-2">
                      <p className="text-[13px] text-foreground leading-snug break-words whitespace-pre-wrap flex-1">
                        {msg.text}
                      </p>
                      <span className="flex items-center gap-0.5 shrink-0 self-end pb-0.5">
                        <span className="text-[9px] text-muted-foreground">
                          {formatTime(msg.createdAt)}
                        </span>
                        {/* Read/delivered checkmarks for own messages */}
                        {status && (
                          <span className={status === "read" ? "text-primary" : "text-muted-foreground"}>
                            {status === "sent" ? (
                              <Icon icon="lucide:check" className="w-3 h-3" />
                            ) : (
                              <Icon icon="lucide:check-check" className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                )}
              </div>
            );
          })
        )}

        {/* Typing indicator as chat bubble */}
        {typingUsers.length > 0 && (
          <div className="flex items-end gap-2 justify-start mt-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className={`${getAvatarColor(typingUsers[0])} text-white text-[10px] font-semibold`}>
                {getInitials(typingUsers[0])}
              </AvatarFallback>
            </Avatar>
            <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
              {isGroupChat && (
                <p className="text-[10px] font-semibold text-primary mb-1">
                  {typingUsers.join(", ")}
                </p>
              )}
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

      {/* Reply preview bar */}
      {replyTo && (
        <div className="px-3 py-2 border-t border-border/50 bg-card/80 backdrop-blur-sm shrink-0 flex items-center gap-2">
          <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
            <p className="text-[11px] font-semibold text-primary truncate">
              {replyTo.senderName === qcUsername ? "You" : `@${replyTo.senderName}`}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {replyTo.text}
            </p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="shrink-0 p-1 rounded-full hover:bg-muted/50 transition-colors outline-none"
          >
            <Icon icon="lucide:x" className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Message Input */}
      <div
        className="border-t border-border/50 bg-card/50 backdrop-blur-sm px-3 py-2.5 shrink-0"
        style={{ paddingBottom: "max(0.625rem, var(--tg-safe-area-inset-bottom, 0px))" }}
      >
        {!telegramId ? (
          <div className="flex items-center justify-center py-2">
            <p className="text-xs text-muted-foreground">Sign in to chat</p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={replyTo ? "Reply..." : "Type a message..."}
              maxLength={500}
              className="flex-1 rounded-full px-4 py-2.5 h-auto bg-background border-border/50 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/40"
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
              size="icon"
              className="w-10 h-10 rounded-full shrink-0 shadow-lg shadow-primary/20"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Icon icon="material-symbols:send-rounded" className="w-5 h-5" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
