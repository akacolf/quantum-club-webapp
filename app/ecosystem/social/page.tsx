"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import {
  useDiscoverFeed,
  useFollowingFeed,
  useForYouFeed,
  useSocialProfile,
} from "@/app/(hooks)/queries/use-social";
import { SOCIAL_FEED_TABS, type SocialFeedTab } from "@/lib/validations";
import { FeedTabs } from "./_components/FeedTabs";
import { PostFeed } from "./_components/PostFeed";
import { EmptyState } from "./_components/EmptyState";
import { ComposeFab } from "./_components/ComposeFab";
import { ensureSocialProfile } from "./actions";

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
  const ensuredRef = useRef(false);
  useEffect(() => {
    if (ensuredRef.current) return;
    if (authLoading || !currentUser || myProfile !== null) return;
    ensuredRef.current = true;
    ensureSocialProfile({}).catch((err) => {
      console.error("[social] auto-onboard failed:", err);
      ensuredRef.current = false;
    });
  }, [authLoading, currentUser, myProfile]);

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
            description="The for-you mix gets smarter as you follow more people."
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
            className="text-sm font-semibold text-amber-400 px-2 py-1"
          >
            Upgrade
          </Link>
          <Link
            href={"/ecosystem/social/search" as Route}
            className="p-1 -mr-1"
            aria-label="Search"
          >
            <Icon icon="solar:magnifer-linear" className="w-6 h-6" />
          </Link>
        </div>
      </header>

      <FeedTabs tab={tab} onChange={setTab} />

      {renderTab()}

      {myProfile && <ComposeFab />}
    </div>
  );
}
