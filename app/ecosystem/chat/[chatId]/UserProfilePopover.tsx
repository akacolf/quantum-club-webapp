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
import { useWalletAssetsQuery } from "@/app/(hooks)/queries/use-wallet";
import { useLeaderboardQuery } from "@/app/(hooks)/queries/use-leaderboard";
import { useProfilePhoto } from "@/app/(hooks)/useProfilePhoto";
import { useWallet } from "@/app/wallet/WalletContext";
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

function formatBalance(raw: string, decimals: number, maxFraction = 2): string {
  const num = parseFloat(raw) / Math.pow(10, decimals);
  if (!Number.isFinite(num)) return "0";
  if (num < 0.01 && num > 0) return "<0.01";
  return num.toLocaleString(undefined, { maximumFractionDigits: maxFraction });
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
 * Fetches: profile, wallet address, balance, jetton holdings, leaderboard rank.
 * Shows a "Send TON" action when viewing another user's profile.
 */
export default function UserProfilePopover({
  open,
  onOpenChange,
  userId,
  fallbackName,
  currentUserId,
  onSendTon,
}: UserProfilePopoverProps) {
  const { isTestnet } = useWallet();
  const isSelf = !!userId && userId === currentUserId;

  // Profile (display name + join date)
  const { data: profile, isLoading: profileLoading } = useUserProfile(userId || undefined);
  const profilePhoto = useProfilePhoto(userId);

  // Wallet address via qc-usernames collection
  const { data: usernameData, isLoading: usernameLoading } = useQcUsernameQuery(userId);
  const walletAddress = usernameData?.address ?? null;

  // Wallet balance + jettons (only when we have an address and the drawer is open)
  const { data: walletData, isLoading: walletLoading } = useWalletAssetsQuery(
    open && walletAddress ? walletAddress : "",
    isTestnet,
    false, // no auto-refetch — profile view is ephemeral
  );

  // Rank from leaderboard (uses first page only — rank is returned on every page)
  const { data: leaderboardData, isLoading: rankLoading } = useLeaderboardQuery(
    open ? userId : null,
  );
  const rank = leaderboardData?.pages?.[0]?.rank ?? null;

  const displayName =
    profile?.displayName ||
    usernameData?.username ||
    fallbackName ||
    "Unknown";
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);
  const isTeam = isQcTeamMember(displayName);

  // Top 3 jettons by USD value
  const topJettons = walletData?.jettons
    ?.slice()
    .sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))
    .slice(0, 3) ?? [];

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

          {/* Stats row: rank + balance */}
          <div className="grid grid-cols-2 gap-2">
            {/* Leaderboard rank */}
            <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon icon="solar:cup-star-bold" className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Rank
                </p>
                {rankLoading ? (
                  <Skeleton className="h-4 w-12 rounded" />
                ) : rank ? (
                  <p className="text-sm font-bold text-foreground">#{rank}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>

            {/* TON balance */}
            <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Image src="/svg/ton-logo.svg" alt="TON" width={16} height={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Balance
                </p>
                {usernameLoading || walletLoading ? (
                  <Skeleton className="h-4 w-16 rounded" />
                ) : walletData ? (
                  <p className="text-sm font-bold text-foreground truncate">
                    {walletData.tonBalance} TON
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>
          </div>

          {/* Wallet address */}
          {walletAddress && (
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
          )}

          {/* Top holdings */}
          {topJettons.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 px-1">
                Top Holdings
              </p>
              <div className="space-y-1.5">
                {topJettons.map((jetton) => (
                  <div
                    key={jetton.jettonAddress || jetton.symbol}
                    className="flex items-center gap-2 bg-muted/30 border border-border/50 rounded-xl p-2.5"
                  >
                    {jetton.image ? (
                      <Image
                        src={jetton.image}
                        alt={jetton.symbol}
                        width={24}
                        height={24}
                        className="rounded-full shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-muted-foreground">
                          {jetton.symbol.slice(0, 2)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {jetton.symbol}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {formatBalance(jetton.balance, jetton.decimals)} {jetton.symbol}
                      </p>
                    </div>
                    {jetton.usdValue !== undefined && jetton.usdValue > 0 && (
                      <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                        ${jetton.usdValue.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
