"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { parseAsString, parseAsInteger, useQueryState } from "nuqs";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDrag } from "@use-gesture/react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useProfilePhoto } from "@/app/(hooks)/useProfilePhoto";
import { usePresenceActions, useUserPresence, useMultiplePresence, formatLastSeen } from "@/app/(hooks)/usePresence";
import { dbfs } from "@/app/(firebase)/client";
import {
  encryptMessage,
  decryptMessage,
  isEncryptedMessage,
  encryptBlob,
  generateEpochNonce,
} from "@/lib/chat-crypto";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  query,
  orderBy,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  deleteField,
  increment,
  Timestamp,
  arrayUnion,
  arrayRemove,
  limitToLast,
  limit,
  startAfter,
  runTransaction,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/app/(firebase)/client";
import ChatThemePicker from "./ChatThemePicker";
import { sendChatNotification } from "../actions";
import PollCreator from "./PollCreator";
import PollMessage from "./PollMessage";
import VoiceRecorder from "./VoiceRecorder";
import VoiceMessage from "./VoiceMessage";
import FileMessage from "./FileMessage";
import GroupMembersPanel from "./GroupMembersPanel";
import TransferMessage from "./TransferMessage";
import NftShareMessage from "./NftShareMessage";
import CallMessage from "./CallMessage";
import GroupCallBanner from "@/app/(components)/GroupCallBanner";
import { useCallContext } from "@/app/(contexts)/CallContext";
import TransferDrawer from "./TransferDrawer";
import { useWallet } from "@/app/wallet/WalletContext";
import { useQcUsernamesBatch, useQcUsernameQuery } from "@/app/(hooks)/queries/use-qc-username";
import { isQcTeamMember } from "@/lib/qc-team";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  text: string;
  senderName: string;
  senderId: string;
  createdAt: Timestamp | null;
  encrypted?: boolean;
  encEpoch?: number;
  reactions?: Record<string, string[]>;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  forwarded?: {
    from: string;
    originalChatId: string;
  };
  expiresAt?: Timestamp | number;
  type?: "text" | "poll" | "voice" | "transfer" | "file" | "nft_share" | "call";
  poll?: {
    question: string;
    options: string[];
    votes: Record<string, string[]>;
    createdBy: string;
    encData?: string;
  };
  voice?: {
    url: string;
    durationSec: number;
    encrypted?: boolean;
  };
  file?: {
    url: string;
    name: string;
    encName?: string;
    size: number;
    mimeType: string;
    encrypted?: boolean;
    width?: number;
    height?: number;
  };
  transfer?: {
    amount: string;
    senderAddress?: string;
    recipientAddress?: string;
    txHash?: string;
    status: "sent" | "failed";
    encData?: string;
  };
  nftShare?: {
    nftAddress: string;
    nftName: string;
    nftImage?: string;
    nftPrice?: string;
    collectionName?: string;
  };
  call?: {
    callId: string;
    status: "ringing" | "connected" | "ended" | "declined" | "missed" | "busy";
    duration: number;
    callerId: string;
    calleeId: string;
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
  pinnedMessage?: { id: string; senderName: string };
  disappearAfter?: number;
  bannedUsers?: string[];
  mutedUsers?: string[];
  epochNonce?: string;
  epochCounter?: number;
  epochNonces?: Record<number, string>;
}

const TYPING_TIMEOUT_MS = 3000;

const REACTION_EMOJIS = [
  { key: "thumbs-up", icon: "twemoji:thumbs-up" },
  { key: "red-heart", icon: "twemoji:red-heart" },
  { key: "face-with-tears-of-joy", icon: "twemoji:face-with-tears-of-joy" },
  { key: "hushed-face", icon: "twemoji:hushed-face" },
  { key: "crying-face", icon: "twemoji:crying-face" },
  { key: "folded-hands", icon: "twemoji:folded-hands" },
] as const;

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

