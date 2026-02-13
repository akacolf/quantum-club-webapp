"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useProfilePhoto } from "@/app/(hooks)/useProfilePhoto";
import { useUserPresence } from "@/app/(hooks)/usePresence";
import { dbfs } from "@/app/(firebase)/client";
import {
  collection,
  doc,
  getDoc,
  query,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

const GLOBAL_CHAT_ID = "qc-global";

interface ChatConversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageBy: string;
  lastMessageAt: Timestamp | null;
  isGroup: boolean;
  isGlobal?: boolean;
  groupName?: string;
  joinCode?: string;
  memberCount?: number;
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

function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function ChatListItem({
  chat,
  telegramId,
  onNavigate,
}: {
  chat: ChatConversation;
  telegramId: string;
  onNavigate: (chatId: string) => void;
}) {
  const isSelfChat = !chat.isGroup && !chat.isGlobal &&
    chat.participants.length === 1 && chat.participants[0] === telegramId;
  const otherParticipantId = chat.participants.find((p) => p !== telegramId) ?? null;
  const photoUrl = useProfilePhoto(
    chat.isGroup || chat.isGlobal ? null : isSelfChat ? telegramId : otherParticipantId
  );
  const otherPresence = useUserPresence(
    !chat.isGroup && !chat.isGlobal && !isSelfChat ? otherParticipantId : null
  );

  const displayName = (() => {
    if (chat.isGlobal) return "QC Global";
    if (chat.isGroup && chat.groupName) return chat.groupName;
    if (isSelfChat) return "Saved Messages";
    if (otherParticipantId && chat.participantNames[otherParticipantId]) {
      return chat.participantNames[otherParticipantId];
    }
    return "Unknown User";
  })();

  const initial = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);
  const isLastMsgByMe = chat.lastMessageBy === telegramId;
  const unread = chat.unreadCount || 0;

  // Show sender's own preview from localStorage, others see "Encrypted message"
  const previewText = (() => {
    if (!chat.lastMessage) return "No messages yet";
    if (chat.lastMessage === "Encrypted message" || chat.lastMessage === "🔒 Encrypted message") {
      if (isLastMsgByMe) {
        try {
          const cached = localStorage.getItem(`qc-preview-${chat.id}`);
          if (cached) return cached;
        } catch {}
      }
      return "Encrypted message";
    }
    return chat.lastMessage;
  })();

  return (
    <button
      onClick={() => onNavigate(chat.id)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left"
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12">
          {chat.isGlobal ? (
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
              <Icon icon="uiw:global" className="w-6 h-6" />
            </AvatarFallback>
          ) : photoUrl ? (
            <>
              <AvatarImage src={photoUrl} />
              <AvatarFallback className={`${avatarColor} text-white text-sm font-semibold`}>
                {initial}
              </AvatarFallback>
            </>
          ) : (
            <AvatarFallback className={`${avatarColor} text-white text-sm font-semibold`}>
              {initial}
            </AvatarFallback>
          )}
        </Avatar>
        {/* Online indicator dot for DMs */}
        {!chat.isGroup && !chat.isGlobal && !isSelfChat && otherPresence?.isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-card" />
        )}
        {chat.isGroup && !chat.isGlobal && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-card border-2 border-background flex items-center justify-center">
            <Icon icon="solar:users-group-rounded-bold" className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {displayName}
            </span>
            {chat.isGlobal && (
              <Icon icon="solar:verified-check-bold" className="w-4 h-4 text-primary shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="text-[10px] text-muted-foreground">
              {formatLastTime(chat.lastMessageAt)}
            </span>
            {unread > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground border-0 flex items-center justify-center">
                {unread > 99 ? "99+" : unread}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {(chat.isGroup || chat.isGlobal) && chat.memberCount && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              {chat.memberCount} members ·{" "}
            </span>
          )}
          <p className={`text-xs truncate leading-relaxed ${unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {isLastMsgByMe && (
              <span className="text-foreground/50">You: </span>
            )}
            {previewText}
          </p>
        </div>
      </div>
    </button>
  );
}

type FormMode = "none" | "dm" | "group" | "join";

export default function QCChatListPage() {
  const router = useRouter();
  const { telegramId, qcUsername } = useUserContext();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [globalChat, setGlobalChat] = useState<ChatConversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formMode, setFormMode] = useState<FormMode>("none");
  const [isLoading, setIsLoading] = useState(true);

  // DM form state
  const [newChatUsername, setNewChatUsername] = useState("");
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Group form state
  const [groupName, setGroupName] = useState("");

  // Join group state
  const [joinCode, setJoinCode] = useState("");

  // Ensure global chat exists and user is a participant
  useEffect(() => {
    if (!telegramId || !qcUsername) return;

    const ensureGlobalChat = async () => {
      const globalRef = doc(dbfs, "qc-chats", GLOBAL_CHAT_ID);
      const globalSnap = await getDoc(globalRef);

      const selfName = qcUsername.replace(/^@+/, "").trim() || "Unknown";

      if (!globalSnap.exists()) {
        await setDoc(globalRef, {
          isGroup: true,
          isGlobal: true,
          groupName: "QC Global",
          participants: [telegramId],
          participantNames: { [telegramId]: selfName },
          createdBy: "system",
          lastMessage: "Welcome to QC Global!",
          lastMessageBy: "system",
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } else {
        const data = globalSnap.data();
        const updates: Record<string, unknown> = {};
        if (!data.participants?.includes(telegramId)) {
          updates.participants = arrayUnion(telegramId);
          updates[`participantNames.${telegramId}`] = selfName;
        }
        // Fix legacy globe emoji in existing global chats
        if (data.lastMessage?.includes("🌍")) {
          updates.lastMessage = data.lastMessage.replace(/\s*🌍/, "");
        }
        if (Object.keys(updates).length > 0) {
          await updateDoc(globalRef, updates);
        }
      }
    };

    ensureGlobalChat().catch(console.error);
  }, [telegramId, qcUsername]);

  // Subscribe to global chat separately
  useEffect(() => {
    const globalRef = doc(dbfs, "qc-chats", GLOBAL_CHAT_ID);
    const unsubscribe = onSnapshot(globalRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGlobalChat({
          id: snap.id,
          participants: data.participants || [],
          participantNames: data.participantNames || {},
          lastMessage: data.lastMessage || "",
          lastMessageBy: data.lastMessageBy || "",
          lastMessageAt: data.lastMessageAt,
          isGroup: true,
          isGlobal: true,
          groupName: "QC Global",
          memberCount: data.participants?.length || 0,
          unreadCount: data.unreadCounts?.[telegramId || ""] || 0,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to user's conversations (DMs + groups)
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
        snapshot.forEach((docSnap) => {
          // Skip global chat — it's shown separately
          if (docSnap.id === GLOBAL_CHAT_ID) return;
          const data = docSnap.data();
          chats.push({
            id: docSnap.id,
            participants: data.participants || [],
            participantNames: data.participantNames || {},
            lastMessage: data.lastMessage || "",
            lastMessageBy: data.lastMessageBy || "",
            lastMessageAt: data.lastMessageAt,
            isGroup: data.isGroup || false,
            isGlobal: false,
            groupName: data.groupName,
            joinCode: data.joinCode,
            memberCount: data.isGroup ? data.participants?.length : undefined,
            unreadCount: data.unreadCounts?.[telegramId] || 0,
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
    if (chat.isGlobal) return "QC Global";
    if (chat.isGroup && chat.groupName) return chat.groupName;
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

  // Show global chat in search results too
  const showGlobalChat =
    globalChat &&
    (!searchQuery.trim() ||
      "qc global".includes(searchQuery.toLowerCase()));

  const toggleForm = useCallback((mode: FormMode) => {
    setFormMode((prev) => (prev === mode ? "none" : mode));
    setFormError(null);
    setNewChatUsername("");
    setGroupName("");
    setJoinCode("");
  }, []);

  // Start DM
  const handleStartChat = async () => {
    const normalizedUsername = newChatUsername.trim().replace(/^@+/, "").toLowerCase();

    if (!telegramId) {
      setFormError("Please sign in to start a chat.");
      return;
    }

    if (!normalizedUsername) {
      setFormError("Enter a QC username.");
      return;
    }

    setIsStartingChat(true);
    setFormError(null);

    try {
      const resolveRes = await fetch(
        `/api/qc-username?username=${encodeURIComponent(normalizedUsername)}`,
        { cache: "no-store" }
      );
      const resolveData = await resolveRes.json().catch(() => ({}));

      if (!resolveRes.ok || !resolveData?.resolved || !resolveData?.owner) {
        setFormError("Username not found.");
        return;
      }

      const otherUserId = String(resolveData.owner);
      const isSelfChat = otherUserId === telegramId;

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
        setFormMode("none");
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
          // Fallback to normalized username
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

      setFormMode("none");
      setNewChatUsername("");
      router.push(`/ecosystem/chat/${chatId}`);
    } catch (error) {
      console.error("Failed to start direct chat:", error);
      setFormError("Could not start chat. Please try again.");
    } finally {
      setIsStartingChat(false);
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!telegramId || !name) {
      setFormError(name ? "Please sign in." : "Enter a group name.");
      return;
    }

    setIsStartingChat(true);
    setFormError(null);

    try {
      const selfDisplayName = qcUsername?.replace(/^@+/, "").trim() || "Unknown";
      const code = generateJoinCode();
      const chatId = `group_${telegramId}_${Date.now()}`;

      await setDoc(doc(dbfs, "qc-chats", chatId), {
        isGroup: true,
        isGlobal: false,
        groupName: name,
        participants: [telegramId],
        participantNames: { [telegramId]: selfDisplayName },
        createdBy: telegramId,
        joinCode: code,
        lastMessage: `${selfDisplayName} created the group`,
        lastMessageBy: "system",
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      setFormMode("none");
      setGroupName("");
      router.push(`/ecosystem/chat/${chatId}`);
    } catch (error) {
      console.error("Failed to create group:", error);
      setFormError("Could not create group. Please try again.");
    } finally {
      setIsStartingChat(false);
    }
  };

  // Join group by code
  const handleJoinGroup = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!telegramId || !code) {
      setFormError(code ? "Please sign in." : "Enter a join code.");
      return;
    }

    setIsStartingChat(true);
    setFormError(null);

    try {
      // Check local conversations first
      const localMatch = conversations.find(
        (c) => c.joinCode?.toUpperCase() === code
      );
      if (localMatch) {
        setFormMode("none");
        setJoinCode("");
        router.push(`/ecosystem/chat/${localMatch.id}`);
        return;
      }

      // Query Firestore for the join code
      const chatsRef = collection(dbfs, "qc-chats");
      const { getDocs, query: fsQuery } = await import("firebase/firestore");
      const q = fsQuery(chatsRef, where("joinCode", "==", code));
      const snap = await getDocs(q);

      if (snap.empty) {
        setFormError("Invalid join code. No group found.");
        return;
      }

      const groupDoc = snap.docs[0];
      const groupData = groupDoc.data();

      if (groupData.participants?.includes(telegramId)) {
        setFormMode("none");
        setJoinCode("");
        router.push(`/ecosystem/chat/${groupDoc.id}`);
        return;
      }

      const selfDisplayName = qcUsername?.replace(/^@+/, "").trim() || "Unknown";

      await updateDoc(doc(dbfs, "qc-chats", groupDoc.id), {
        participants: arrayUnion(telegramId),
        [`participantNames.${telegramId}`]: selfDisplayName,
        lastMessage: `${selfDisplayName} joined the group`,
        lastMessageBy: "system",
        lastMessageAt: serverTimestamp(),
      });

      setFormMode("none");
      setJoinCode("");
      router.push(`/ecosystem/chat/${groupDoc.id}`);
    } catch (error) {
      console.error("Failed to join group:", error);
      setFormError("Could not join group. Please try again.");
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-70px)] bg-background">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
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
          <Button
            size="icon"
            onClick={() => toggleForm(formMode === "none" ? "dm" : "none")}
            disabled={!telegramId}
            className="w-9 h-9 rounded-full"
            aria-label="New conversation"
          >
            <Icon icon={formMode === "none" ? "lucide:plus" : "lucide:x"} className="w-4 h-4" />
          </Button>
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

        {/* New Chat / Create Group / Join Group forms */}
        {formMode !== "none" && (
          <div className="mt-3 p-4 rounded-xl border border-border/60 bg-card/60 space-y-3">
            {/* Tabs */}
            <div className="flex gap-1 p-0.5 rounded-lg bg-muted/50">
              {(["dm", "group", "join"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setFormMode(mode);
                    setFormError(null);
                  }}
                  className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-all ${
                    formMode === mode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode === "dm" ? "New Chat" : mode === "group" ? "Create Group" : "Join Group"}
                </button>
              ))}
            </div>

            {/* DM Form */}
            {formMode === "dm" && (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                    <Input
                      value={newChatUsername}
                      onChange={(e) => {
                        setNewChatUsername(e.target.value.replace(/^@+/, ""));
                        setFormError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleStartChat(); }
                      }}
                      placeholder="username"
                      className="h-9 pl-8 rounded-lg bg-background/70 border-border/60 text-sm font-mono"
                      disabled={isStartingChat}
                      autoFocus
                    />
                  </div>
                  <Button
                    onClick={handleStartChat}
                    disabled={isStartingChat || !newChatUsername.trim()}
                    size="sm"
                    className="h-9 px-4 rounded-lg"
                  >
                    {isStartingChat ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      "Chat"
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Enter a QC username to start a direct conversation.
                </p>
                <div className="flex items-center gap-1.5">
                  <Icon icon="solar:lock-keyhole-bold" className="w-3 h-3 text-green-400 shrink-0" />
                  <span className="text-[10px] text-green-400 leading-none">Direct chats are end-to-end encrypted</span>
                </div>
              </>
            )}

            {/* Create Group Form */}
            {formMode === "group" && (
              <>
                <div className="flex gap-2">
                  <Input
                    value={groupName}
                    onChange={(e) => {
                      setGroupName(e.target.value);
                      setFormError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleCreateGroup(); }
                    }}
                    placeholder="Group name"
                    maxLength={50}
                    className="h-9 flex-1 rounded-lg bg-background/70 border-border/60 text-sm"
                    disabled={isStartingChat}
                    autoFocus
                  />
                  <Button
                    onClick={handleCreateGroup}
                    disabled={isStartingChat || !groupName.trim()}
                    size="sm"
                    className="h-9 px-4 rounded-lg"
                  >
                    {isStartingChat ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Create a group and share the join code with others to invite them.
                </p>
              </>
            )}

            {/* Join Group Form */}
            {formMode === "join" && (
              <>
                <div className="flex gap-2">
                  <Input
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      setFormError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleJoinGroup(); }
                    }}
                    placeholder="Enter join code"
                    maxLength={6}
                    className="h-9 flex-1 rounded-lg bg-background/70 border-border/60 text-sm font-mono tracking-widest text-center uppercase"
                    disabled={isStartingChat}
                    autoFocus
                  />
                  <Button
                    onClick={handleJoinGroup}
                    disabled={isStartingChat || !joinCode.trim()}
                    size="sm"
                    className="h-9 px-4 rounded-lg"
                  >
                    {isStartingChat ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      "Join"
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Enter a 6-character join code to join an existing group.
                </p>
              </>
            )}

            {formError && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                {formError}
              </p>
            )}
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
        ) : (
          <div className="divide-y divide-border/30">
            {/* Global Chat — always pinned at top */}
            {showGlobalChat && globalChat && (
              <ChatListItem
                chat={globalChat}
                telegramId={telegramId || ""}
                onNavigate={(chatId) => router.push(`/ecosystem/chat/${chatId}`)}
              />
            )}

            {filteredConversations.length === 0 && !showGlobalChat ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
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
                      : "Start a conversation or create a group"}
                  </p>
                </div>
              </div>
            ) : (
              filteredConversations.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  telegramId={telegramId || ""}
                  onNavigate={(chatId) => router.push(`/ecosystem/chat/${chatId}`)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
