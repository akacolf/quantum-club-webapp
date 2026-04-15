"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import type { Timestamp } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import {
  useBroadcastByHandle,
  useBroadcastSubscribers,
  useIsBroadcastAdmin,
  type BroadcastSubscriberRow,
} from "@/app/(hooks)/queries/use-broadcasts";

function getInitials(s: string): string {
  return s
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRelative(ts: Timestamp | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts.toDate().getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return ts.toDate().toLocaleDateString();
}

export default function BroadcastSubscribersPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const router = useRouter();
  useTelegramBackButton(
    `/ecosystem/broadcasts/${handle}/manage` as Route,
  );

  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;

  const { data: broadcast } = useBroadcastByHandle(handle);
  const { data: isAdmin, isLoading: isAdminLoading } = useIsBroadcastAdmin(
    broadcast?.id ?? null,
    qcId,
  );
  const { data: subscribers } = useBroadcastSubscribers(broadcast?.id ?? null);

  // Redirect non-admins
  useEffect(() => {
    if (broadcast && !isAdminLoading && isAdmin === false) {
      toast.error("You are not an admin of this broadcast");
      router.replace(`/ecosystem/broadcasts/${handle}` as Route);
    }
  }, [broadcast, isAdmin, isAdminLoading, handle, router]);

  if (broadcast === undefined || isAdminLoading) {
    return (
      <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto space-y-3">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!broadcast || isAdmin === false) return null;

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:users" className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Subscribers</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {broadcast.subscriberCount === 0
            ? "No one has subscribed yet"
            : `${broadcast.subscriberCount.toLocaleString()} total`}
        </p>
      </header>

      {subscribers === undefined ? (
        <SubscribersSkeleton />
      ) : subscribers.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {subscribers.map((row) => (
            <SubscriberRow key={row.qcId} row={row} />
          ))}
          {broadcast.subscriberCount > subscribers.length && (
            <p className="text-center text-[11px] text-muted-foreground pt-4">
              Showing most recent {subscribers.length} of{" "}
              {broadcast.subscriberCount.toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SubscriberRow({ row }: { row: BroadcastSubscriberRow }) {
  const display = row.username ?? `qc-${row.qcId.slice(0, 6)}`;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111] border border-[#222]">
      <Avatar className="w-10 h-10 shrink-0">
        {row.profilePhotoUrl ? (
          <AvatarImage src={row.profilePhotoUrl} alt={display} />
        ) : null}
        <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
          {getInitials(display)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {row.username ? `@${row.username}` : display}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          Subscribed {formatRelative(row.subscribedAt)}
          {row.muted ? " · muted" : ""}
        </p>
      </div>
      {row.muted && (
        <Icon
          icon="lucide:bell-off"
          className="w-4 h-4 text-muted-foreground/60 shrink-0"
          aria-label="Muted"
        />
      )}
    </div>
  );
}

function SubscribersSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111] border border-[#222]"
        >
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon
        icon="lucide:users"
        className="w-10 h-10 text-muted-foreground/50 mb-2"
      />
      <p className="text-sm font-semibold text-white">No subscribers yet</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
        Publish a few posts and share the handle — subscribers will appear here.
      </p>
    </div>
  );
}
