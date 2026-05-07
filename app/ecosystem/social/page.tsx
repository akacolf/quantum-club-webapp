"use client";

import { useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useDrag } from "@use-gesture/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PullToRefresh } from "@/app/(components)/PullToRefresh";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import {
  useDiscoverFeed,
  useFollowingFeed,
  useForYouFeed,
  useSocialProfile,
} from "@/app/(hooks)/queries/use-social";
import { SOCIAL_FEED_TABS, type SocialFeedTab } from "@/lib/validations";
import { haptics } from "@/lib/haptics";
import { FeedTabs } from "./_components/FeedTabs";
import { PostFeed } from "./_components/PostFeed";
import { EmptyState } from "./_components/EmptyState";
import { ComposeFab } from "./_components/ComposeFab";
import { useEnsureSocialProfile } from "./_components/use-ensure-profile";
import { isProActive } from "./_components/VerifiedBadge";

export default function SocialFeedPage() {
  useTelegramBackButton("/home");
  const { currentUser, authLoading } = useAuth();
  const qcId = currentUser?.uid ?? null;

  const { data: myProfile } = useSocialProfile(qcId);

  const [tab, setTab] = useQueryState<SocialFeedTab>(
    "tab",
    parseAsStringEnum<SocialFeedTab>([...SOCIAL_FEED_TABS])
      .withDefault("forYou")
      .withOptions({ history: "replace" }),
  );

  const discover = useDiscoverFeed();
  const followingFeed = useFollowingFeed(qcId);
  const forYouFeed = useForYouFeed(qcId);

  // Auto-onboard once auth is settled and we've confirmed the user has no
  // social profile yet. Server-side action mints a profile from their existing
  // QC username + profile photo so they don't have to claim a handle.
  const { missingQcUsername } = useEnsureSocialProfile(
    !authLoading && currentUser ? qcId : null,
    myProfile,
  );

  const isPro = isProActive(myProfile);
  const queryClient = useQueryClient();

  // Pull-to-refresh handler. Feeds are already live via Firestore listeners,
  // so "refresh" here means: invalidate all social caches so any stale
  // sub-queries (taste, affinity) re-run, plus a small delay so the user
  // sees the indicator complete a cycle.
  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["social"] }),
      new Promise((r) => setTimeout(r, 400)),
    ]);
  };

  // Swipe-to-switch between feed tabs. Distance threshold dominates over
  // velocity so a deliberate horizontal drag wins, while a vertical scroll
  // never accidentally triggers a tab change.
  const swipeRef = useRef<HTMLDivElement>(null);
  useDrag(
    ({ swipe: [sx], movement: [mx, my], last }) => {
      if (!last) return;
      const horizontal = sx !== 0 || (Math.abs(mx) > 60 && Math.abs(mx) > Math.abs(my));
      if (!horizontal) return;
      const dir = sx !== 0 ? sx : Math.sign(mx);
      const idx = SOCIAL_FEED_TABS.indexOf(tab);
      const next = SOCIAL_FEED_TABS[idx - dir];
      if (next && next !== tab) {
        haptics.light();
        setTab(next);
      }
    },
    { target: swipeRef, axis: "lock", filterTaps: true, eventOptions: { passive: true } },
  );

  const renderTab = () => {
    if (tab === "discover") {
      return (
        <PostFeed
          posts={discover.data}
          qcId={qcId}
          emptyState={
            <EmptyState
              icon="solar:compass-linear"
              title="Nothing here yet"
              description="Be the first — write the first post on QC Social."
              action={
                <Link href={"/ecosystem/social/compose" as Route}>
                  <Button size="sm" className="rounded-full">
                    Write a post
                  </Button>
                </Link>
              }
            />
          }
        />
      );
    }
    if (tab === "following") {
      return (
        <PostFeed
          posts={followingFeed.isLoading ? undefined : followingFeed.posts}
          qcId={qcId}
          emptyState={
            <EmptyState
              icon="solar:users-group-rounded-linear"
              title="Nothing from your follows yet"
              description="Follow some people on the discover tab and their posts will land here."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => setTab("discover")}
                >
                  Open discover
                </Button>
              }
            />
          }
        />
      );
    }
    return (
      <PostFeed
        posts={forYouFeed.isLoading ? undefined : forYouFeed.posts}
        qcId={qcId}
        emptyState={
          <EmptyState
            icon="solar:stars-bold-duotone"
            title="Your feed is loading"
            description="Follow more people to see your personalized feed."
          />
        }
      />
    );
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold">QC Social</h1>
        <div className="flex items-center gap-3">
          <Link
            href={"/ecosystem/social/pro" as Route}
            className="text-sm font-semibold text-white px-2 py-1"
          >
            {isPro ? "Pro" : "Upgrade"}
          </Link>
          <Link
            href={"/ecosystem/social/search" as Route}
            className="p-1 -mr-1"
            aria-label="Search"
          >
            <Icon icon="lucide:search" className="w-6 h-6" />
          </Link>
        </div>
      </header>

      <FeedTabs tab={tab} onChange={setTab} />

      {missingQcUsername && (
        <div className="px-4 py-3 bg-secondary/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold">Set up your QC profile</p>
              <p className="text-xs text-muted-foreground">
                Pick a QC username and add a photo so people can find you on
                QC Social.
              </p>
            </div>
            <Link href={"/home/profile" as Route}>
              <Button size="sm" className="rounded-full">
                Set up
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Make the swipe target fill the visible area below the header + tabs
          so left/right swipes register even on tabs whose feed is short.
          touch-pan-y lets vertical scroll keep working. */}
      <div ref={swipeRef} className="touch-pan-y min-h-[70vh]">
        <PullToRefresh onRefresh={handleRefresh}>{renderTab()}</PullToRefresh>
      </div>

      {myProfile && <ComposeFab />}
    </div>
  );
}
