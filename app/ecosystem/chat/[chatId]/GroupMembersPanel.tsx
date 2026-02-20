"use client";

import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface ChatMeta {
  participants: string[];
  participantNames: Record<string, string>;
  isGroup: boolean;
  isGlobal?: boolean;
  groupName?: string;
  joinCode?: string;
  createdBy?: string;
  bannedUsers?: string[];
  mutedUsers?: string[];
}

interface GroupMembersPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  chatMeta: ChatMeta;
  currentUserId: string;
  onAction: (action: "kick" | "ban" | "mute" | "unmute", userId: string) => void;
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

export default function GroupMembersPanel({
  open,
  onOpenChange,
  chatMeta,
  currentUserId,
  onAction,
}: GroupMembersPanelProps) {
  const isAdmin = chatMeta.createdBy === currentUserId;
  const mutedSet = new Set(chatMeta.mutedUsers || []);
  const bannedList = chatMeta.bannedUsers || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 flex flex-col">
        <SheetHeader
          className="px-4 pb-3"
          style={{ paddingTop: "calc(var(--tg-safe-area-inset-top, 0px) + var(--tg-content-safe-area-inset-top, 0px) + 1.25rem)" }}
        >
          <SheetTitle className="text-base">Members</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {chatMeta.participants.length} member{chatMeta.participants.length !== 1 ? "s" : ""}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {chatMeta.participants.map((userId) => {
            const name = chatMeta.participantNames[userId] || "Unknown";
            const isCreator = userId === chatMeta.createdBy;
            const isSelf = userId === currentUserId;
            const isMuted = mutedSet.has(userId);

            return (
              <div
                key={userId}
                className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={`${getAvatarColor(name)} text-white text-[10px] font-semibold`}>
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">
                      @{name}
                    </span>
                    {isCreator && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-semibold rounded-md">
                        Admin
                      </Badge>
                    )}
                    {isMuted && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-semibold rounded-md text-orange-500 border-orange-500/30">
                        Muted
                      </Badge>
                    )}
                    {isSelf && (
                      <span className="text-[10px] text-muted-foreground">you</span>
                    )}
                  </div>
                </div>

                {/* Admin actions — only for admin, not on self or other admins */}
                {isAdmin && !isSelf && !isCreator && (
                  <div className="flex items-center gap-1 shrink-0">
                    {isMuted ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-full"
                        title="Unmute"
                        onClick={() => onAction("unmute", userId)}
                      >
                        <Icon icon="solar:microphone-large-bold" className="w-4 h-4 text-green-500" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-full"
                        title="Mute"
                        onClick={() => onAction("mute", userId)}
                      >
                        <Icon icon="solar:microphone-large-cross-bold" className="w-4 h-4 text-orange-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 rounded-full"
                      title="Kick"
                      onClick={() => onAction("kick", userId)}
                    >
                      <Icon icon="solar:user-minus-bold" className="w-4 h-4 text-yellow-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 rounded-full"
                      title="Ban"
                      onClick={() => onAction("ban", userId)}
                    >
                      <Icon icon="solar:shield-cross-bold" className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Banned users section */}
        {isAdmin && bannedList.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Banned ({bannedList.length})
              </p>
              <div className="space-y-1">
                {bannedList.map((userId) => {
                  const name = chatMeta.participantNames[userId] || userId;
                  return (
                    <div key={userId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
                      <Icon icon="solar:shield-cross-bold" className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        @{name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