export default function ChatConversationClient() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;
  const { telegramId, qcUsername } = useUserContext();
  const authCtx = useAuth();
  const currentUser = authCtx?.currentUser ?? null;
  const { initiateCall, callState, joinGroupCall, groupCallState } = useCallContext();

  useTelegramBackButton("/ecosystem/chat");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatMeta, setChatMeta] = useState<ChatMeta | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Pagination state
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Reaction picker state
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ y: number; centerX: number; showAbove: boolean } | null>(null);
  const justOpenedMenuRef = useRef(false);
  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useQueryState("search", parseAsString.withDefault("").withOptions({ history: "replace" }));
  const [searchMatchIndex, setSearchMatchIndex] = useQueryState("match", parseAsInteger.withDefault(-1).withOptions({ history: "replace" }));

  // Forward state
  const [forwardMsgId, setForwardMsgId] = useState<string | null>(null);
  const [forwardChats, setForwardChats] = useState<any[]>([]);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);

  // Disappearing messages timer popover
  const [timerPopoverOpen, setTimerPopoverOpen] = useState(false);

  // Chat theme/wallpaper
  const [chatTheme, setChatTheme] = useState("");
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);

  // Transfer state
  const [showTransferDrawer, setShowTransferDrawer] = useState(false);
  const [recipientWalletAddress, setRecipientWalletAddress] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const { walletAddress, isTestnet } = useWallet();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);
  const initialLoadDoneRef = useRef(false);
  const staleClearedRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const participantsRef = useRef<string[]>([]);
  const isGroupRef = useRef(false);
  const epochRef = useRef<{ nonce?: string; counter?: number; nonces?: Record<number, string> }>({});

  // Long-press & double-tap refs for reactions
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Ref for scrollToMessage to avoid stale closures
  const messagesArrayRef = useRef(messages);
  messagesArrayRef.current = messages;

  // Virtualizer for message list (container-scroll)
  const messagesVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => chatContainerRef.current,
    estimateSize: () => 60,
    overscan: 10,
    getItemKey: (index) => messages[index]?.id ?? String(index),
  });

  // Cleanup long-press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  // Open the reaction picker for a given message (long-press action)
  const openReactionPicker = useCallback((msgId: string) => {
    justOpenedMenuRef.current = true;
    setReactionPickerMsgId(msgId);
    const el = messageRefs.current[msgId];
    if (el) {
      const bubble = (el.querySelector("[data-bubble]") || el) as HTMLElement;
      const rect = bubble.getBoundingClientRect();
      const viewH = window.innerHeight;
      const showAbove = rect.bottom > viewH * 0.55;
      setMenuAnchor({
        y: showAbove ? rect.top : rect.bottom + 8,
        centerX: Math.max(120, Math.min((rect.left + rect.right) / 2, window.innerWidth - 120)),
        showAbove,
      });
    }
  }, []);

  // Gesture handler for message bubbles: swipe-right-to-reply + long-press-to-react
  // bind(msg) in JSX — msg is forwarded via args[0]
  const bindMessageGesture = useDrag(
    ({ first, last, movement: [mx, my], event, args, cancel, memo }) => {
      const msg = args[0] as ChatMessage;

      // --- Start of gesture: kick off long-press timer ---
      if (first) {
        longPressTimerRef.current = setTimeout(() => {
          openReactionPicker(msg.id);
          longPressTimerRef.current = null;
          cancel(); // stop drag processing after long-press fires
        }, 500);
        return { longPressFired: false };
      }

      // --- During gesture: cancel long-press if finger moves > 10px ---
      if (longPressTimerRef.current) {
        if (Math.abs(mx) > 10 || Math.abs(my) > 10) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      // --- End of gesture ---
      if (last) {
        // Clear any pending long-press timer
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }

        // If the reaction menu was just opened by long-press, suppress the
        // synthetic click/touchend that would immediately dismiss it
        if (justOpenedMenuRef.current) {
          justOpenedMenuRef.current = false;
          event?.preventDefault();
          return memo;
        }

        // Swipe-to-reply: rightward swipe > 60px with < 40px vertical drift
        if (mx > 60 && Math.abs(my) < 40) {
          setReplyTo(msg);
          inputRef.current?.focus();
        }
      }

      return memo;
    },
    {
      // Only track the x-axis for filtering, but keep both axes for long-press cancellation
      filterTaps: true,
      // Pointer events are the default; touch-action handled via CSS below
    },
  );

  // Reply state
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  const otherParticipantId = chatMeta?.participants.find((p) => p !== telegramId) ?? null;
  const myPhoto = useProfilePhoto(telegramId);
  const otherPhoto = useProfilePhoto(otherParticipantId);

  // Presence: track which chat we're viewing (heartbeat managed by layout)
  const { setCurrentChat } = usePresenceActions(telegramId);
  const otherPresence = useUserPresence(
    !chatMeta?.isGroup && !chatMeta?.isGlobal ? otherParticipantId : null
  );
  // Group presence: track online count for non-global group chats (skip for large global chats)
  const groupParticipantIds = (!chatMeta?.isGroup || chatMeta?.isGlobal)
    ? []
    : (chatMeta?.participants || []).filter((p) => p !== telegramId);
  const groupPresenceMap = useMultiplePresence(groupParticipantIds);

  // Prefetch navigation targets for clickable header names
  useEffect(() => {
    if (chatId) router.prefetch(`/ecosystem/chat/${chatId}/info`);
    if (otherParticipantId) router.prefetch(`/user/${otherParticipantId}`);
  }, [router, chatId, otherParticipantId]);

  // Load chat theme from localStorage
  useEffect(() => {
    if (!chatId) return;
    const saved = localStorage.getItem(`chatTheme_${chatId}`);
    if (saved) requestAnimationFrame(() => setChatTheme(saved));
  }, [chatId]);

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
  function handleScroll() {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 80;
    isAtBottomRef.current = atBottom;
    setShowScrollDown(!atBottom);
  }

  function scrollToBottom(force = false) {
    if (force || isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: force ? "auto" : "smooth" });
    }
  }

  // Subscribe to chat metadata (real-time for typing + readPositions)
  useEffect(() => {
    if (!currentUser || !chatId) return;
    const chatRef = doc(dbfs, "qc-chats", chatId);
    const unsub = onSnapshot(chatRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const participants = data.participants || [];
        participantsRef.current = participants;
        isGroupRef.current = data.isGroup || data.isGlobal || false;
        epochRef.current = {
          nonce: data.epochNonce,
          counter: data.epochCounter,
          nonces: data.epochNonces,
        };
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
          pinnedMessage: data.pinnedMessage || undefined,
          disappearAfter: data.disappearAfter || 0,
          bannedUsers: data.bannedUsers || [],
          mutedUsers: data.mutedUsers || [],
          epochNonce: data.epochNonce,
          epochCounter: data.epochCounter,
          epochNonces: data.epochNonces,
        });
      } else if (!snap.metadata.fromCache) {
        // Document confirmed missing from server — stop loading
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Chat meta listener error:", error);
      setIsLoading(false);
    });
    return () => unsub();
  }, [currentUser, chatId]);

  // Resolve "Unknown" or missing participant names via batch query
  const unknownUids = !chatMeta
    ? []
    : [
        // Participants whose name is stored as "Unknown"
        ...Object.entries(chatMeta.participantNames)
          .filter(([, name]) => name === "Unknown")
          .map(([uid]) => uid),
        // Participants missing from participantNames entirely
        ...chatMeta.participants.filter(
          (p) => p !== telegramId && !chatMeta.participantNames[p]
        ),
      ];

  const batchUsernamesQuery = useQcUsernamesBatch(unknownUids);

  // Apply resolved names to local state and persist to Firestore
  const appliedBatchRef = useRef<string | null>(null);
  useEffect(() => {
    if (!batchUsernamesQuery.data || !chatId) return;
    const updates = batchUsernamesQuery.data;
    if (Object.keys(updates).length === 0) return;

    // Deduplicate: only apply once per unique result set
    const key = JSON.stringify(updates);
    if (appliedBatchRef.current === key) return;
    appliedBatchRef.current = key;

    setChatMeta((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        participantNames: { ...prev.participantNames, ...updates },
      };
    });

    // Persist resolved names to Firestore
    const chatRef = doc(dbfs, "qc-chats", chatId);
    const firestoreUpdates: Record<string, string> = {};
    for (const [uid, name] of Object.entries(updates)) {
      firestoreUpdates[`participantNames.${uid}`] = name;
    }
    updateDoc(chatRef, firestoreUpdates).catch(() => {});
  }, [batchUsernamesQuery.data, chatId]);

  // Auto-initialize epoch if this chat doesn't have one (required for v6 encryption)
  const ensureEpochRef = useRef<Promise<{ nonce: string; counter: number }> | null>(null);

  async function ensureEpoch(): Promise<{ nonce: string; counter: number }> {
    if (chatMeta?.epochNonce && chatMeta.epochCounter !== undefined) {
      return { nonce: chatMeta.epochNonce, counter: chatMeta.epochCounter };
    }
    // Deduplicate concurrent calls
    if (ensureEpochRef.current) return ensureEpochRef.current;
    const promise = (async () => {
      const chatRef = doc(dbfs, "qc-chats", chatId);
      // Use a transaction to prevent race conditions where multiple users
      // could overwrite each other's epoch nonce
      return await runTransaction(dbfs, async (txn) => {
        const snap = await txn.get(chatRef);
        const data = snap.data();
        if (data?.epochNonce && data?.epochCounter !== undefined) {
          return { nonce: data.epochNonce as string, counter: data.epochCounter as number };
        }
        const nonce = generateEpochNonce();
        txn.update(chatRef, {
          epochNonce: nonce,
          epochCounter: 0,
          [`epochNonces.0`]: nonce,
        });
        return { nonce, counter: 0 };
      });
    })();
    ensureEpochRef.current = promise;
    try { return await promise; } finally { ensureEpochRef.current = null; }
  }

  useEffect(() => {
    if (!chatMeta || !chatId || !currentUser) return;
    if (chatMeta.epochNonce && chatMeta.epochCounter !== undefined) return;
    ensureEpoch().catch((err) => console.error("Failed to init epoch:", err));
  }, [chatMeta, chatId, currentUser]);

  // Resolve recipient's wallet address for DM transfers via TanStack Query
  const recipientId = (!chatMeta || chatMeta.isGroup || chatMeta.isGlobal || !telegramId)
    ? null
    : chatMeta.participants.find((p) => p !== telegramId) ?? null;

  const recipientUsernameQuery = useQcUsernameQuery(recipientId);

  useEffect(() => {
    if (recipientUsernameQuery.data?.address) {
      requestAnimationFrame(() => {
        setRecipientWalletAddress(recipientUsernameQuery.data.address);
      });
    }
  }, [recipientUsernameQuery.data]);

  // Subscribe to messages and decrypt them
  const isGroupChat = chatMeta?.isGroup || chatMeta?.isGlobal;
  // Track whether we've set up the messages subscription (only needs chatId + auth)
  const [messagesReady, setMessagesReady] = useState(false);

  // Wait for chatMeta AND epoch data before subscribing to messages.
  // Epoch is required for decryption — without it messages show as "sent a message".
  // If epoch is missing, ensureEpoch auto-init will create it, triggering a chatMeta
  // update that re-evaluates this effect.
  const epochReady = !!(chatMeta?.epochNonce && chatMeta?.epochCounter !== undefined);
  useEffect(() => {
    if (chatMeta && epochReady && !messagesReady) {
      requestAnimationFrame(() => setMessagesReady(true));
    }
  }, [chatMeta, epochReady, messagesReady]);

  useEffect(() => {
    if (!currentUser || !chatId || !messagesReady) return;

    const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limitToLast(50));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Use participantsRef for latest participants (avoids stale closure)
      const participants = [...participantsRef.current];
      // If participants haven't loaded yet, skip decryption to avoid false "sent a message" failures
      if (participants.length === 0) {
        setIsLoading(false);
        return;
      }
      try {

      const rawMsgs: {
        id: string;
        rawText: string;
        senderName: string;
        senderId: string;
        createdAt: Timestamp | null;
        encrypted: boolean;
        encEpoch?: number;
        reactions?: Record<string, string[]>;
        replyTo?: { id: string; text: string; senderName: string };
        forwarded?: { from: string; originalChatId: string };
        expiresAt?: Timestamp | number;
        type?: string;
        poll?: ChatMessage["poll"];
        voice?: ChatMessage["voice"];
        transfer?: ChatMessage["transfer"];
        file?: ChatMessage["file"];
        call?: ChatMessage["call"];
        nftShare?: ChatMessage["nftShare"];
      }[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Skip messages hidden by this user ("delete for me")
        if (telegramId && data.hiddenBy?.[telegramId]) return;
        rawMsgs.push({
          id: docSnap.id,
          rawText: data.text || "",
          senderName: data.senderName || "Unknown",
          senderId: data.senderId || "",
          createdAt: data.createdAt,
          encrypted: data.encrypted === true,
          encEpoch: data.encEpoch,
          reactions: data.reactions || undefined,
          replyTo: data.replyTo || undefined,
          forwarded: data.forwarded || undefined,
          expiresAt: data.expiresAt || undefined,
          type: data.type || undefined,
          poll: data.poll || undefined,
          voice: data.voice || undefined,
          transfer: data.transfer || undefined,
          file: data.file || undefined,
          call: data.call || undefined,
          nftShare: data.nftShare || undefined,
        });
      });

      // Snapshot epoch state once per listener invocation to avoid race conditions
      // during parallel decryption (epochRef.current could change mid-batch)
      const epochSnapshot = { ...epochRef.current };

      // Helper to look up epoch nonce for a message
      const getEpochNonce = (epoch?: number) => {
        // Default to epoch 0 for messages that pre-date the encEpoch field
        const resolvedEpoch = epoch ?? 0;
        return epochSnapshot.nonces?.[resolvedEpoch] ?? (resolvedEpoch === epochSnapshot.counter ? epochSnapshot.nonce : undefined);
      };

      // Build a map of all available epochs once for fallback decryption
      const allEpochs = new Map<number, string>();
      if (epochSnapshot.nonces) for (const [k, v] of Object.entries(epochSnapshot.nonces)) allEpochs.set(Number(k), v);
      if (epochSnapshot.nonce !== undefined && epochSnapshot.counter !== undefined) allEpochs.set(epochSnapshot.counter, epochSnapshot.nonce);

      // Try decrypting with a specific epoch, returns null on failure
      const tryDecrypt = async (raw: string, senderId: string, nonce: string, counter: number) => {
        try {
          const result = await decryptMessage(raw, participants, chatId, senderId, isGroupRef.current, nonce, counter);
          return result !== "Old encrypted message" ? result : null;
        } catch { return null; }
      };

      const decryptedMsgs = await Promise.all(
        rawMsgs.map(async (msg) => {
          let text = msg.rawText;
          const msgEpochNonce = getEpochNonce(msg.encEpoch);
          const msgEpochCounter = msg.encEpoch ?? 0;
          if (msg.encrypted && isEncryptedMessage(msg.rawText)) {
            // Primary attempt with resolved epoch
            if (msgEpochNonce) {
              const result = await tryDecrypt(msg.rawText, msg.senderId, msgEpochNonce, msgEpochCounter);
              if (result) { text = result; }
              else { text = "[Decryption failed]"; }
            } else {
              // Epoch nonce not found — try all available epochs as fallback
              let decrypted = false;
              for (const [counter, nonce] of allEpochs) {
                const result = await tryDecrypt(msg.rawText, msg.senderId, nonce, counter);
                if (result) { text = result; decrypted = true; break; }
              }
              if (!decrypted) text = "[Decryption failed]";
            }
          }
          // Decrypt reply preview if present
          let replyData = msg.replyTo;
          if (replyData?.text && isEncryptedMessage(replyData.text)) {
            try {
              const decryptedReply = await decryptMessage(replyData.text, participants, chatId, msg.senderId, isGroupRef.current, msgEpochNonce, msgEpochCounter);
              replyData = { ...replyData, text: decryptedReply };
            } catch {
              // Epoch fallback: try all available epochs
              let replyDecrypted = false;
              for (const [counter, nonce] of allEpochs) {
                const result = await tryDecrypt(replyData.text, msg.senderId, nonce, counter);
                if (result) { replyData = { ...replyData, text: result }; replyDecrypted = true; break; }
              }
              if (!replyDecrypted) replyData = { ...replyData, text: "[Encrypted message]" };
            }
          }
          // Decrypt poll content if encrypted
          let pollData = msg.poll;
          if (msg.type === "poll" && pollData?.encData) {
            try {
              const decryptedPoll = await decryptMessage(pollData.encData, participants, chatId, msg.senderId, isGroupRef.current, msgEpochNonce, msgEpochCounter);
              const parsed = JSON.parse(decryptedPoll);
              pollData = { ...pollData, question: parsed.question, options: parsed.options };
            } catch {
              pollData = { ...pollData, question: "Encrypted poll", options: [] };
            }
          }

          // Decrypt transfer content if encrypted
          let transferData = msg.transfer;
          if (msg.type === "transfer" && transferData?.encData) {
            try {
              const decryptedTransfer = await decryptMessage(transferData.encData, participants, chatId, msg.senderId, isGroupRef.current, msgEpochNonce, msgEpochCounter);
              const parsed = JSON.parse(decryptedTransfer);
              transferData = { ...transferData, ...parsed };
            } catch {
              transferData = { ...transferData, amount: "?", status: "sent" as const };
            }
          }

          // Decrypt file name if encrypted
          let fileData = msg.file;
          if (msg.type === "file" && fileData?.encName) {
            try {
              const decryptedName = await decryptMessage(fileData.encName, participants, chatId, msg.senderId, isGroupRef.current, msgEpochNonce, msgEpochCounter);
              fileData = { ...fileData, name: decryptedName };
            } catch {
              fileData = { ...fileData, name: "Encrypted file" };
            }
          }

          return {
            id: msg.id,
            text,
            senderName: msg.senderName,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
            encrypted: msg.encrypted,
            encEpoch: msg.encEpoch,
            reactions: msg.reactions,
            replyTo: replyData,
            forwarded: msg.forwarded,
            expiresAt: msg.expiresAt,
            type: msg.type as ChatMessage["type"],
            poll: pollData,
            voice: msg.voice,
            transfer: transferData,
            file: fileData,
            call: msg.call,
            nftShare: msg.nftShare,
          };
        })
      );

      // Messages were deleted — clear stale preview on chat doc + localStorage cache
      // (staleClearedRef prevents repeated writes; separate from initialLoadDoneRef
      // because Firestore persistent cache fires the snapshot with stale cached data
      // first, which sets initialLoadDoneRef before the server-empty snapshot arrives)
      if (decryptedMsgs.length === 0 && !staleClearedRef.current && !snapshot.metadata.fromCache) {
        staleClearedRef.current = true;
        updateDoc(doc(dbfs, "qc-chats", chatId), {
          lastMessage: "",
          lastMessageBy: "",
          lastMessageAt: deleteField(),
          lastMessageEpoch: deleteField(),
        }).catch(() => {});
        try { localStorage.removeItem(`qc-preview-${chatId}`); } catch {}
      }

      // Merge with any previously loaded older messages
      setMessages((prev) => {
        if (decryptedMsgs.length === 0) return []; // Clear stale paginated messages too
        if (prev.length === 0) return decryptedMsgs;
        // Keep any older messages that are not in the snapshot
        const olderMessages = prev.filter(
          (m) => !decryptedMsgs.some((dm) => dm.id === m.id) &&
            m.createdAt && decryptedMsgs[0]?.createdAt &&
            m.createdAt.toMillis() < decryptedMsgs[0].createdAt.toMillis()
        );
        return [...olderMessages, ...decryptedMsgs];
      });
      setIsLoading(false);

      // Only scroll to bottom when a NEW message arrives after initial load
      const newLastId = decryptedMsgs[decryptedMsgs.length - 1]?.id;
      if (!initialLoadDoneRef.current) {
        // First snapshot — just record the ID, don't scroll (isLoading effect handles it)
        lastMessageIdRef.current = newLastId || null;
        initialLoadDoneRef.current = true;
      } else if (newLastId && newLastId !== lastMessageIdRef.current) {
        lastMessageIdRef.current = newLastId;
        setTimeout(() => scrollToBottom(), 50);
      }

      // Update read position on new messages
      if (telegramId) {
        updateDoc(doc(dbfs, "qc-chats", chatId), {
          [`unreadCounts.${telegramId}`]: 0,
          [`readPositions.${telegramId}`]: serverTimestamp(),
        }).catch(() => {});
      }
      } catch (err) {
        console.error("Messages snapshot processing error:", err);
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Messages listener error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, chatId, messagesReady, telegramId, epochReady]);

  // Initial scroll — wait for DOM paint (isLoading transitions false only once)
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (!isLoading && !didInitialScrollRef.current) {
      didInitialScrollRef.current = true;
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      });
    }
  }, [isLoading]);

  // Load older messages when scrolling to top
  async function loadOlderMessages() {
    if (loadingOlder || !hasMoreMessages || !chatId || messages.length === 0) return;
    const oldestMsg = messages[0];
    if (!oldestMsg?.createdAt) return;

    setLoadingOlder(true);
    try {
      const participants = [...participantsRef.current];
      const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");
      const olderQuery = query(
        messagesRef,
        orderBy("createdAt", "desc"),
        startAfter(oldestMsg.createdAt),
        limit(50)
      );
      const snapshot = await getDocs(olderQuery);

      if (snapshot.size < 50) setHasMoreMessages(false);
      if (snapshot.empty) {
        setLoadingOlder(false);
        return;
      }

      const rawMsgs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          rawText: data.text || "",
          senderName: data.senderName || "Unknown",
          senderId: data.senderId || "",
          createdAt: data.createdAt,
          encrypted: data.encrypted === true,
          encEpoch: data.encEpoch as number | undefined,
          reactions: data.reactions || undefined,
          replyTo: data.replyTo || undefined,
          forwarded: data.forwarded || undefined,
          expiresAt: data.expiresAt || undefined,
          type: data.type || undefined,
          poll: data.poll || undefined,
          voice: data.voice || undefined,
          transfer: data.transfer || undefined,
          file: data.file || undefined,
          call: data.call || undefined,
          nftShare: data.nftShare || undefined,
        };
      });

      // Snapshot epoch state once to avoid race conditions during parallel decryption
      const epochSnapshotOlder = { ...epochRef.current };

      const getEpochNonceOlder = (epoch?: number) => {
        // Default to epoch 0 for messages that pre-date the encEpoch field
        const resolvedEpoch = epoch ?? 0;
        return epochSnapshotOlder.nonces?.[resolvedEpoch] ?? (resolvedEpoch === epochSnapshotOlder.counter ? epochSnapshotOlder.nonce : undefined);
      };

      // Build a map of all available epochs once for fallback decryption
      const allEpochsOlder = new Map<number, string>();
      if (epochSnapshotOlder.nonces) for (const [k, v] of Object.entries(epochSnapshotOlder.nonces)) allEpochsOlder.set(Number(k), v);
      if (epochSnapshotOlder.nonce !== undefined && epochSnapshotOlder.counter !== undefined) allEpochsOlder.set(epochSnapshotOlder.counter, epochSnapshotOlder.nonce);

      const tryDecryptOlder = async (raw: string, senderId: string, nonce: string, counter: number) => {
        try {
          const result = await decryptMessage(raw, participants, chatId, senderId, isGroupRef.current, nonce, counter);
          return result !== "Old encrypted message" ? result : null;
        } catch { return null; }
      };

      const olderDecrypted = await Promise.all(
        rawMsgs.map(async (msg) => {
          let text = msg.rawText;
          const msgEpochNonce = getEpochNonceOlder(msg.encEpoch);
          const msgEpochCounter = msg.encEpoch ?? 0;
          if (msg.encrypted && isEncryptedMessage(msg.rawText)) {
            if (msgEpochNonce) {
              const result = await tryDecryptOlder(msg.rawText, msg.senderId, msgEpochNonce, msgEpochCounter);
              if (result) { text = result; }
              else { text = "[Decryption failed]"; }
            } else {
              // Epoch nonce not found — try all available epochs as fallback
              let decrypted = false;
              for (const [counter, nonce] of allEpochsOlder) {
                const result = await tryDecryptOlder(msg.rawText, msg.senderId, nonce, counter);
                if (result) { text = result; decrypted = true; break; }
              }
              if (!decrypted) text = "[Decryption failed]";
            }
          }
          let replyData = msg.replyTo;
          if (replyData?.text && isEncryptedMessage(replyData.text)) {
            try {
              const decryptedReply = await decryptMessage(replyData.text, participants, chatId, msg.senderId, isGroupRef.current, msgEpochNonce, msgEpochCounter);
              replyData = { ...replyData, text: decryptedReply };
            } catch {
              // Epoch fallback: try all available epochs
              let replyDecrypted = false;
              for (const [counter, nonce] of allEpochsOlder) {
                const result = await tryDecryptOlder(replyData.text, msg.senderId, nonce, counter);
                if (result) { replyData = { ...replyData, text: result }; replyDecrypted = true; break; }
              }
              if (!replyDecrypted) replyData = { ...replyData, text: "[Encrypted message]" };
            }
          }
          // Decrypt poll content if encrypted
          let pollData = msg.poll;
          if (msg.type === "poll" && pollData?.encData) {
            try {
              const decryptedPoll = await decryptMessage(pollData.encData, participants, chatId, msg.senderId, isGroupRef.current, msgEpochNonce, msgEpochCounter);
              const parsed = JSON.parse(decryptedPoll);
              pollData = { ...pollData, question: parsed.question, options: parsed.options };
            } catch {
              pollData = { ...pollData, question: "Encrypted poll", options: [] };
            }
          }

          // Decrypt transfer content if encrypted
          let transferData = msg.transfer;
          if (msg.type === "transfer" && transferData?.encData) {
            try {
              const decryptedTransfer = await decryptMessage(transferData.encData, participants, chatId, msg.senderId, isGroupRef.current, msgEpochNonce, msgEpochCounter);
              const parsed = JSON.parse(decryptedTransfer);
              transferData = { ...transferData, ...parsed };
            } catch {
              transferData = { ...transferData, amount: "?", status: "sent" as const };
            }
          }

          // Decrypt file name if encrypted
          let fileData = msg.file;
          if (msg.type === "file" && fileData?.encName) {
            try {
              const decryptedName = await decryptMessage(fileData.encName, participants, chatId, msg.senderId, isGroupRef.current, msgEpochNonce, msgEpochCounter);
              fileData = { ...fileData, name: decryptedName };
            } catch {
              fileData = { ...fileData, name: "Encrypted file" };
            }
          }

          return {
            id: msg.id,
            text,
            senderName: msg.senderName,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
            encrypted: msg.encrypted,
            encEpoch: msg.encEpoch,
            reactions: msg.reactions,
            replyTo: replyData,
            forwarded: msg.forwarded,
            expiresAt: msg.expiresAt,
            type: msg.type as ChatMessage["type"],
            poll: pollData,
            voice: msg.voice,
            transfer: transferData,
            file: fileData,
            call: msg.call,
            nftShare: msg.nftShare,
          };
        })
      );

      // Reverse since we queried desc
      olderDecrypted.reverse();

      const anchorIndex = messagesVirtualizer.range?.startIndex ?? 0;
      const olderCount = olderDecrypted.length;

      setMessages((prev) => [...olderDecrypted, ...prev]);

      requestAnimationFrame(() => {
        messagesVirtualizer.scrollToIndex(anchorIndex + olderCount, { align: "start" });
      });
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setLoadingOlder(false);
    }
  }

  // Scroll handler: detect scrolling to top for pagination
  function handleScrollForPagination() {
    if (!chatContainerRef.current) return;
    const { scrollTop } = chatContainerRef.current;
    if (scrollTop <= 50 && !loadingOlder && hasMoreMessages) {
      loadOlderMessages();
    }
  }

  // Typing indicator: set/clear typing status
  function setTyping(typing: boolean) {
    if (!telegramId || !chatId) return;
    if (typing === isTypingRef.current) return;
    isTypingRef.current = typing;

    const chatRef = doc(dbfs, "qc-chats", chatId);
    if (typing) {
      updateDoc(chatRef, { [`typing.${telegramId}`]: serverTimestamp() }).catch(() => {});
    } else {
      updateDoc(chatRef, { [`typing.${telegramId}`]: deleteField() }).catch(() => {});
    }
  }

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
    if (isMuted) {
      toast.error("You are muted in this chat");
      return;
    }

    setIsSending(true);
    setNewMessage("");
    setTyping(false);
    const currentReply = replyTo;
    setReplyTo(null);

    const senderName = qcUsername || "Unknown";

    try {
      // Use participantsRef for latest participants
      const participants = participantsRef.current;
      const epoch = await ensureEpoch();
      const encryptedText = await encryptMessage(text, participants, chatId, telegramId, isGroupRef.current, epoch.nonce, epoch.counter);

      // Build message doc
      const messageDoc: Record<string, unknown> = {
        text: encryptedText,
        senderName,
        senderId: telegramId,
        createdAt: serverTimestamp(),
        encrypted: true,
        encVersion: 6,
        encEpoch: epoch.counter,
      };

      // Add expiresAt if disappearing messages enabled
      if (chatMeta.disappearAfter && chatMeta.disappearAfter > 0) {
        messageDoc.expiresAt = Timestamp.fromMillis(Date.now() + chatMeta.disappearAfter);
      }

      // Add reply reference if replying
      if (currentReply) {
        const replyText = currentReply.text.length > 80
          ? currentReply.text.slice(0, 80) + "…"
          : currentReply.text;
        const encryptedReplyText = await encryptMessage(replyText, participants, chatId, telegramId, isGroupRef.current, epoch.nonce, epoch.counter);
        messageDoc.replyTo = {
          id: currentReply.id,
          text: encryptedReplyText,
          senderName: currentReply.senderName,
        };
      }

      // Critical write: add the message
      const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");
      await addDoc(messagesRef, messageDoc);

      // Cache preview locally so sender can see it in chat list
      const preview = text.length > 50 ? text.slice(0, 50) + "…" : text;
      try { localStorage.setItem(`qc-preview-${chatId}`, preview); } catch {}

      // Non-blocking: update chat metadata (lastMessage, unreadCounts)
      // This is fire-and-forget so a failed metadata update doesn't block future sends
      const updates: Record<string, unknown> = {
        lastMessage: encryptedText,
        lastMessageBy: telegramId,
        lastMessageAt: serverTimestamp(),
        lastMessageEpoch: epoch.counter,
        [`readPositions.${telegramId}`]: serverTimestamp(),
        [`unreadCounts.${telegramId}`]: 0,
      };
      for (const pid of participants) {
        if (pid !== telegramId) {
          updates[`unreadCounts.${pid}`] = increment(1);
        }
      }
      updateDoc(doc(dbfs, "qc-chats", chatId), updates).catch((err) => {
        console.warn("Chat metadata update failed (message was sent):", err);
      });

      // Push notification to offline participants (fire-and-forget)
      const recipientIds = participants.filter((p) => p !== telegramId);
      if (recipientIds.length > 0) {
        sendChatNotification({
            recipientIds,
            senderName,
            chatId,
            chatName: chatMeta.isGroup ? (chatMeta.groupName || "Group") : senderName,
            isGroup: !!isGroupChat,
          }).catch(() => {});
      }

      scrollToBottom(true);
    } catch (error) {
      console.error("Failed to send message:", error);
      setNewMessage(text);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  // Send voice message
  const handleSendVoice = async (blob: Blob, durationSec: number) => {
    if (!telegramId || !chatId || !chatMeta) return;
    if (isMuted) {
      toast.error("You are muted in this chat");
      return;
    }

    if (!currentUser) {
      toast.error("Not authenticated. Please re-open the app.");
      console.error("Voice send blocked: Firebase Auth currentUser is null");
      return;
    }

    const participants = participantsRef.current;
    if (!participants.length) {
      toast.error("Chat not fully loaded. Please wait and try again.");
      return;
    }

    const senderName = qcUsername || "Unknown";
    const msgId = `voice_${Date.now()}_${telegramId}`;

    try {
      // Refresh auth token before upload to prevent expired token errors
      await currentUser.getIdToken(true);

      const epoch = await ensureEpoch();

      // Encrypt the audio blob before uploading
      const audioBuffer = await blob.arrayBuffer();
      const encryptedBuffer = await encryptBlob(audioBuffer, participants, chatId, telegramId, isGroupRef.current, epoch.nonce, epoch.counter);
      const encryptedBlob = new Blob([encryptedBuffer], { type: "application/octet-stream" });

      const fileRef = storageRef(storage, `voice-messages/${chatId}/${msgId}.enc.webm`);

      // Upload with retry
      let uploadAttempts = 0;
      while (uploadAttempts < 3) {
        try {
          await uploadBytes(fileRef, encryptedBlob, { contentType: "application/octet-stream" });
          break;
        } catch (uploadErr) {
          uploadAttempts++;
          if (uploadAttempts >= 3) throw uploadErr;
          await new Promise((r) => setTimeout(r, 1000 * uploadAttempts));
        }
      }
      const url = await getDownloadURL(fileRef);

      const previewText = "🎤 Voice message";
      const encryptedPreview = await encryptMessage(previewText, participants, chatId, telegramId, isGroupRef.current, epoch.nonce, epoch.counter);

      const messageDoc: Record<string, unknown> = {
        text: encryptedPreview,
        senderName,
        senderId: telegramId,
        createdAt: serverTimestamp(),
        encrypted: true,
        encVersion: 6,
        encEpoch: epoch.counter,
        type: "voice",
        voice: { url, durationSec, encrypted: true },
      };

      if (chatMeta.disappearAfter && chatMeta.disappearAfter > 0) {
        messageDoc.expiresAt = Timestamp.fromMillis(Date.now() + chatMeta.disappearAfter);
      }

      const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");
      await addDoc(messagesRef, messageDoc);

      try { localStorage.setItem(`qc-preview-${chatId}`, previewText); } catch {}

      const updates: Record<string, unknown> = {
        lastMessage: encryptedPreview,
        lastMessageBy: telegramId,
        lastMessageAt: serverTimestamp(),
        lastMessageEpoch: epoch.counter,
        [`readPositions.${telegramId}`]: serverTimestamp(),
        [`unreadCounts.${telegramId}`]: 0,
      };
      for (const pid of participants) {
        if (pid !== telegramId) {
          updates[`unreadCounts.${pid}`] = increment(1);
        }
      }
      updateDoc(doc(dbfs, "qc-chats", chatId), updates).catch((err) => {
        console.warn("Chat metadata update failed (voice was sent):", err);
      });

      // Push notification to offline participants (fire-and-forget)
      const recipientIds = participants.filter((p) => p !== telegramId);
      if (recipientIds.length > 0) {
        sendChatNotification({
            recipientIds,
            senderName,
            chatId,
            chatName: chatMeta.isGroup ? (chatMeta.groupName || "Group") : senderName,
            isGroup: !!isGroupChat,
          }).catch(() => {});
      }

      scrollToBottom(true);
    } catch (error: any) {
      console.error("Failed to send voice message:", error);
      const msg = error?.code === "storage/unauthorized"
        ? "Upload denied. Please re-open the app to refresh your session."
        : error?.code === "storage/retry-limit-exceeded" || error?.message?.includes("network")
          ? "Network error. Check your connection and try again."
          : "Failed to send voice message";
      toast.error(msg);
    }
  };

  // Send file/image message (encrypted)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSendingFile, setIsSendingFile] = useState(false);

  const handleSendFile = async (file: File) => {
    if (!telegramId || !chatId || !chatMeta) return;
    if (isMuted) {
      toast.error("You are muted in this chat");
      return;
    }

    if (!currentUser) {
      toast.error("Not authenticated. Please re-open the app.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10 MB.");
      return;
    }

    const participants = participantsRef.current;
    if (!participants.length) {
      toast.error("Chat not fully loaded. Please wait and try again.");
      return;
    }

    const senderName = qcUsername || "Unknown";
    const msgId = `file_${Date.now()}_${telegramId}`;
    setIsSendingFile(true);

    try {
      // Refresh auth token before upload to prevent expired token errors
      await currentUser.getIdToken(true);

      const epoch = await ensureEpoch();

      // Read file and encrypt
      const fileBuffer = await file.arrayBuffer();
      const encryptedBuffer = await encryptBlob(fileBuffer, participants, chatId, telegramId, isGroupRef.current, epoch.nonce, epoch.counter);
      const encryptedBlob = new Blob([encryptedBuffer], { type: "application/octet-stream" });

      // Get image dimensions if applicable
      let width: number | undefined;
      let height: number | undefined;
      if (file.type.startsWith("image/")) {
        try {
          const img = await createImageBitmap(file);
          width = img.width;
          height = img.height;
          img.close();
        } catch {}
      }

      const fileRef = storageRef(storage, `chat-files/${chatId}/${msgId}/${file.name}.enc`);

      // Upload with retry
      let uploadAttempts = 0;
      while (uploadAttempts < 3) {
        try {
          await uploadBytes(fileRef, encryptedBlob, { contentType: "application/octet-stream" });
          break;
        } catch (uploadErr) {
          uploadAttempts++;
          if (uploadAttempts >= 3) throw uploadErr;
          await new Promise((r) => setTimeout(r, 1000 * uploadAttempts));
        }
      }
      const url = await getDownloadURL(fileRef);

      const isImage = file.type.startsWith("image/");
      const previewText = isImage ? "Sent an image" : `Sent a file`;
      const encryptedPreview = await encryptMessage(previewText, participants, chatId, telegramId, isGroupRef.current, epoch.nonce, epoch.counter);

      const messageDoc: Record<string, unknown> = {
        text: encryptedPreview,
        senderName,
        senderId: telegramId,
        createdAt: serverTimestamp(),
        encrypted: true,
        encVersion: 6,
        encEpoch: epoch.counter,
        type: "file",
        file: {
          url,
          encName: await encryptMessage(file.name, participants, chatId, telegramId, isGroupRef.current, epoch.nonce, epoch.counter),
          size: file.size,
          mimeType: file.type,
          encrypted: true,
          ...(width && height ? { width, height } : {}),
        },
      };

      if (chatMeta.disappearAfter && chatMeta.disappearAfter > 0) {
        messageDoc.expiresAt = Timestamp.fromMillis(Date.now() + chatMeta.disappearAfter);
      }

      const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");
      await addDoc(messagesRef, messageDoc);

      try { localStorage.setItem(`qc-preview-${chatId}`, previewText); } catch {}

      const updates: Record<string, unknown> = {
        lastMessage: encryptedPreview,
        lastMessageBy: telegramId,
        lastMessageAt: serverTimestamp(),
        lastMessageEpoch: epoch.counter,
        [`readPositions.${telegramId}`]: serverTimestamp(),
        [`unreadCounts.${telegramId}`]: 0,
      };
      for (const pid of participants) {
        if (pid !== telegramId) {
          updates[`unreadCounts.${pid}`] = increment(1);
        }
      }
      updateDoc(doc(dbfs, "qc-chats", chatId), updates).catch((err) => {
        console.warn("Chat metadata update failed (file was sent):", err);
      });

      // Push notification
      const recipientIds = participants.filter((p) => p !== telegramId);
      if (recipientIds.length > 0) {
        sendChatNotification({
            recipientIds,
            senderName,
            chatId,
            chatName: chatMeta.isGroup ? (chatMeta.groupName || "Group") : senderName,
            isGroup: !!isGroupChat,
          }).catch(() => {});
      }

      scrollToBottom(true);
    } catch (error: any) {
      console.error("Failed to send file:", error);
      const msg = error?.code === "storage/unauthorized"
        ? "Upload denied. Please re-open the app to refresh your session."
        : error?.code === "storage/retry-limit-exceeded" || error?.message?.includes("network")
          ? "Network error. Check your connection and try again."
          : "Failed to send file";
      toast.error(msg);
    } finally {
      setIsSendingFile(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Send transfer message (after successful TON transaction)
  const handleSendTransfer = async (amount: string, txHash: string, toAddress: string) => {
    if (!telegramId || !chatId || !chatMeta || !walletAddress) return;
    if (isMuted) {
      toast.error("You are muted in this chat");
      return;
    }

    const senderName = qcUsername || "Unknown";
    try {
      const participants = participantsRef.current;
      const epoch = await ensureEpoch();
      const previewText = `Sent ${amount} TON`;
      const encryptedPreview = await encryptMessage(previewText, participants, chatId, telegramId, isGroupRef.current, epoch.nonce, epoch.counter);

      // Encrypt transfer details
      const transferContent = JSON.stringify({
        amount,
        senderAddress: walletAddress,
        recipientAddress: toAddress,
        txHash,
        status: "sent",
      });
      const encTransferData = await encryptMessage(transferContent, participants, chatId, telegramId, isGroupRef.current, epoch.nonce, epoch.counter);

      const messageDoc: Record<string, unknown> = {
        text: encryptedPreview,
        senderName,
        senderId: telegramId,
        createdAt: serverTimestamp(),
        encrypted: true,
        encVersion: 6,
        encEpoch: epoch.counter,
        type: "transfer",
        transfer: { encData: encTransferData },
      };

      if (chatMeta.disappearAfter && chatMeta.disappearAfter > 0) {
        messageDoc.expiresAt = Timestamp.fromMillis(Date.now() + chatMeta.disappearAfter);
      }

      const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");
      await addDoc(messagesRef, messageDoc);

      try { localStorage.setItem(`qc-preview-${chatId}`, previewText); } catch {}

      const updates: Record<string, unknown> = {
        lastMessage: encryptedPreview,
        lastMessageBy: telegramId,
        lastMessageAt: serverTimestamp(),
        lastMessageEpoch: epoch.counter,
        [`readPositions.${telegramId}`]: serverTimestamp(),
        [`unreadCounts.${telegramId}`]: 0,
      };
      for (const pid of participants) {
        if (pid !== telegramId) {
          updates[`unreadCounts.${pid}`] = increment(1);
        }
      }
      updateDoc(doc(dbfs, "qc-chats", chatId), updates).catch((err) => {
        console.warn("Chat metadata update failed (transfer was sent):", err);
      });

      // Push notification
      const recipientIds = participants.filter((p) => p !== telegramId);
      if (recipientIds.length > 0) {
        sendChatNotification({
            recipientIds,
            senderName,
            chatId,
            chatName: senderName,
            isGroup: false,
          }).catch(() => {});
      }

      scrollToBottom(true);
    } catch (error) {
      console.error("Failed to send transfer message:", error);
    }
  };

  const handleTransferFailed = async (_amount: string, _error: string) => {
    // Failed transfers only show a toast (already shown by TransferDrawer)
    // No message posted to chat for failed transfers
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCreatePoll = async (question: string, options: string[]) => {
    if (!telegramId || !chatId || !chatMeta) return;
    if (isMuted) {
      toast.error("You are muted in this chat");
      return;
    }
    if (!question.trim() || options.length < 2 || options.some((o) => !o.trim())) return;
    try {
      const senderName = qcUsername || "Unknown";
      const participants = participantsRef.current;
      const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");

      const votes: Record<string, string[]> = {};
      options.forEach((_, i) => { votes[String(i)] = []; });

      const epoch = await ensureEpoch();

      // Encrypt poll content (question + options as JSON)
      const pollContent = JSON.stringify({ question, options });
      const encPollData = await encryptMessage(pollContent, participants, chatId, telegramId, isGroupRef.current, epoch.nonce, epoch.counter);
      const previewText = "Created a poll";
      const encryptedPreview = await encryptMessage(previewText, participants, chatId, telegramId, isGroupRef.current, epoch.nonce, epoch.counter);

      const messageDoc: Record<string, unknown> = {
        text: encryptedPreview,
        senderName,
        senderId: telegramId,
        createdAt: serverTimestamp(),
        encrypted: true,
        encVersion: 6,
        encEpoch: epoch.counter,
        type: "poll",
        poll: { encData: encPollData, votes, createdBy: telegramId },
      };

      if (chatMeta.disappearAfter && chatMeta.disappearAfter > 0) {
        messageDoc.expiresAt = Timestamp.fromMillis(Date.now() + chatMeta.disappearAfter);
      }

      await addDoc(messagesRef, messageDoc);

      try { localStorage.setItem(`qc-preview-${chatId}`, `📊 ${question}`); } catch {}

      const updates: Record<string, unknown> = {
        lastMessage: encryptedPreview,
        lastMessageBy: telegramId,
        lastMessageAt: serverTimestamp(),
        lastMessageEpoch: epoch.counter,
        [`readPositions.${telegramId}`]: serverTimestamp(),
        [`unreadCounts.${telegramId}`]: 0,
      };
      for (const pid of participants) {
        if (pid !== telegramId) {
          updates[`unreadCounts.${pid}`] = increment(1);
        }
      }
      updateDoc(doc(dbfs, "qc-chats", chatId), updates).catch(() => {});
      scrollToBottom(true);
    } catch (error) {
      console.error("Failed to create poll:", error);
    }
  };

  // Reaction toggle: add or remove reaction
  async function toggleReaction(msgId: string, emojiKey: string) {
    if (!telegramId || !chatId) return;
    const msgRef = doc(dbfs, "qc-chats", chatId, "messages", msgId);
    const msg = messages.find((m) => m.id === msgId);
    const alreadyReacted = msg?.reactions?.[emojiKey]?.includes(telegramId);
    try {
      await updateDoc(msgRef, {
        [`reactions.${emojiKey}`]: alreadyReacted
          ? arrayRemove(telegramId)
          : arrayUnion(telegramId),
      });
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
    setReactionPickerMsgId(null);
  }

  // Pin message (groups only) — store only ID + senderName to avoid leaking plaintext
  async function handlePinMessage(msg: ChatMessage) {
    if (!chatId) return;
    const chatRef = doc(dbfs, "qc-chats", chatId);
    try {
      await updateDoc(chatRef, {
        pinnedMessage: { id: msg.id, senderName: msg.senderName },
      });
    } catch (err) {
      console.error("Failed to pin message:", err);
    }
    setReactionPickerMsgId(null);
  }

  // Forward: open dialog with user's chats
  async function handleForwardStart(msgId: string) {
    if (!telegramId) return;
    setForwardMsgId(msgId);
    setReactionPickerMsgId(null);
    try {
      const chatsRef = collection(dbfs, "qc-chats");
      const q2 = query(chatsRef, where("participants", "array-contains", telegramId), limit(50));
      const snap = await getDocs(q2);
      const chats: any[] = [];
      snap.forEach((d) => {
        if (d.id !== chatId) {
          const data = d.data();
          chats.push({ id: d.id, ...data });
        }
      });
      setForwardChats(chats);
      setShowForwardDialog(true);
    } catch (err) {
      console.error("Failed to fetch chats for forwarding:", err);
    }
  }

  // Forward: send message to destination chat
  async function handleForwardTo(destChat: any) {
    if (!forwardMsgId || !telegramId) return;
    const msg = messages.find((m) => m.id === forwardMsgId);
    if (!msg) return;
    // Only text messages can be forwarded — non-text types (voice, file, poll, transfer, nftShare) would lose their type
    if (msg.type && msg.type !== "text") {
      toast.error("Only text messages can be forwarded");
      setShowForwardDialog(false);
      setForwardMsgId(null);
      return;
    }
    setIsForwarding(true);
    try {
        // Fetch fresh destination chat data to get current epoch & participants
        const destSnap = await getDoc(doc(dbfs, "qc-chats", destChat.id));
        const freshDest = destSnap.exists() ? destSnap.data() : destChat;
        const destParticipants: string[] = freshDest.participants || destChat.participants || [];
        const destIsGroup = freshDest.isGroup || freshDest.isGlobal || false;
        const destEpochNonce = freshDest.epochNonce ?? destChat.epochNonce;
        const destEpochCounter = freshDest.epochCounter ?? destChat.epochCounter;
        const encryptedText = await encryptMessage(msg.text, destParticipants, destChat.id, telegramId, destIsGroup, destEpochNonce, destEpochCounter);
        const senderName = qcUsername || "Unknown";

        const fwdDoc: Record<string, unknown> = {
          text: encryptedText,
          senderName,
          senderId: telegramId,
          createdAt: serverTimestamp(),
          encrypted: true,
          encVersion: 6,
          encEpoch: destEpochCounter ?? 0,
          forwarded: { from: msg.senderName, originalChatId: chatId },
        };

        // If destination has disappearing messages, add expiresAt
        const destDisappear = freshDest.disappearAfter ?? destChat.disappearAfter;
        if (destDisappear && destDisappear > 0) {
          fwdDoc.expiresAt = Timestamp.fromMillis(Date.now() + destDisappear);
        }

        const destMsgsRef = collection(dbfs, "qc-chats", destChat.id, "messages");
        await addDoc(destMsgsRef, fwdDoc);

        // Update destination chat metadata
        const updates: Record<string, unknown> = {
          lastMessage: encryptedText,
          lastMessageBy: telegramId,
          lastMessageAt: serverTimestamp(),
          lastMessageEpoch: destEpochCounter ?? 0,
          [`readPositions.${telegramId}`]: serverTimestamp(),
          [`unreadCounts.${telegramId}`]: 0,
        };
        for (const pid of destParticipants) {
          if (pid !== telegramId) {
            updates[`unreadCounts.${pid}`] = increment(1);
          }
        }
        updateDoc(doc(dbfs, "qc-chats", destChat.id), updates).catch(() => {});
      } catch (err) {
      console.error("Failed to forward message:", err);
    } finally {
      setIsForwarding(false);
      setShowForwardDialog(false);
      setForwardMsgId(null);
    }
  }

  // Delete message
  async function handleDeleteForMe(msgId: string) {
    if (!chatId || !telegramId) return;
    try {
      await updateDoc(doc(dbfs, "qc-chats", chatId, "messages", msgId), {
        [`hiddenBy.${telegramId}`]: true,
      });
      // Pessimistic: only remove from UI after successful Firestore write
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      toast.success("Message hidden");
    } catch (err) {
      console.error("Failed to hide message:", err);
      toast.error("Failed to hide message");
    }
    setReactionPickerMsgId(null);
  }

  async function handleDeleteForEveryone(msgId: string) {
    if (!chatId) return;
    try {
      const wasLastMessage = messages[messages.length - 1]?.id === msgId;
      await deleteDoc(doc(dbfs, "qc-chats", chatId, "messages", msgId));

      // If deleting the last message, query Firestore for the actual last remaining message
      if (wasLastMessage) {
        const lastMsgQuery = query(
          collection(dbfs, "qc-chats", chatId, "messages"),
          orderBy("createdAt", "desc"),
          limit(1),
        );
        const lastMsgSnap = await getDocs(lastMsgQuery);
        if (!lastMsgSnap.empty) {
          const lastMsgData = lastMsgSnap.docs[0].data();
          updateDoc(doc(dbfs, "qc-chats", chatId), {
            lastMessage: lastMsgData.encrypted ? "New message" : (lastMsgData.text || ""),
            lastMessageBy: lastMsgData.senderId || "",
            lastMessageAt: lastMsgData.createdAt || serverTimestamp(),
          }).catch(() => {});
        } else {
          updateDoc(doc(dbfs, "qc-chats", chatId), {
            lastMessage: "",
            lastMessageBy: "",
            lastMessageAt: serverTimestamp(),
            lastMessageEpoch: deleteField(),
          }).catch(() => {});
          try { localStorage.removeItem(`qc-preview-${chatId}`); } catch {}
        }
      }
      toast.success("Message deleted");
    } catch (err) {
      console.error("Failed to delete message:", err);
      toast.error("Failed to delete message");
    }
    setReactionPickerMsgId(null);
  }

  // Copy message text
  function handleCopyText(msgId: string) {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    navigator.clipboard.writeText(msg.text).then(() => {
      toast.success("Copied to clipboard");
    }).catch(() => {});
    setReactionPickerMsgId(null);
  }

  // Disappearing messages: update setting
  async function handleSetDisappearAfter(ms: number) {
    if (!chatId) return;
    try {
      await updateDoc(doc(dbfs, "qc-chats", chatId), { disappearAfter: ms });
    } catch (err) {
      console.error("Failed to update disappearing messages:", err);
    }
    setTimerPopoverOpen(false);
  }

  // Admin actions: kick, ban, mute, unmute
  async function handleAdminAction(action: "kick" | "ban" | "unban" | "mute" | "unmute", targetUserId: string) {
    if (!chatId || !chatMeta || !telegramId) return;
    if (chatMeta.createdBy !== telegramId) return;
    if (targetUserId === telegramId) return;

      const chatRef = doc(dbfs, "qc-chats", chatId);
      const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");
      const adminName = qcUsername || "Admin";
      const targetName = chatMeta.participantNames[targetUserId] || targetUserId;

      try {
        if (action === "kick") {
          // Use transaction to atomically read epoch, rotate, and remove participant
          await runTransaction(dbfs, async (txn) => {
            const snap = await txn.get(chatRef);
            const data = snap.data();
            if (!data) return;
            const currentCounter = data.epochCounter ?? 0;
            const newEpoch = currentCounter + 1;
            const newNonce = generateEpochNonce();
            const updatedParticipants = (data.participants || []).filter((p: string) => p !== targetUserId);
            const updatedNames = { ...data.participantNames };
            delete updatedNames[targetUserId];
            txn.update(chatRef, {
              participants: updatedParticipants,
              participantNames: updatedNames,
              epochNonce: newNonce,
              epochCounter: newEpoch,
              [`epochNonces.${newEpoch}`]: newNonce,
            });
          });
          await addDoc(messagesRef, {
            text: `@${adminName} kicked @${targetName}`,
            senderId: "system",
            senderName: "system",
            createdAt: serverTimestamp(),
            encrypted: false,
          });
        } else if (action === "ban") {
          // Use transaction to atomically read epoch, rotate, remove participant, and ban
          await runTransaction(dbfs, async (txn) => {
            const snap = await txn.get(chatRef);
            const data = snap.data();
            if (!data) return;
            const currentCounter = data.epochCounter ?? 0;
            const newEpoch = currentCounter + 1;
            const newNonce = generateEpochNonce();
            const updatedParticipants = (data.participants || []).filter((p: string) => p !== targetUserId);
            const updatedNames = { ...data.participantNames };
            delete updatedNames[targetUserId];
            const updatedBanned = [...(data.bannedUsers || []), targetUserId];
            txn.update(chatRef, {
              participants: updatedParticipants,
              participantNames: updatedNames,
              bannedUsers: updatedBanned,
              epochNonce: newNonce,
              epochCounter: newEpoch,
              [`epochNonces.${newEpoch}`]: newNonce,
            });
          });
          await addDoc(messagesRef, {
            text: `@${adminName} banned @${targetName}`,
            senderId: "system",
            senderName: "system",
            createdAt: serverTimestamp(),
            encrypted: false,
          });
        } else if (action === "mute") {
          await updateDoc(chatRef, {
            mutedUsers: arrayUnion(targetUserId),
          });
          await addDoc(messagesRef, {
            text: `@${adminName} muted @${targetName}`,
            senderId: "system",
            senderName: "system",
            createdAt: serverTimestamp(),
            encrypted: false,
          });
        } else if (action === "unban") {
          await updateDoc(chatRef, {
            bannedUsers: arrayRemove(targetUserId),
          });
          await addDoc(messagesRef, {
            text: `@${adminName} unbanned @${targetName}`,
            senderId: "system",
            senderName: "system",
            createdAt: serverTimestamp(),
            encrypted: false,
          });
        } else if (action === "unmute") {
          await updateDoc(chatRef, {
            mutedUsers: arrayRemove(targetUserId),
          });
          await addDoc(messagesRef, {
            text: `@${adminName} unmuted @${targetName}`,
            senderId: "system",
            senderName: "system",
            createdAt: serverTimestamp(),
            encrypted: false,
          });
        }
    } catch (err) {
      console.error(`Failed to ${action} user:`, err);
    }
  }

  // Scroll to a specific message by ID (uses virtualizer to ensure item is rendered)
  function scrollToMessage(msgId: string) {
    const idx = messagesArrayRef.current.findIndex(m => m.id === msgId);
    if (idx >= 0) {
      messagesVirtualizer.scrollToIndex(idx, { align: "center" });
      // Wait for virtual item to render, then highlight
      setTimeout(() => {
        const el = messageRefs.current[msgId];
        if (el) {
          const bubble = el.querySelector("[data-bubble]") as HTMLElement | null;
          const target = bubble || el;
          target.style.animation = "none";
          void target.offsetHeight;
          target.style.animation = "highlightMessage 2s ease-in-out";
        }
      }, 150);
    }
  }

  // Search matches
  const searchMatches = showSearch && searchQuery.trim()
    ? messages
        .map((m, i) => ({ idx: i, msg: m }))
        .filter(({ msg }) => msg.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Scroll to first match when search changes
  useEffect(() => {
    if (searchMatches.length > 0 && searchMatchIndex < 0) {
      setSearchMatchIndex(0);
      scrollToMessage(searchMatches[0].msg.id);
    }
  }, [searchQuery]);

  // Close reaction picker on outside tap
  useEffect(() => {
    if (!reactionPickerMsgId) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-reaction-picker]")) {
        setReactionPickerMsgId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [reactionPickerMsgId]);

  // Disappearing messages: filter expired messages from UI
  const filterExpiredMessages = useCallback(() => {
    setMessages((prev) => {
      const now = Date.now();
      const filtered = prev.filter((m) => {
        if (!m.expiresAt) return true;
        const expiry = typeof m.expiresAt === "number" ? m.expiresAt : m.expiresAt?.toMillis() ?? Infinity;
        return expiry > now;
      });
      return filtered.length === prev.length ? prev : filtered;
    });
  }, []);

  // Periodically check for expired messages
  useEffect(() => {
    const interval = setInterval(filterExpiredMessages, 5_000);
    return () => clearInterval(interval);
  }, [filterExpiredMessages]);

  // Immediately check for expired messages when messages change
  useEffect(() => {
    filterExpiredMessages();
  }, [messages.length, filterExpiredMessages]);

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

  // Resolve sender display name: prefer participantNames over stored senderName when it's "Unknown"
  const resolveSenderName = (msg: ChatMessage): string => {
    if (msg.senderName && msg.senderName !== "Unknown") return msg.senderName;
    const resolved = chatMeta?.participantNames?.[msg.senderId];
    if (resolved && resolved !== "Unknown") return resolved;
    return msg.senderName || "Unknown";
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
    if (other && chatMeta.participantNames[other] && chatMeta.participantNames[other] !== "Unknown") {
      return chatMeta.participantNames[other];
    }
    // Fallback: use the individually-resolved username query for DM chats
    if (recipientUsernameQuery.data?.username) return recipientUsernameQuery.data.username;
    return "Chat";
  };

  const isSelfChat = !chatMeta?.isGroup && !chatMeta?.isGlobal &&
    chatMeta?.participants.length === 1 && chatMeta.participants[0] === telegramId;

  const isMuted = !!(telegramId && chatMeta?.mutedUsers?.includes(telegramId));

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
      const memberCount = chatMeta?.participants.length || 0;
      // Count online members (excluding self) from group presence map
      const onlineCount = Array.from(groupPresenceMap.values()).filter((p) => p.isOnline).length;
      if (onlineCount > 0) {
        return {
          text: `${memberCount} members · ${onlineCount} online`,
          color: "text-green-400",
        };
      }
      return {
        text: `${memberCount} members · Encrypted`,
        color: "text-green-400",
      };
    }

    if (isSelfChat) {
      return { text: "Encrypted personal notes", color: "text-green-400" };
    }

    // DM: show online/last seen (pass chatId so same-chat users show as online)
    const presenceText = formatLastSeen(otherPresence, chatId);
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
    <>
    <div className="fixed inset-0 z-40 bg-background" aria-hidden />
    <div className="fixed inset-0 z-[41] flex flex-col">
      <style>{`
        @keyframes highlightMessage {
          0% { box-shadow: 0 0 0 0 transparent; }
          15% { box-shadow: 0 0 0 2px hsl(var(--primary) / 0.4); background-color: hsl(var(--primary) / 0.08); }
          85% { box-shadow: 0 0 0 2px hsl(var(--primary) / 0.4); background-color: hsl(var(--primary) / 0.08); }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
      `}</style>
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
            {!chatMeta ? (
              <Skeleton className="h-4 w-24 rounded" />
            ) : isGroupChat ? (
              <button
                onClick={() => router.push(`/ecosystem/chat/${chatId}/info`)}
                className="text-sm font-semibold text-foreground truncate hover:underline text-left"
              >
                {headerName}
              </button>
            ) : isSelfChat ? (
              <h1 className="text-sm font-semibold text-foreground truncate">Saved Messages <span className="text-muted-foreground font-normal">(You)</span></h1>
            ) : (
              <button
                onClick={() => otherParticipantId && router.push(`/user/${otherParticipantId}?name=${encodeURIComponent(headerName)}`)}
                className="text-sm font-semibold text-foreground truncate hover:underline text-left"
              >
                @{headerName}
              </button>
            )}
            {chatMeta?.isGlobal && (
              <Icon icon="solar:verified-check-bold" className="w-4 h-4 text-primary shrink-0" />
            )}
            {!!chatMeta?.disappearAfter && chatMeta.disappearAfter > 0 && (
              <Icon icon="lucide:timer" className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1">
            {!chatMeta ? (
              <Skeleton className="h-3 w-16 rounded" />
            ) : (
              <>
                {subtitle.color === "text-green-400" && typingUsers.length === 0 && (
                  <Icon icon="solar:lock-keyhole-bold" className="w-3 h-3 text-green-400 shrink-0" />
                )}
                <span className={`text-[11px] ${subtitle.color} leading-none truncate`}>
                  {subtitle.text}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Voice call button — DM */}
        {!isGroupChat && !isSelfChat && otherParticipantId && (
          <Button
            size="icon"
            variant="ghost"
            className="w-9 h-9 rounded-full shrink-0"
            disabled={callState !== "idle"}
            onClick={() => {
              initiateCall({
                calleeId: otherParticipantId,
                calleeName: headerName,
                chatId,
              });
            }}
          >
            <Icon icon="solar:phone-bold" className="w-5 h-5" />
          </Button>
        )}
        {/* Voice call button — Group (not global) */}
        {chatMeta?.isGroup && !chatMeta?.isGlobal && (
          <Button
            size="icon"
            variant="ghost"
            className="w-9 h-9 rounded-full shrink-0"
            disabled={groupCallState !== "idle" && callState !== "idle"}
            onClick={() => {
              joinGroupCall(chatId, headerName);
            }}
          >
            <Icon icon="solar:phone-bold" className="w-5 h-5" />
          </Button>
        )}

        {/* Three-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="w-9 h-9 rounded-full shrink-0"
            >
              <Icon icon="solar:menu-dots-bold" className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => { setShowSearch((v) => !v); setSearchQuery(""); setSearchMatchIndex(-1); }}>
              <Icon icon="lucide:search" className="w-4 h-4 mr-2" />
              Search
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowThemePicker(true)}>
              <Icon icon="lucide:wallpaper" className="w-4 h-4 mr-2" />
              Wallpaper
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimerPopoverOpen(true)}>
              <Icon icon="lucide:timer" className="w-4 h-4 mr-2" />
              Disappearing messages
              {!!chatMeta?.disappearAfter && chatMeta.disappearAfter > 0 && (
                <span className="ml-auto text-[10px] text-primary">On</span>
              )}
            </DropdownMenuItem>
            {isGroupChat && chatMeta?.joinCode && (
              <DropdownMenuSeparator />
            )}
            {isGroupChat && chatMeta?.joinCode && (
              <DropdownMenuItem onClick={() => setShowShareModal(true)}>
                <Icon icon="lucide:share-2" className="w-4 h-4 mr-2" />
                Share group
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Share Drawer (bottom sheet) */}
      {isGroupChat && chatMeta?.joinCode && (
        <Drawer open={showShareModal} onOpenChange={setShowShareModal}>
          <DrawerContent>
            <DrawerHeader className="text-center items-center">
              <DrawerTitle>Share Group</DrawerTitle>
              <DrawerDescription className="text-xs">
                Invite others to join {headerName}
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 px-4 pb-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-2">
                  <Icon icon="solar:users-group-rounded-bold" className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-semibold">{headerName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {chatMeta.participants.length} members
                </p>
              </div>

              <button
                className="w-full rounded-xl border border-border/60 bg-muted/30 p-3 text-center hover:bg-muted/50 active:scale-[0.98] transition-all"
                onClick={() => {
                  navigator.clipboard.writeText(chatMeta.joinCode!);
                  toast.success("Join code copied!");
                }}
              >
                <p className="text-[10px] text-muted-foreground mb-1">Join Code — tap to copy</p>
                <p className="text-lg font-mono font-bold tracking-[0.3em] text-foreground">
                  {chatMeta.joinCode}
                </p>
              </button>

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
          </DrawerContent>
        </Drawer>
      )}

      {/* Chat Theme Picker */}
      <ChatThemePicker
        open={showThemePicker}
        onOpenChange={setShowThemePicker}
        currentTheme={chatTheme}
        onSelect={(theme) => {
          setChatTheme(theme);
          if (theme) {
            localStorage.setItem(`chatTheme_${chatId}`, theme);
          } else {
            localStorage.removeItem(`chatTheme_${chatId}`);
          }
        }}
      />

      {/* Disappearing Messages Dialog */}
      <Dialog open={timerPopoverOpen} onOpenChange={setTimerPopoverOpen}>
        <DialogContent className="max-w-[280px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Icon icon="lucide:timer" className="w-5 h-5 text-primary" />
              Disappearing messages
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {[
              { label: "Off", ms: 0 },
              { label: "5 minutes", ms: 5 * 60 * 1000 },
              { label: "1 hour", ms: 60 * 60 * 1000 },
              { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
              { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
            ].map((opt) => (
              <button
                key={opt.ms}
                onClick={() => handleSetDisappearAfter(opt.ms)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted/60 transition-colors flex items-center justify-between ${
                  (chatMeta?.disappearAfter || 0) === opt.ms ? "text-primary font-medium" : "text-foreground"
                }`}
              >
                {opt.label}
                {(chatMeta?.disappearAfter || 0) === opt.ms && (
                  <Icon icon="lucide:check" className="w-3.5 h-3.5" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Members Panel */}
      {isGroupChat && chatMeta && telegramId && (
        <GroupMembersPanel
          open={showMembersPanel}
          onOpenChange={setShowMembersPanel}
          chatId={chatId}
          chatMeta={chatMeta}
          currentUserId={telegramId}
          onAction={handleAdminAction}
        />
      )}

      {/* Forward Dialog */}
      <Dialog open={showForwardDialog} onOpenChange={(open) => { setShowForwardDialog(open); if (!open) setForwardMsgId(null); }}>
        <DialogContent hideClose className="max-w-[340px] rounded-2xl">
          <DialogHeader className="text-center items-center">
            <DialogTitle className="text-center">Forward Message</DialogTitle>
            <DialogDescription className="text-center text-xs">
              Select a chat to forward to
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto -mx-2">
            {forwardChats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No other chats found</p>
            ) : (
              forwardChats.map((fc) => {
                const fcName = fc.isGroup || fc.isGlobal
                  ? fc.groupName || "Group"
                  : fc.participants?.find((p: string) => p !== telegramId)
                    ? fc.participantNames?.[fc.participants.find((p: string) => p !== telegramId)!] || "Chat"
                    : "Saved Messages (You)";
                return (
                  <button
                    key={fc.id}
                    disabled={isForwarding}
                    onClick={() => handleForwardTo(fc)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 rounded-lg transition-colors text-left"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className={`${getAvatarColor(fcName)} text-white text-xs font-semibold`}>
                        {getInitials(fcName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fcName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {fc.isGroup || fc.isGlobal ? `${fc.participants?.length || 0} members` : "Direct message"}
                      </p>
                    </div>
                    {isForwarding && (
                      <span className="text-primary"><ButtonLoader size="sm" /></span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Context Menu — Telegram-style floating popover */}
      {reactionPickerMsgId && menuAnchor && (
        <div className="fixed inset-0 z-[999] bg-black/50" onClick={() => setReactionPickerMsgId(null)}>
          <div
            data-reaction-picker
            className="absolute w-[220px] z-[1001]"
            style={{
              top: menuAnchor.y,
              left: menuAnchor.centerX - 110,
              transform: menuAnchor.showAbove ? "translateY(-100%) translateY(-8px)" : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Emoji reactions row */}
            <div className="flex items-center justify-center gap-1 mb-2 px-2 py-1.5 bg-card border border-border/50 rounded-2xl shadow-xl">
              {REACTION_EMOJIS.map((emoji) => {
                const activeMsg = messages.find((m) => m.id === reactionPickerMsgId);
                const isReacted = activeMsg?.reactions?.[emoji.key]?.includes(telegramId || "");
                return (
                  <button
                    key={emoji.key}
                    onClick={() => toggleReaction(reactionPickerMsgId, emoji.key)}
                    className={`p-1.5 rounded-lg hover:bg-muted/60 transition-all hover:scale-110 ${isReacted ? "bg-primary/15 scale-110" : ""}`}
                  >
                    <Icon icon={emoji.icon} className="w-5 h-5" />
                  </button>
                );
              })}
            </div>

            {/* Action items */}
            <div className="bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden py-1">
              <button
                onClick={() => {
                  const msg = messages.find((m) => m.id === reactionPickerMsgId);
                  if (msg) { setReplyTo(msg); inputRef.current?.focus(); }
                  setReactionPickerMsgId(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <Icon icon="lucide:reply" className="w-[18px] h-[18px] text-muted-foreground" />
                <span className="text-[13px] font-medium">Reply</span>
              </button>

              <button
                onClick={() => handleCopyText(reactionPickerMsgId)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <Icon icon="lucide:copy" className="w-[18px] h-[18px] text-muted-foreground" />
                <span className="text-[13px] font-medium">Copy Text</span>
              </button>

              {isGroupChat && (
                <button
                  onClick={() => {
                    const msg = messages.find((m) => m.id === reactionPickerMsgId);
                    if (msg) handlePinMessage(msg);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <Icon icon="lucide:pin" className="w-[18px] h-[18px] text-muted-foreground" />
                  <span className="text-[13px] font-medium">Pin</span>
                </button>
              )}

              <button
                onClick={() => handleForwardStart(reactionPickerMsgId)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <Icon icon="lucide:forward" className="w-[18px] h-[18px] text-muted-foreground" />
                <span className="text-[13px] font-medium">Forward</span>
              </button>

              {(() => {
                const activeMsg = messages.find((m) => m.id === reactionPickerMsgId);
                const canDeleteForEveryone = activeMsg?.senderId === telegramId || chatMeta?.createdBy === telegramId;
                return (
                  <>
                    <div className="mx-3 border-t border-border/50" />
                    <button
                      onClick={() => handleDeleteForMe(reactionPickerMsgId!)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition-colors"
                    >
                      <Icon icon="lucide:eye-off" className="w-[18px] h-[18px] text-red-500" />
                      <span className="text-[13px] font-medium text-red-500">Delete for Me</span>
                    </button>
                    {canDeleteForEveryone && (
                      <button
                        onClick={() => handleDeleteForEveryone(reactionPickerMsgId!)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition-colors"
                      >
                        <Icon icon="lucide:trash-2" className="w-[18px] h-[18px] text-red-500" />
                        <span className="text-[13px] font-medium text-red-500">Delete for Everyone</span>
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      {showSearch && (
        <div className="px-3 py-2 border-b border-border/50 bg-card/80 backdrop-blur-sm shrink-0 flex items-center gap-2">
          <Icon icon="lucide:search" className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchMatchIndex(-1); }}
            placeholder="Search messages..."
            className="flex-1 h-8 text-base rounded-lg bg-background border-border/50"
          />
          {searchMatches.length > 0 && (
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {searchMatchIndex + 1}/{searchMatches.length}
            </span>
          )}
          {searchMatches.length > 1 && (
            <Button
              size="icon"
              variant="ghost"
              className="w-7 h-7 rounded-full shrink-0"
              onClick={() => {
                const next = (searchMatchIndex + 1) % searchMatches.length;
                setSearchMatchIndex(next);
                scrollToMessage(searchMatches[next].msg.id);
              }}
            >
              <Icon icon="lucide:chevron-down" className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="w-7 h-7 rounded-full shrink-0"
            onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchMatchIndex(-1); }}
          >
            <Icon icon="lucide:x" className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Pinned message banner */}
      {chatMeta?.pinnedMessage && (() => {
        const pinnedMsg = messages.find(m => m.id === chatMeta.pinnedMessage!.id);
        return (
          <div className="w-full px-3 py-2 border-b border-border/50 bg-card/80 backdrop-blur-sm shrink-0 flex items-center gap-2">
            <button
              onClick={() => scrollToMessage(chatMeta.pinnedMessage!.id)}
              className="flex items-center gap-2 flex-1 min-w-0 text-left"
            >
              <Icon icon="lucide:pin" className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-primary">{chatMeta.pinnedMessage.senderName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{pinnedMsg?.text || "Pinned message"}</p>
              </div>
            </button>
            <Button
              size="icon"
              variant="ghost"
              className="w-6 h-6 rounded-full shrink-0"
              onClick={async () => {
                try {
                  await updateDoc(doc(dbfs, "qc-chats", chatId), { pinnedMessage: deleteField() });
                } catch (err) {
                  console.error("Failed to unpin:", err);
                }
              }}
            >
              <Icon icon="lucide:x" className="w-3 h-3" />
            </Button>
          </div>
        );
      })()}

      {/* Group call banner */}
      {chatMeta?.isGroup && !chatMeta?.isGlobal && (
        <GroupCallBanner chatId={chatId} groupName={headerName} />
      )}

      {/* Messages */}
      <div
        ref={chatContainerRef}
        onScroll={() => { handleScroll(); handleScrollForPagination(); }}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5"
        style={chatTheme ? { background: chatTheme } : undefined}
      >
        {/* Load older indicator */}
        {!isLoading && messages.length > 0 && (
          <div className="flex justify-center py-2">
            {loadingOlder ? (
              <span className="text-primary"><ButtonLoader /></span>
            ) : !hasMoreMessages ? (
              <span className="text-[10px] text-muted-foreground">No more messages</span>
            ) : null}
          </div>
        )}

        {/* Chat Notice */}
        {!isLoading && (
          <div className="flex justify-center py-3 pb-1">
            <div className="bg-muted/50 rounded-2xl px-4 py-2.5 flex flex-col items-center gap-1 max-w-[260px]">
              <Icon
                icon={isGroupChat ? "solar:users-group-rounded-bold" : "solar:lock-keyhole-bold"}
                className="w-4 h-4 text-muted-foreground"
              />
              <span className="text-[10px] text-muted-foreground leading-tight text-center">
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
          <div className="flex flex-col items-center justify-center h-full gap-3 text-primary">
            <ButtonLoader size="lg" />
            <p className="text-xs text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <Image src="/png/qc-chat-logo.png" alt="QC Chat" width={36} height={36} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Say hello to start the conversation!
              </p>
            </div>
          </div>
        ) : (
          <div style={{ height: `${messagesVirtualizer.getTotalSize()}px`, position: "relative", width: "100%" }}>
          {messagesVirtualizer.getVirtualItems().map((virtualItem) => {
            const i = virtualItem.index;
            const msg = messages[i];
            const isSystemMsg = msg.senderId === "system";
            const isOwnMessage = msg.senderId === telegramId;
            const consecutive = isConsecutive(i);
            const showDate = shouldShowDateDivider(i);
            const status = isOwnMessage && !isSystemMsg ? getMessageStatus(msg) : null;

            return (
              <div
                key={msg.id}
                className={`absolute top-0 left-0 w-full ${i > 0 ? (consecutive && !showDate ? "pt-0.5" : "pt-2.5") : ""}`}
                style={{ transform: `translateY(${virtualItem.start}px)` }}
                ref={messagesVirtualizer.measureElement}
                data-index={virtualItem.index}
              >
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
                  <div className="flex justify-center py-1.5">
                    <span className="text-[10px] text-muted-foreground bg-muted/40 rounded-full px-3 py-0.5">
                      {msg.text}
                    </span>
                  </div>
                ) : (
                <div
                  ref={(el) => { messageRefs.current[msg.id] = el; }}
                  className={`flex items-start gap-2 ${isOwnMessage ? "justify-end" : "justify-start"} ${reactionPickerMsgId === msg.id ? "relative z-[1000]" : ""}`}
                  style={{ touchAction: "pan-y" }}
                  onContextMenu={(e) => { e.preventDefault(); openReactionPicker(msg.id); }}
                  {...bindMessageGesture(msg)}
                >
                  {!isOwnMessage && !consecutive && (
                    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                      {/* Only show photo in DMs where otherPhoto is the correct sender;
                          in group chats otherPhoto is just one member — use initials instead */}
                      {!isGroupChat && otherPhoto && (
                        <AvatarImage src={otherPhoto} />
                      )}
                      <AvatarFallback className={`${getAvatarColor(resolveSenderName(msg))} text-white text-[10px] font-semibold`}>
                        {getInitials(resolveSenderName(msg))}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {!isOwnMessage && consecutive && <div className="w-7 shrink-0" />}

                  <div className="relative max-w-[75%] group/msg">
                    {/* Hover reply button */}
                    <button
                      onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                      className={`absolute top-1 ${isOwnMessage ? "-left-8" : "-right-8"} z-20 w-6 h-6 rounded-full flex items-center justify-center bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover/msg:opacity-100 transition-opacity`}
                    >
                      <Icon icon="lucide:reply" className="w-3.5 h-3.5" />
                    </button>
                    <div
                      data-bubble
                      className={`relative transition-all duration-200 ${
                        isOwnMessage
                          ? "bg-primary/15 border border-primary/20 rounded-2xl rounded-br-md"
                          : "bg-card border border-border/50 rounded-2xl rounded-bl-md"
                      } ${reactionPickerMsgId === msg.id ? "ring-2 ring-primary/40 scale-[1.02]" : ""} px-2.5 py-1.5`}
                    >
                    {!isOwnMessage && !consecutive && isGroupChat && (
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[11px] font-semibold text-primary">
                          @{resolveSenderName(msg)}
                        </span>
                        {isQcTeamMember(resolveSenderName(msg)) && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 font-bold rounded-sm gap-0.5 shrink-0">
                            <Image src="/svg/logo-white.svg" alt="QC" width={10} height={10} />
                            QC
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Forwarded label */}
                    {msg.forwarded && (
                      <p className="text-[10px] text-muted-foreground italic mb-0.5">
                        Forwarded from @{msg.forwarded.from}
                      </p>
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

                    {msg.type === "voice" && msg.voice ? (
                      <VoiceMessage
                        audioUrl={msg.voice.url}
                        durationSec={msg.voice.durationSec}
                        isMine={isOwnMessage}
                        encrypted={msg.voice.encrypted}
                        participantIds={chatMeta?.participants}
                        chatId={chatId}
                        senderId={msg.senderId}
                        isGroup={chatMeta?.isGroup || chatMeta?.isGlobal}
                        epochNonce={chatMeta?.epochNonces?.[msg.encEpoch ?? 0] ?? (msg.encEpoch === chatMeta?.epochCounter ? chatMeta?.epochNonce : undefined)}
                        epochCounter={msg.encEpoch}
                      />
                    ) : msg.type === "poll" && msg.poll ? (
                      <PollMessage
                        msgId={msg.id}
                        poll={msg.poll}
                        telegramId={telegramId || ""}
                        chatId={chatId}
                        isOwnMessage={isOwnMessage}
                      />
                    ) : msg.type === "file" && msg.file ? (
                      <FileMessage
                        file={msg.file}
                        isMine={isOwnMessage}
                        participantIds={chatMeta?.participants}
                        chatId={chatId}
                        senderId={msg.senderId}
                        isGroup={chatMeta?.isGroup || chatMeta?.isGlobal}
                        epochNonce={chatMeta?.epochNonces?.[msg.encEpoch ?? 0] ?? (msg.encEpoch === chatMeta?.epochCounter ? chatMeta?.epochNonce : undefined)}
                        epochCounter={msg.encEpoch}
                      />
                    ) : msg.type === "transfer" && msg.transfer ? (
                      <TransferMessage
                        amount={msg.transfer.amount}
                        status={msg.transfer.status}
                        txHash={msg.transfer.txHash}
                        isMine={isOwnMessage}
                        isTestnet={isTestnet}
                      />
                    ) : msg.type === "nft_share" && msg.nftShare ? (
                      <NftShareMessage
                        nftAddress={msg.nftShare.nftAddress}
                        nftName={msg.nftShare.nftName}
                        nftImage={msg.nftShare.nftImage}
                        nftPrice={msg.nftShare.nftPrice}
                        collectionName={msg.nftShare.collectionName}
                        isMine={isOwnMessage}
                      />
                    ) : msg.type === "call" && msg.call ? (
                      <CallMessage
                        callId={msg.call.callId}
                        status={msg.call.status}
                        duration={msg.call.duration}
                        callerId={msg.call.callerId}
                        calleeId={msg.call.calleeId}
                        isMine={isOwnMessage}
                        chatId={chatId}
                        remoteUserId={otherParticipantId || ""}
                        remoteName={headerName}
                      />
                    ) : (
                      <span className={`text-[13.5px] leading-[1.4] break-words whitespace-pre-wrap ${
                        msg.text === "Unable to decrypt message" || msg.text === "Old encrypted message" || (msg.encrypted && isEncryptedMessage(msg.text))
                          ? "text-muted-foreground italic"
                          : "text-foreground"
                      }`}>
                        {msg.text === "Unable to decrypt message" || msg.text === "Old encrypted message" || (msg.encrypted && isEncryptedMessage(msg.text))
                          ? `${resolveSenderName(msg)} sent a message`
                          : msg.text}
                      </span>
                    )}
                    {/* Invisible spacer reserves space for time+ticks so they don't overlap text */}
                    <span className={`inline-block ${status ? "w-[4.5rem]" : "w-[3.5rem]"} h-[1px]`} aria-hidden="true" />
                    {/* Time + ticks positioned at bottom-right */}
                    <span className="absolute bottom-[5px] right-[8px] flex items-center gap-0.5">
                      {msg.expiresAt && (
                        <Icon icon="lucide:timer" className="w-2.5 h-2.5 text-muted-foreground/60 shrink-0" />
                      )}
                      <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap leading-none">
                        {formatTime(msg.createdAt)}
                      </span>
                      {status && (
                        <span className={`inline-flex shrink-0 transition-all duration-300 ${status === "read" ? "text-primary" : "text-muted-foreground/60"}`}>
                          {status === "sent" ? (
                            <Icon icon="mdi:check" className="w-[14px] h-[14px]" />
                          ) : (
                            <Icon icon="mdi:check-all" className="w-[14px] h-[14px]" />
                          )}
                        </span>
                      )}
                    </span>
                    </div>

                    {/* Reaction pills */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                        {Object.entries(msg.reactions)
                          .filter(([, users]) => users.length > 0)
                          .map(([emojiKey, users]) => {
                            const emoji = REACTION_EMOJIS.find((e) => e.key === emojiKey);
                            if (!emoji) return null;
                            const iReacted = users.includes(telegramId || "");
                            return (
                              <button
                                key={emojiKey}
                                onClick={() => toggleReaction(msg.id, emojiKey)}
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors ${
                                  iReacted
                                    ? "bg-primary/15 border-primary/30 text-primary"
                                    : "bg-muted/40 border-border/50 text-muted-foreground"
                                }`}
                              >
                                <Icon icon={emoji.icon} className="w-3.5 h-3.5" />
                                <span>{users.length}</span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
                )}
              </div>
            );
          })}
          </div>
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

      {/* Scroll to bottom button */}
      {showScrollDown && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-32 right-4 z-40 w-10 h-10 rounded-full bg-card border border-border/50 shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Icon icon="lucide:chevron-down" className="w-5 h-5 text-muted-foreground" />
        </button>
      )}

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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setReplyTo(null)}
            className="shrink-0 w-7 h-7 rounded-full"
          >
            <Icon icon="lucide:x" className="w-4 h-4 text-muted-foreground" />
          </Button>
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
        ) : isMuted ? (
          <div className="flex items-center justify-center py-2 gap-2">
            <Icon icon="solar:volume-cross-bold" className="w-4 h-4 text-orange-500" />
            <p className="text-xs text-muted-foreground">You are muted in this group</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 relative">
            {isGroupChat && (
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full shrink-0"
                onClick={() => setShowPollCreator(true)}
              >
                <Icon icon="mdi:poll" className="w-5 h-5 text-muted-foreground" />
              </Button>
            )}
            {!isGroupChat && walletAddress && (
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full shrink-0"
                onClick={() => setShowTransferDrawer(true)}
              >
                <Image src="/svg/ton-logo.svg" alt="TON" width={20} height={20} className="opacity-60" />
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleSendFile(file);
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-full shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSendingFile}
            >
              {isSendingFile ? (
                <ButtonLoader size="sm" />
              ) : (
                <Icon icon="solar:paperclip-linear" className="w-5 h-5 text-muted-foreground" />
              )}
            </Button>
            <Input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={replyTo ? "Reply..." : "Type a message..."}
              maxLength={500}
              className="flex-1 rounded-full px-4 py-2.5 h-auto bg-background border-border/50 text-base placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary/40"
            />
            {newMessage.trim() ? (
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || isSending}
                size="icon"
                className="w-10 h-10 rounded-full shrink-0 shadow-lg shadow-primary/20"
              >
                {isSending ? (
                  <ButtonLoader size="sm" />
                ) : (
                  <Icon icon="material-symbols:send-rounded" className="w-5 h-5" />
                )}
              </Button>
            ) : (
              <VoiceRecorder onSend={handleSendVoice} disabled={isSending} />
            )}
          </div>
        )}
      </div>

      <PollCreator
        open={showPollCreator}
        onOpenChange={setShowPollCreator}
        onCreatePoll={handleCreatePoll}
      />

      {!isGroupChat && chatMeta && (
        <TransferDrawer
          open={showTransferDrawer}
          onOpenChange={setShowTransferDrawer}
          recipientName={chatMeta.participantNames[chatMeta.participants.find((p) => p !== telegramId) || ""] || "Unknown"}
          recipientAddress={recipientWalletAddress}
          onSend={handleSendTransfer}
          onFailed={handleTransferFailed}
        />
      )}
    </div>
    </>
  );
}
