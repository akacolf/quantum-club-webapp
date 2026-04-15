"use client";

import { parseAsStringEnum, useQueryState } from "nuqs";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import {
  useBroadcastsDiscovery,
  useMyBroadcastSubscriptions,
} from "@/app/(hooks)/queries/use-broadcasts";
import { BROADCAST_TABS, type BroadcastTab } from "@/lib/validations";
import { BroadcastCard } from "./_components/BroadcastCard";

export default function BroadcastsDiscoveryPage() {
  useTelegramBackButton("/ecosystem/chat");

  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;

  const [tab, setTab] = useQueryState<BroadcastTab>(
    "tab",
    parseAsStringEnum<BroadcastTab>([...BROADCAST_TABS])
      .withDefault("explore")
      .withOptions({ history: "replace" }),
  );

  const explore = useBroadcastsDiscovery(tab === "explore");
  const following = useMyBroadcastSubscriptions(qcId, tab === "following");

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Broadcasts</h1>
          <p className="text-sm text-muted-foreground">
            One-way feeds from verified creators
          </p>
        </div>
        <Link
          href="/ecosystem/broadcasts/apply"
          prefetch
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors"
        >
          <Icon icon="lucide:plus" className="w-3.5 h-3.5" />
          Apply
        </Link>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as BroadcastTab)}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="explore">Explore</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="mt-4 space-y-2">
          {explore.data === undefined ? (
            <BroadcastListSkeleton />
          ) : explore.data.length === 0 ? (
            <EmptyState
              icon="solar:radio-minimalistic-linear"
              title="No broadcasts yet"
              description="Verified broadcasts will appear here soon."
            />
          ) : (
            explore.data.map((b) => <BroadcastCard key={b.id} broadcast={b} />)
          )}
        </TabsContent>

        <TabsContent value="following" className="mt-4 space-y-2">
          {!qcId ? (
            <EmptyState
              icon="lucide:user-x"
              title="Sign in required"
              description="Log in to see the broadcasts you follow."
            />
          ) : following.data === undefined ? (
            <BroadcastListSkeleton />
          ) : following.data.length === 0 ? (
            <EmptyState
              icon="solar:bell-off-linear"
              title="Not following anyone yet"
              description="Follow a broadcast to see it here."
            />
          ) : (
            following.data.map((b) => (
              <BroadcastCard key={b.id} broadcast={b} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BroadcastListSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
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
    </>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon icon={icon} className="w-12 h-12 text-muted-foreground/60 mb-3" />
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-[260px]">
        {description}
      </p>
    </div>
  );
}
