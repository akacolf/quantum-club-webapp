"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { dbfs } from "@/app/(firebase)/client";
import {
  collection,
  doc,
  query,
  setDoc,
  serverTimestamp,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

interface ChatConversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageBy: string;
  lastMessageAt: Timestamp | null;
  isGroup: boolean;
  groupName?: string;
  unreadCount?: number;
}

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

function formatLastTime(timestamp: Timestamp | null): string {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function QCChatListPage() {
  const router = useRouter();
  const { telegramId, qcUsername } = useUserContext();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newChatUsername, setNewChatUsername] = useState("");
  const [showNewChatForm, setShowNewChatForm] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to user's conversations
  useEffect(() => {
    if (!telegramId) {
      setIsLoading(false);
      return;
    }

    const chatsRef = collection(dbfs, "qc-chats");
    const q = query(
      chatsRef,
      where("participants", "array-contains", telegramId),
      orderBy("lastMessageAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const chats: ChatConversation[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          chats.push({
            id: doc.id,
            participants: data.participants || [],
            participantNames: data.participantNames || {},
            lastMessage: data.lastMessage || "",
            lastMessageBy: data.lastMessageBy || "",
            lastMessageAt: data.lastMessageAt,
            isGroup: data.isGroup || false,
            groupName: data.groupName,
          });
        });
        setConversations(chats);
        setIsLoading(false);
      },
      (error) => {
        console.error("Chat list error:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [telegramId]);

  // Get display name for a chat
  const getChatDisplayName = (chat: ChatConversation): string => {
    if (chat.isGroup && chat.groupName) return chat.groupName;
    // Self-chat (Saved Messages)
    if (chat.participants.length === 1 && chat.participants[0] === telegramId) {
      return "Saved Messages";
    }
    const otherParticipant = chat.participants.find((p) => p !== telegramId);
    if (otherParticipant && chat.participantNames[otherParticipant]) {
      return chat.participantNames[otherParticipant];
    }
    return "Unknown User";
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter((chat) => {
    if (!searchQuery.trim()) return true;
    const displayName = getChatDisplayName(chat).toLowerCase();
    return displayName.includes(searchQuery.toLowerCase());
  });

  const handleStartChat = async () => {
    const normalizedUsername = newChatUsername.trim().replace(/^@+/, "").toLowerCase();

    if (!telegramId) {
      setNewChatError("Please sign in to start a chat.");
      return;
    }

    if (!normalizedUsername) {
      setNewChatError("Enter a QC username.");
      return;
    }

    setIsStartingChat(true);
    setNewChatError(null);

    try {
      const resolveRes = await fetch(
        `/api/qc-username?username=${encodeURIComponent(normalizedUsername)}`,
        { cache: "no-store" }
      );
      const resolveData = await resolveRes.json().catch(() => ({}));

      if (!resolveRes.ok || !resolveData?.resolved || !resolveData?.owner) {
        setNewChatError("Username not found.");
        return;
      }

      const otherUserId = String(resolveData.owner);
      const isSelfChat = otherUserId === telegramId;

      // Check for existing chat
      const existingChat = conversations.find(
        (chat) =>
          !chat.isGroup &&
          (isSelfChat
            ? chat.participants.length === 1 && chat.participants[0] === telegramId
            : chat.participants.length === 2 &&
              chat.participants.includes(telegramId) &&
              chat.participants.includes(otherUserId))
      );

      if (existingChat) {
        setShowNewChatForm(false);
        setNewChatUsername("");
        router.push(`/ecosystem/chat/${existingChat.id}`);
        return;
      }

      let otherDisplayName = normalizedUsername;
      if (!isSelfChat) {
        try {
          const profileRes = await fetch(
            `/api/qc-username?qcId=${encodeURIComponent(otherUserId)}`,
            { cache: "no-store" }
          );
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData?.username && typeof profileData.username === "string") {
              otherDisplayName = profileData.username.replace(/^@+/, "").trim() || otherDisplayName;
            }
          }
        } catch {
          // Fallback to normalized username if lookup fails.
        }
      }

      const selfDisplayName = qcUsername?.replace(/^@+/, "").trim() || "Unknown";
      const chatId = isSelfChat
        ? `${telegramId}_saved`
        : [telegramId, otherUserId].sort().join("_");

      const participants = isSelfChat ? [telegramId] : [telegramId, otherUserId];
      const participantNames: Record<string, string> = {
        [telegramId]: selfDisplayName,
      };
      if (!isSelfChat) {
        participantNames[otherUserId] = otherDisplayName;
      }

      await setDoc(
        doc(dbfs, "qc-chats", chatId),
        {
          participants,
          participantNames,
          isGroup: false,
          isSelfChat,
          lastMessage: "",
          lastMessageBy: "",
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      setShowNewChatForm(false);
      setNewChatUsername("");
      router.push(`/ecosystem/chat/${chatId}`);
    } catch (error) {
      console.error("Failed to start direct chat:", error);
      setNewChatError("Could not start chat. Please try again.");
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-70px)] bg-background">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/30">
              <Icon icon="proicons:chat" className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">QC Chat</h1>
              {qcUsername && (
                <p className="text-[11px] text-muted-foreground">
                  @{qcUsername}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowNewChatForm((prev) => !prev);
              setNewChatError(null);
            }}
            disabled={!telegramId}
            className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
            aria-label="Start new chat"
            title="Start new chat"
          >
            <Icon icon="lucide:plus" className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Icon
            icon="solar:magnifer-linear"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9 h-9 rounded-xl bg-muted/50 border-border/50 text-sm"
          />
        </div>

        {showNewChatForm && (
          <div className="mt-3 p-4 rounded-xl border border-border/60 bg-card/60 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon icon="proicons:chat" className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">New Conversation</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                <Input
                  value={newChatUsername}
                  onChange={(e) => {
                    setNewChatUsername(e.target.value.replace(/^@+/, ""));
                    setNewChatError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleStartChat();
                    }
                  }}
                  placeholder="username"
                  className="h-9 pl-8 rounded-lg bg-background/70 border-border/60 text-sm font-mono"
                  disabled={isStartingChat}
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleStartChat}
                disabled={isStartingChat || !newChatUsername.trim()}
                className="h-9 min-w-[52px] px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center"
              >
                {isStartingChat ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  "Chat"
                )}
              </button>
            </div>
            {newChatError && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                {newChatError}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Enter a QC username to start a direct conversation. The other person must have claimed a username in Wallet Settings.
            </p>
            <div className="flex items-center gap-1.5 pt-0.5">
              <Icon icon="solar:lock-keyhole-bold" className="w-3 h-3 text-green-400 shrink-0" />
              <span className="text-[10px] text-green-400 leading-none">All chats are end-to-end encrypted</span>
            </div>
          </div>
        )}
      </div>

      <Separator className="opacity-50" />

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Loading chats...</p>
          </div>
        ) : !telegramId ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <Icon icon="proicons:chat" className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Sign in to chat</p>
            <p className="text-xs text-muted-foreground">
              Log in with your Telegram account to start chatting.
            </p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <Icon icon="proicons:chat" className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {searchQuery ? "No chats found" : "No conversations yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery
                  ? "Try a different search term"
                  : "Start a conversation by searching for a QC username"}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredConversations.map((chat) => {
              const displayName = getChatDisplayName(chat);
              const initial = getInitials(displayName);
              const avatarColor = getAvatarColor(displayName);
              const isLastMsgByMe = chat.lastMessageBy === telegramId;

              return (
                <button
                  key={chat.id}
                  onClick={() => router.push(`/ecosystem/chat/${chat.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left"
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={`${avatarColor} text-white text-sm font-semibold`}>
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    {chat.isGroup && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-card border-2 border-background flex items-center justify-center">
                        <Icon icon="solar:users-group-rounded-bold" className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {displayName}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {formatLastTime(chat.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 leading-relaxed">
                      {isLastMsgByMe && (
                        <span className="text-foreground/50">You: </span>
                      )}
                      {chat.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
