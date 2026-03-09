"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useProfilePhotos } from "@/app/(hooks)/useProfilePhoto";
import { useQcUsernamesBatch } from "@/app/(hooks)/queries/use-qc-username";
import { dbfs } from "@/app/(firebase)/client";
import { doc, onSnapshot, updateDoc, Timestamp } from "firebase/firestore";
import Image from "next/image";
import Loader from "@/app/(components)/Loader";
import { isQcTeamMember } from "@/lib/qc-team";

interface ChatMeta {
  participants: string[];
  participantNames: Record<string, string>;
  isGroup: boolean;
  isGlobal?: boolean;
  groupName?: string;
  createdBy?: string;
  createdAt?: Timestamp;
  bannedUsers?: string[];
  mutedUsers?: string[];
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

export default function GroupInfoPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;
  const { telegramId } = useUserContext();

  const [chatMeta, setChatMeta] = useState<ChatMeta | null>(null);
  const [loading, setLoading] = useState(true);

  // Telegram back button → go back to the chat
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    const handleBack = () => {
      try { router.back(); } catch { window.history.back(); }
    };
    tg?.BackButton.show();
    tg?.BackButton.onClick(handleBack);
    return () => {
      tg?.BackButton.offClick(handleBack);
      tg?.BackButton.hide();
    };
  }, [router]);

  // Subscribe to chat metadata (real-time so member changes reflect)
  useEffect(() => {
    if (!chatId) return;
    const ref = doc(dbfs, "qc-chats", chatId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setChatMeta(snap.data() as ChatMeta);
      }
      setLoading(false);
    }, () => {
      setLoading(false);
    });
    return () => unsub();
  }, [chatId]);

  // Resolve "Unknown" participant names via batch query
  const participantNames = chatMeta?.participantNames;
  const unknownUids = (() => {
    if (!participantNames) return [];
    return Object.entries(participantNames)
      .filter(([, name]) => name === "Unknown")
      .map(([uid]) => uid);
  })();

  const batchUsernamesQuery = useQcUsernamesBatch(unknownUids);
  const batchData = batchUsernamesQuery.data;

  // Merge resolved usernames at render time (no setState needed)
  const resolvedNames = (() => {
    if (!participantNames) return {} as Record<string, string>;
    if (!batchData || Object.keys(batchData).length === 0) return participantNames;
    return { ...participantNames, ...batchData };
  })();

  // Persist resolved names to Firestore (external system sync only)
  useEffect(() => {
    if (!batchData || !chatId || Object.keys(batchData).length === 0) return;
    const chatRef = doc(dbfs, "qc-chats", chatId);
    const firestoreUpdates: Record<string, string> = {};
    for (const [uid, name] of Object.entries(batchData)) {
      firestoreUpdates[`participantNames.${uid}`] = name;
    }
    updateDoc(chatRef, firestoreUpdates).catch(() => {});
  }, [batchData, chatId]);

  // Prefetch user profile routes
  useEffect(() => {
    if (!chatMeta) return;
    for (const uid of chatMeta.participants) {
      if (uid !== telegramId) {
        router.prefetch(`/user/${uid}`);
      }
    }
  }, [chatMeta, telegramId, router]);

  // Fetch profile photos for all members
  const memberIds = chatMeta?.participants || [];
  const photos = useProfilePhotos(memberIds);

  if (loading) {
    return <Loader />;
  }

  if (!chatMeta || !chatMeta.isGroup) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Group not found</p>
      </div>
    );
  }

  const groupName = chatMeta.groupName || "Group";
  const createdAt = chatMeta.createdAt
    ? chatMeta.createdAt.toDate().toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="p-4 pt-8 space-y-6">
        {/* Group Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center space-y-3"
        >
          <Avatar className="h-20 w-20 border-2 border-white/10">
            {chatMeta.isGlobal ? (
              <AvatarImage src="/png/qc-global-logo.png" alt="QC Global" />
            ) : null}
            <AvatarFallback className={`${getAvatarColor(groupName)} text-white font-bold text-3xl`}>
              {getInitials(groupName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold text-foreground text-center">{groupName}</h1>
            {chatMeta.isGlobal && (
              <Icon icon="solar:verified-check-bold" className="w-5 h-5 text-primary shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon icon="solar:users-group-rounded-bold" className="w-4 h-4" />
            {chatMeta.participants.length} members
          </div>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          {chatMeta.createdBy && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon icon="solar:crown-bold" className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Created By</p>
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-white text-sm">
                    @{resolvedNames[chatMeta.createdBy] || "Unknown"}
                  </p>
                  {isQcTeamMember(resolvedNames[chatMeta.createdBy]) && (
                    <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 font-bold rounded-sm gap-0.5 shrink-0">
                      <Image src="/png/qc-global-logo.png" alt="QC" width={10} height={10} className="rounded-full" />
                      QC
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {createdAt && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon icon="solar:calendar-bold" className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Created</p>
                <p className="font-bold text-white text-sm">{createdAt}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Members List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="text-lg font-semibold text-foreground">Members</h2>
          <div className="space-y-2">
            {chatMeta.participants.map((uid) => {
              const name = resolvedNames[uid] || "Unknown";
              const isCreator = uid === chatMeta.createdBy;
              const isSelf = uid === telegramId;
              const photo = photos[uid];

              return (
                <div
                  key={uid}
                  className={`bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between transition-all active:scale-[0.98]${!isSelf ? " cursor-pointer" : ""}`}
                  onClick={() => {
                    if (!isSelf) router.push(`/user/${uid}`);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border border-white/10">
                      {photo && <AvatarImage src={photo} alt={name} />}
                      <AvatarFallback className={`${getAvatarColor(name)} text-white text-xs font-semibold`}>
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-white text-sm">@{name}</p>
                        {isQcTeamMember(name) && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 font-bold rounded-sm gap-0.5 shrink-0">
                                  <Image src="/png/qc-global-logo.png" alt="QC" width={10} height={10} className="rounded-full" />
                            QC
                          </Badge>
                        )}
                        {isCreator && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-semibold rounded-md">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                        {isSelf ? "You" : isCreator ? "Creator" : "Member"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
