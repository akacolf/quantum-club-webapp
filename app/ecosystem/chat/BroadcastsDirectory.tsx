"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Skeleton } from "@/components/ui/skeleton";
import { haptics } from "@/lib/haptics";
import { useAuth } from "@/app/(contexts)/auth";
import {
  useBroadcastsDiscovery,
  useMyBroadcastSubscriptions,
} from "@/app/(hooks)/queries/use-broadcasts";
import { BROADCAST_TABS, type BroadcastTab } from "@/lib/validations";
import { BroadcastCard } from "@/app/ecosystem/broadcasts/_components/BroadcastCard";

export default function BroadcastsDirectory() {
  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;

  const [view, setView] = useQueryState<BroadcastTab>(
    "broadcastsView",
    parseAsStringEnum<BroadcastTab>([...BROADCAST_TABS])
      .withDefault("explore")
      .withOptions({ history: "replace" }),
  );

  // Keep both listeners attached regardless of which pill is active so
  // switching tabs is instant (no skeleton flash, no double-tap issue
  // from the empty queryFn placeholder flashing before the snapshot).
  const explore = useBroadcastsDiscovery();
  const following = useMyBroadcastSubscriptions(qcId);

  const data = view === "following" ? following.data : explore.data;

  return (
    <div className="px-4 pt-3 pb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-white">Broadcasts</p>
          <p className="text-[11px] text-muted-foreground">
            One-way feeds from verified creators
          </p>
        </div>
        <Link
          href="/ecosystem/broadcasts/apply"
          prefetch
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold hover:bg-primary/25 transition-colors"
        >
          <Icon icon="lucide:plus" className="w-3 h-3" />
          Apply
        </Link>
      </div>

      {/* Explore | Following pills */}
      <div className="flex gap-1 p-0.5 rounded-lg bg-muted/30 mb-3">
        {(["explore", "following"] as const).map((v) => {
          const active = view === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => {
                if (view !== v) haptics.light();
                setView(v);
              }}
              className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                icon={
                  v === "explore"
                    ? "solar:compass-bold"
                    : "solar:bell-bold"
                }
                className="w-3.5 h-3.5"
              />
              {v === "explore" ? "Explore" : "Following"}
            </button>
          );
        })}
      </div>

      {data === undefined ? (
        <DirectorySkeleton />
      ) : data.length === 0 ? (
        <EmptyState view={view} />
      ) : (
        <div className="space-y-2">
          {data.map((b) => (
            <BroadcastCard key={b.id} broadcast={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ view }: { view: BroadcastTab }) {
  const isFollowing = view === "following";
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon
        icon={
          isFollowing
            ? "solar:bell-off-linear"
            : "solar:radio-minimalistic-linear"
        }
        className="w-10 h-10 text-muted-foreground/60 mb-2"
      />
      <p className="text-sm font-semibold text-white">
        {isFollowing ? "Not following any broadcasts" : "No broadcasts yet"}
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
        {isFollowing
          ? "Subscribe to a broadcast to see it here."
          : "Verified broadcasts will appear here once approved."}
      </p>
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111] border border-[#222]"
        >
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
