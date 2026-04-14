"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { dbfs } from "@/app/(firebase)/client";
import {
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { GROUP_CATEGORIES, type GroupCategory } from "@/lib/validations";
import { usePublicGroupsQuery, type PublicGroup } from "@/app/(hooks)/queries/use-public-groups";
import { toast } from "sonner";
import { type Timestamp } from "firebase/firestore";

const CATEGORY_FILTER_VALUES = ["All", ...GROUP_CATEGORIES] as const;
type CategoryFilter = (typeof CATEGORY_FILTER_VALUES)[number];

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

function formatActivity(ts: Timestamp | null): string {
  if (!ts) return "no activity";
  const diff = Date.now() - ts.toDate().getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "active now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

interface GroupDirectoryProps {
  telegramId: string | null;
  qcUsername: string | null;
}

export default function GroupDirectory({ telegramId, qcUsername }: GroupDirectoryProps) {
  const router = useRouter();
  const [category, setCategory] = useQueryState<CategoryFilter>(
    "cat",
    parseAsStringEnum<CategoryFilter>([...CATEGORY_FILTER_VALUES])
      .withDefault("All")
      .withOptions({ history: "replace" }),
  );
  const [searchQuery, setSearchQuery] = useQueryState("dq", { defaultValue: "", history: "replace" });
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const { data: groups = [], isLoading } = usePublicGroupsQuery(category);

  const filteredGroups = groups.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.groupName.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.linkedTokenSymbol?.toLowerCase().includes(q)
    );
  });

  const handleJoin = async (group: PublicGroup) => {
    if (!telegramId || !qcUsername) {
      toast.error("Sign in to join groups");
      return;
    }
    if (group.bannedUsers.includes(telegramId)) {
      toast.error("You are banned from this group");
      return;
    }
    if (group.participants.includes(telegramId)) {
      router.push(`/ecosystem/chat/${group.id}`);
      return;
    }

    setJoiningId(group.id);
    try {
      const selfDisplayName = qcUsername.replace(/^@+/, "").trim() || "Unknown";
      await updateDoc(doc(dbfs, "qc-chats", group.id), {
        participants: arrayUnion(telegramId),
        [`participantNames.${telegramId}`]: selfDisplayName,
        memberCount: increment(1),
        lastMessage: `${selfDisplayName} joined the group`,
        lastMessageBy: "system",
        lastMessageAt: serverTimestamp(),
      });
      router.push(`/ecosystem/chat/${group.id}`);
    } catch (err) {
      console.error("Failed to join group:", err);
      toast.error("Could not join group");
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Icon
            icon="lucide:search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search public groups..."
            className="w-full h-9 rounded-full bg-muted/40 border border-border/50 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="px-4 pb-2 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 min-w-max">
          {CATEGORY_FILTER_VALUES.map((cat) => {
            const active = cat === category;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors shrink-0 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Group list */}
      <div className="flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-primary">
            <ButtonLoader size="lg" />
            <p className="text-xs text-muted-foreground">Loading groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center">
              <Icon icon="solar:users-group-rounded-bold" className="w-7 h-7 text-muted-foreground/60" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No public groups</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                {searchQuery
                  ? "Try a different search term"
                  : category === "All"
                  ? "Be the first to create a public group!"
                  : `No public groups in ${category} yet`}
              </p>
            </div>
          </div>
        ) : (
          <div className="px-2">
            {filteredGroups.map((group) => {
              const isMember = telegramId ? group.participants.includes(telegramId) : false;
              const isJoining = joiningId === group.id;
              const initials = getInitials(group.groupName);
              const avatarColor = getAvatarColor(group.groupName);

              return (
                <div
                  key={group.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/30 transition-colors"
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback className={`${avatarColor} text-white text-sm font-semibold`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {group.groupName}
                      </p>
                      {group.linkedTokenSymbol && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold rounded shrink-0">
                          ${group.linkedTokenSymbol}
                        </Badge>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Icon icon="solar:users-group-two-rounded-bold" className="w-3 h-3" />
                        {group.memberCount}
                      </span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatActivity(group.lastMessageAt)}
                      </span>
                      {group.category && (
                        <>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] text-muted-foreground">{group.category}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoin(group)}
                    disabled={isJoining}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                      isMember
                        ? "bg-muted/50 text-muted-foreground hover:bg-muted/70"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    } disabled:opacity-50`}
                  >
                    {isJoining ? <ButtonLoader size="sm" /> : isMember ? "Open" : "Join"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
