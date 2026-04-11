"use client";

import { Icon } from "@iconify/react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useUserProfile } from "@/app/(hooks)/queries/use-user-profile";
import { useQcUsernameQuery } from "@/app/(hooks)/queries/use-qc-username";
import { useUserRank } from "@/app/(hooks)/queries/use-user-rank";
import { useProfilePhoto } from "@/app/(hooks)/useProfilePhoto";
import { isQcTeamMember } from "@/lib/qc-team";
import { toast } from "sonner";

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

interface UserProfilePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  fallbackName?: string;
  currentUserId: string | null;
  onSendTon: (address: string, name: string) => void;
}

/**
 * Tappable user profile popover shown on username/avatar tap in chat.
 * Shows identity-only info (name, rank, member since) — NO wallet balance or
 * portfolio data, since that would be a privacy leak. The wallet address is
 * shown for convenience (addresses are already public on-chain) and to drive
 * the Send TON action.
 */
export default function UserProfilePopover({
  open,
  onOpenChange,
  userId,
  fallbackName,
  currentUserId,
  onSendTon,
}: UserProfilePopoverProps) {
  const isSelf = !!userId && userId === currentUserId;

  // Profile (display name + join date — join date only available for self
  // because user/{id} is self-read only; hidden when absent)
  const { data: profile, isLoading: profileLoading } = useUserProfile(userId || undefined);
  const profilePhoto = useProfilePhoto(userId);

  // Wallet address via qc-usernames collection
  const { data: usernameData, isLoading: usernameLoading } = useQcUsernameQuery(userId);
  const walletAddress = usernameData?.address ?? null;

  // Rank from userRanks/{userId} (per-user document, authed read allowed)
  const { data: rank, isLoading: rankLoading } = useUserRank(open ? userId : null);

  const displayName =
    profile?.displayName ||
    usernameData?.username ||
    fallbackName ||
    "Unknown";
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);
  const isTeam = isQcTeamMember(displayName);

  const handleCopyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    toast.success("Address copied");
  };

  const handleSendTon = () => {
    if (!walletAddress) return;
    onSendTon(walletAddress, displayName);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="sr-only">User Profile</DrawerTitle>
          <DrawerDescription className="sr-only">
            Profile information for {displayName}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4">
          {/* Profile header */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              {profilePhoto ? (
                <>
                  <AvatarImage src={profilePhoto} alt={displayName} />
                  <AvatarFallback className={`${avatarColor} text-white font-bold text-2xl`}>
                    {initials}
                  </AvatarFallback>
                </>
              ) : (
                <AvatarFallback className={`${avatarColor} text-white font-bold text-2xl`}>
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex items-center gap-1.5">
              {profileLoading && !fallbackName ? (
                <Skeleton className="h-5 w-28 rounded" />
              ) : (
                <h2 className="text-lg font-bold text-foreground">@{displayName}</h2>
              )}
              {isTeam && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold rounded gap-0.5">
                  <Image src="/svg/logo-white.svg" alt="QC" width={10} height={10} />
                  QC
                </Badge>
              )}
            </div>
            {profile?.memberSince && (
              <p className="text-[11px] text-muted-foreground">
                Member since {profile.memberSince}
              </p>
            )}
          </div>

          {/* Leaderboard rank */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Icon icon="solar:cup-star-bold" className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                Leaderboard Rank
              </p>
              {rankLoading ? (
                <Skeleton className="h-4 w-16 rounded mt-0.5" />
              ) : rank ? (
                <p className="text-sm font-bold text-foreground">#{rank.toLocaleString()}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Unranked</p>
              )}
            </div>
          </div>

          {/* Wallet address — addresses are public on-chain, safe to show */}
          {walletAddress ? (
            <button
              onClick={handleCopyAddress}
              className="w-full flex items-center gap-2 bg-muted/30 border border-border/50 rounded-xl p-3 hover:bg-muted/50 transition-colors text-left"
            >
              <Icon icon="solar:wallet-bold" className="w-4 h-4 text-primary shrink-0" />
              <code className="text-[11px] text-muted-foreground truncate flex-1">
                {walletAddress.slice(0, 6)}…{walletAddress.slice(-6)}
              </code>
              <Icon icon="solar:copy-linear" className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          ) : usernameLoading ? (
            <Skeleton className="h-11 w-full rounded-xl" />
          ) : null}

          {/* Send TON action */}
          {!isSelf && walletAddress && (
            <Button
              onClick={handleSendTon}
              className="w-full h-11 rounded-full font-semibold shadow-lg shadow-primary/20"
            >
              <Image src="/svg/ton-logo.svg" alt="TON" width={16} height={16} className="mr-1.5" />
              Send TON
            </Button>
          )}
          {!isSelf && !walletAddress && !usernameLoading && (
            <div className="text-center py-2">
              <p className="text-[11px] text-muted-foreground">
                This user hasn&apos;t linked a wallet yet
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
