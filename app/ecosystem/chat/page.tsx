"use client";

import { useState, useEffect, useRef } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FieldError } from "@/components/ui/field";
import { usernameSchema, USERNAME_MAX_LENGTH, chatDmSchema, chatGroupSchema, chatJoinSchema } from "@/lib/validations";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useProfilePhoto } from "@/app/(hooks)/useProfilePhoto";
import { useUserPresence } from "@/app/(hooks)/usePresence";
import { useGlobalChat, useChatConversations, type ChatConversation } from "@/app/(hooks)/queries/use-chat-list";
import { dbfs } from "@/app/(firebase)/client";
import {
  decryptMessage,
  isEncryptedMessage,
} from "@/lib/chat-crypto";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  where,
  type Timestamp,
} from "firebase/firestore";
import { registerQcUsername, updateQcUsernameAddress, resolveQcUsername } from "./actions";

const GLOBAL_CHAT_ID = "qc-global";

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
    if (isSelfChat) return "Saved Messages (You)";
    if (otherParticipantId && chat.participantNames[otherParticipantId]) {
      return chat.participantNames[otherParticipantId];
    }
    return "Unknown User";
  })();

  const initial = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);
  const isLastMsgByMe = chat.lastMessageBy === telegramId;
  const unread = chat.unreadCount || 0;

  // Decrypt lastMessage preview — works for both sender and receiver
  const [decryptedPreview, setDecryptedPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!chat.lastMessage) {
      requestAnimationFrame(() => setDecryptedPreview("No messages yet"));
      return;
    }
    // System messages (group creation, join, etc.) are never encrypted
    if (chat.lastMessageBy === "system") {
      requestAnimationFrame(() => setDecryptedPreview(chat.lastMessage));
      return;
    }
    // Legacy plaintext markers — can't decrypt these
    if (chat.lastMessage === "Encrypted message" || chat.lastMessage === "🔒 Encrypted message") {
      // Try sender's localStorage cache as fallback
      if (isLastMsgByMe) {
        try {
          const cached = localStorage.getItem(`qc-preview-${chat.id}`);
          if (cached) { requestAnimationFrame(() => setDecryptedPreview(cached)); return; }
        } catch {}
      }
      requestAnimationFrame(() => setDecryptedPreview("New message"));
      return;
    }
    // If it's actual encrypted ciphertext, decrypt it
    if (isEncryptedMessage(chat.lastMessage)) {
      let cancelled = false;
      // Look up epoch nonce for the message's epoch
      const msgEpoch = chat.lastMessageEpoch;
      const epochNonce = msgEpoch !== undefined
        ? (chat.epochNonces?.[msgEpoch] ?? (msgEpoch === chat.epochCounter ? chat.epochNonce : undefined))
        : chat.epochNonce;
      decryptMessage(chat.lastMessage, chat.participants, chat.id, chat.lastMessageBy, chat.isGroup || chat.isGlobal, epochNonce, msgEpoch ?? chat.epochCounter).then((text) => {
        if (!cancelled) {
          if (text === "Old encrypted message") {
            const senderName = chat.lastMessageBy && chat.participantNames[chat.lastMessageBy];
            setDecryptedPreview(senderName ? `${senderName} sent a message` : "New message");
          } else {
            const preview = text.length > 50 ? text.slice(0, 50) + "…" : text;
            setDecryptedPreview(preview);
          }
        }
      }).catch(() => {
        if (!cancelled) setDecryptedPreview("New message");
      });
      return () => { cancelled = true; };
    }
    // Plain system message
    requestAnimationFrame(() => setDecryptedPreview(chat.lastMessage));
  }, [chat.lastMessage, chat.lastMessageBy, chat.id, chat.participants, isLastMsgByMe, chat.epochCounter, chat.epochNonce, chat.epochNonces, chat.isGlobal, chat.isGroup, chat.lastMessageEpoch, chat.participantNames]);

  const previewText = decryptedPreview ?? "New message";

  return (
    <button
      onClick={() => onNavigate(chat.id)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left"
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12">
          {chat.isGlobal ? (
            <AvatarImage src="/png/qc-global-logo.png" alt="QC Global" />
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
            {isLastMsgByMe && chat.lastMessageBy !== "system" && (
              <span className="text-foreground/50">You: </span>
            )}
            {previewText.startsWith("📊") ? (
              <>
                <Icon icon="mdi:poll" className="w-3.5 h-3.5 shrink-0 inline-block align-text-bottom" />
                <span>{" "}{previewText.slice(2)}</span>
              </>
            ) : previewText.startsWith("🎤") ? (
              <>
                <Icon icon="material-symbols:mic" className="w-3.5 h-3.5 shrink-0 inline-block align-text-bottom" />
                <span>{" "}{previewText.slice(2)}</span>
              </>
            ) : previewText.startsWith("📞") ? (
              <>
                <Icon icon="solar:phone-bold" className="w-3.5 h-3.5 shrink-0 inline-block align-text-bottom" />
                <span>{" "}{previewText.slice(2)}</span>
              </>
            ) : previewText}
          </p>
        </div>
      </div>
    </button>
  );
}

type FormMode = "none" | "dm" | "group" | "join";

export default function QCChatListPage() {
  const router = useRouter();
  const { telegramId, qcUsername, setQcUsername, walletAddress } = useUserContext();
  const authCtx = useAuth();
  useTelegramBackButton("/home");
  const currentUser = authCtx?.currentUser ?? null;
  const isAuthenticated = !!currentUser;
  const { data: conversations = [], isLoading: isConversationsLoading } = useChatConversations(telegramId, isAuthenticated);
  const { data: globalChat = null } = useGlobalChat(telegramId, isAuthenticated);
  const [searchQuery, setSearchQuery] = useQueryState("q", parseAsString.withDefault("").withOptions({ history: "replace" }));
  const [formMode, setFormMode] = useState<FormMode>("none");
  const isLoading = isAuthenticated && isConversationsLoading;

  // DM form
  const dmForm = useForm({
    defaultValues: { username: "" },
    validators: { onSubmit: chatDmSchema },
  });
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Group form
  const groupForm = useForm({
    defaultValues: { name: "" },
    validators: { onSubmit: chatGroupSchema },
  });

  // Join group form
  const joinForm = useForm({
    defaultValues: { code: "" },
    validators: { onSubmit: chatJoinSchema },
  });

  // Username creation state (for users without a QC username)
  const usernameForm = useForm({
    defaultValues: { username: "" },
    validators: { onSubmit: z.object({ username: usernameSchema }) },
  });
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isRegisteringUsername, setIsRegisteringUsername] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<"available" | "taken" | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const checkUsernameAvailability = async () => {
    const val = usernameForm.getFieldValue("username").trim();
    const result = usernameSchema.safeParse(val);
    if (!result.success) {
      setUsernameError(result.error.issues[0]?.message ?? "Invalid username");
      return;
    }
    setIsCheckingUsername(true);
    setUsernameAvailability(null);
    setUsernameError(null);
    try {
      const result = await resolveQcUsername({ username: val });
      const isAvailable = !result?.data?.resolved;
      setUsernameAvailability(isAvailable ? "available" : "taken");
    } catch {
      setUsernameError("Failed to check availability");
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleRegisterUsername = async () => {
    const val = usernameForm.getFieldValue("username").trim();
    if (!val || !telegramId || usernameAvailability !== "available") return;
    setIsRegisteringUsername(true);
    try {
      const result = await registerQcUsername({ username: val, address: walletAddress || undefined });
      if (result?.data?.success) {
        setQcUsername(val);
        localStorage.setItem(`qcUsername_${telegramId}`, val);
        usernameForm.reset();
        setUsernameAvailability(null);
      } else {
        setUsernameError(result?.serverError || "Failed to register username");
      }
    } catch {
      setUsernameError("Failed to register username");
    } finally {
      setIsRegisteringUsername(false);
    }
  };

  // Handle deep links: startapp=join_JOINCODE or startapp=chat_CHATID
  const deepLinkHandledRef = useRef(false);
  useEffect(() => {
    if (!currentUser || !telegramId || !qcUsername || deepLinkHandledRef.current) return;
    try {
      const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
      if (!startParam) return;

      // Handle chat deep link: navigate directly to chat
      if (startParam.startsWith("chat_")) {
        deepLinkHandledRef.current = true;
        const targetChatId = startParam.replace("chat_", "");
        if (targetChatId) {
          router.push(`/ecosystem/chat/${targetChatId}`);
        }
        return;
      }

      if (!startParam.startsWith("join_")) return;
      const code = startParam.replace("join_", "").toUpperCase();
      if (!code) return;
      deepLinkHandledRef.current = true;

      // Auto-join: directly execute the join logic
      (async () => {
        setIsStartingChat(true);
        try {
          // Check if already in the group
          const localMatch = conversations.find(
            (c) => c.joinCode?.toUpperCase() === code
          );
          if (localMatch) {
            router.push(`/ecosystem/chat/${localMatch.id}`);
            return;
          }

          const chatsRef = collection(dbfs, "qc-chats");
          const { getDocs, query: fsQuery } = await import("firebase/firestore");
          const q = fsQuery(chatsRef, where("joinCode", "==", code));
          const snap = await getDocs(q);

          if (snap.empty) return;

          const groupDoc = snap.docs[0];
          const groupData = groupDoc.data();

          // Check if user is banned
          if (groupData.bannedUsers?.includes(telegramId)) {
            setFormError("You are banned from this group.");
            setFormMode("join");
            return;
          }

          if (groupData.participants?.includes(telegramId)) {
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

          router.push(`/ecosystem/chat/${groupDoc.id}`);
        } catch (err) {
          console.error("Deep link auto-join failed:", err);
          // Fallback: show join form with pre-filled code
          joinForm.setFieldValue("code", code);
          setFormMode("join");
        } finally {
          setIsStartingChat(false);
        }
      })();
    } catch {}
  }, [currentUser, telegramId, qcUsername, conversations, router, joinForm]);

  // Sync wallet address to QC username if missing
  useEffect(() => {
    if (!qcUsername || !walletAddress || !telegramId) return;
    const syncKey = `qcAddr_synced_${telegramId}`;
    if (sessionStorage.getItem(syncKey)) return; // Only once per session
    sessionStorage.setItem(syncKey, "1");
    updateQcUsernameAddress({ address: walletAddress }).catch(() => {});
  }, [qcUsername, walletAddress, telegramId]);

  // Ensure global chat exists and user is a participant
  useEffect(() => {
    if (!currentUser || !telegramId || !qcUsername) return;

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
  }, [currentUser, telegramId, qcUsername]);

  // Get display name for a chat
  const getChatDisplayName = (chat: ChatConversation): string => {
    if (chat.isGlobal) return "QC Global";
    if (chat.isGroup && chat.groupName) return chat.groupName;
    if (chat.participants.length === 1 && chat.participants[0] === telegramId) {
      return "Saved Messages (You)";
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

  // Virtualizer for conversation list
  const conversationListRef = useRef<HTMLDivElement>(null);
  const conversationsVirtualizer = useWindowVirtualizer({
    count: filteredConversations.length,
    estimateSize: () => 72,
    overscan: 5,
    scrollMargin: conversationListRef.current?.offsetTop ?? 0,
  });

  // Prefetch chat routes for visible conversations
  useEffect(() => {
    filteredConversations.slice(0, 10).forEach((chat) => {
      router.prefetch(`/ecosystem/chat/${chat.id}`);
    });
    if (globalChat) router.prefetch(`/ecosystem/chat/${GLOBAL_CHAT_ID}`);
  }, [filteredConversations, globalChat, router]);

  // Show global chat in search results too
  const showGlobalChat =
    globalChat &&
    (!searchQuery.trim() ||
      "qc global".includes(searchQuery.toLowerCase()));

  const toggleForm = (mode: FormMode) => {
    setFormMode((prev) => (prev === mode ? "none" : mode));
    setFormError(null);
    dmForm.reset();
    groupForm.reset();
    joinForm.reset();
  };

  // Start DM
  const handleStartChat = async () => {
    const rawUsername = dmForm.getFieldValue("username").trim();
    const parsed = chatDmSchema.safeParse({ username: rawUsername });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0].message);
      return;
    }
    const normalizedUsername = rawUsername.replace(/^@+/, "").toLowerCase();

    if (!telegramId) {
      setFormError("Please sign in to start a chat.");
      return;
    }

    setIsStartingChat(true);
    setFormError(null);

    try {
      const resolveResult = await resolveQcUsername({ username: normalizedUsername });

      if (!resolveResult?.data?.resolved || !resolveResult?.data?.owner) {
        setFormError("Username not found.");
        return;
      }

      const otherUserId = String(resolveResult.data.owner);
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
        dmForm.reset();
        router.push(`/ecosystem/chat/${existingChat.id}`);
        return;
      }

      let otherDisplayName = normalizedUsername;
      if (!isSelfChat) {
        try {
          const result = await resolveQcUsername({ qcId: otherUserId });
          if (result?.data?.username && typeof result.data.username === "string") {
            otherDisplayName = result.data.username.replace(/^@+/, "").trim() || otherDisplayName;
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
      dmForm.reset();
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
    const name = groupForm.getFieldValue("name").trim();
    const parsed = chatGroupSchema.safeParse({ name });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0].message);
      return;
    }
    if (!telegramId) {
      setFormError("Please sign in.");
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
      groupForm.reset();
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
    const code = joinForm.getFieldValue("code").trim().toUpperCase();
    const parsed = chatJoinSchema.safeParse({ code });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0].message);
      return;
    }
    if (!telegramId) {
      setFormError("Please sign in.");
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
        joinForm.reset();
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

      // Check if user is banned
      if (groupData.bannedUsers?.includes(telegramId)) {
        setFormError("You are banned from this group.");
        return;
      }

      if (groupData.participants?.includes(telegramId)) {
        setFormMode("none");
        joinForm.reset();
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
      joinForm.reset();
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
              <Image src="/png/qc-chat-logo.png" alt="QC Chat" width={24} height={24} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold leading-tight">QC Chat</h1>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-semibold rounded-md">
                  Beta
                </Badge>
              </div>
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
            disabled={!telegramId || !qcUsername}
            className="w-9 h-9 rounded-full"
            aria-label="New conversation"
          >
            <Icon icon={formMode === "none" ? "lucide:plus" : "lucide:x"} className="w-4 h-4" />
          </Button>
        </div>

        {/* Username creation prompt */}
        {telegramId && !qcUsername && (
          <div className="mb-3 p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon icon="solar:user-id-bold" className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Create your username</p>
                <p className="text-[10px] text-muted-foreground">You need a QC username to use QC Chat</p>
              </div>
            </div>
            <usernameForm.Field name="username">
              {(field) => {
                const hasErrors = field.state.meta.errors.length > 0;
                return (
                  <>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                        <Input
                          value={field.state.value}
                          onChange={(e) => {
                            const filtered = e.target.value.replace(/^@+/, "").replace(/\s/g, "");
                            field.handleChange(filtered);
                            setUsernameAvailability(null);
                            setUsernameError(null);
                          }}
                          onBlur={field.handleBlur}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (usernameAvailability === "available") handleRegisterUsername();
                              else checkUsernameAvailability();
                            }
                          }}
                          placeholder="username"
                          className={`h-9 pl-8 rounded-lg bg-background/70 border-border/60 text-sm font-mono ${hasErrors ? "border-destructive" : ""}`}
                          disabled={isRegisteringUsername}
                          maxLength={USERNAME_MAX_LENGTH}
                        />
                      </div>
                      {usernameAvailability === "available" ? (
                        <Button
                          onClick={handleRegisterUsername}
                          disabled={isRegisteringUsername}
                          size="sm"
                          className="h-9 px-4 rounded-lg"
                        >
                          {isRegisteringUsername ? (
                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          ) : "Claim"}
                        </Button>
                      ) : (
                        <Button
                          onClick={checkUsernameAvailability}
                          disabled={isCheckingUsername || !field.state.value.trim()}
                          size="sm"
                          variant="secondary"
                          className="h-9 px-4 rounded-lg"
                        >
                          {isCheckingUsername ? (
                            <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                          ) : "Check"}
                        </Button>
                      )}
                    </div>
                    {hasErrors && (
                      <FieldError errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} className="text-[10px]" />
                    )}
                    {usernameAvailability === "available" && (
                      <p className="text-[10px] text-green-400 flex items-center gap-1">
                        <Icon icon="solar:check-circle-bold" className="w-3 h-3" />
                        @{field.state.value} is available!
                      </p>
                    )}
                    {usernameAvailability === "taken" && (
                      <p className="text-[10px] text-red-400 flex items-center gap-1">
                        <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                        @{field.state.value} is already taken
                      </p>
                    )}
                    {usernameError && (
                      <p className="text-[10px] text-red-400 flex items-center gap-1">
                        <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                        {usernameError}
                      </p>
                    )}
                  </>
                );
              }}
            </usernameForm.Field>
          </div>
        )}

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
                <dmForm.Field name="username">
                  {(field) => (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                        <Input
                          value={field.state.value}
                          onChange={(e) => {
                            field.handleChange(e.target.value.replace(/^@+/, ""));
                            setFormError(null);
                          }}
                          onBlur={field.handleBlur}
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
                        disabled={isStartingChat || !field.state.value.trim()}
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
                  )}
                </dmForm.Field>
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
                <groupForm.Field name="name">
                  {(field) => (
                    <div className="flex gap-2">
                      <Input
                        value={field.state.value}
                        onChange={(e) => {
                          field.handleChange(e.target.value);
                          setFormError(null);
                        }}
                        onBlur={field.handleBlur}
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
                        disabled={isStartingChat || !field.state.value.trim()}
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
                  )}
                </groupForm.Field>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Create a group and share the join code with others to invite them.
                </p>
              </>
            )}

            {/* Join Group Form */}
            {formMode === "join" && (
              <>
                <joinForm.Field name="code">
                  {(field) => (
                    <div className="flex gap-2">
                      <Input
                        value={field.state.value}
                        onChange={(e) => {
                          field.handleChange(e.target.value.toUpperCase());
                          setFormError(null);
                        }}
                        onBlur={field.handleBlur}
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
                        disabled={isStartingChat || !field.state.value.trim()}
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
                  )}
                </joinForm.Field>
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
              <Image src="/png/qc-chat-logo.png" alt="QC Chat" width={40} height={40} />
            </div>
            <p className="text-sm font-medium text-foreground">Sign in to chat</p>
            <p className="text-xs text-muted-foreground">
              Log in with your Telegram account to start chatting.
            </p>
          </div>
        ) : (
          <div>
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
                  <Image src="/png/qc-chat-logo.png" alt="QC Chat" width={40} height={40} />
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
              <div ref={conversationListRef}>
                <div className="relative" style={{ height: `${conversationsVirtualizer.getTotalSize()}px` }}>
                  {conversationsVirtualizer.getVirtualItems().map((virtualItem) => {
                    const chat = filteredConversations[virtualItem.index];
                    return (
                      <div
                        key={chat.id}
                        className="absolute top-0 left-0 w-full"
                        style={{ transform: `translateY(${virtualItem.start - conversationsVirtualizer.options.scrollMargin}px)` }}
                        ref={conversationsVirtualizer.measureElement}
                        data-index={virtualItem.index}
                      >
                        <ChatListItem
                          chat={chat}
                          telegramId={telegramId || ""}
                          onNavigate={(chatId) => router.push(`/ecosystem/chat/${chatId}`)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
