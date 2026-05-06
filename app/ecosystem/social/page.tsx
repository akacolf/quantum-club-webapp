"use client";

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
  useSocialProfile,
} from "@/app/(hooks)/queries/use-social";
import { SOCIAL_FEED_TABS, type SocialFeedTab } from "@/lib/validations";
import { FeedTabs } from "./_components/FeedTabs";
import { PostFeed } from "./_components/PostFeed";
import { EmptyState } from "./_components/EmptyState";
import { ComposeFab } from "./_components/ComposeFab";

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

  const needsOnboarding =
    !authLoading && currentUser && myProfile === null;

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
        posts={discover.data}
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
            className="p-1"
            aria-label="QC Pro"
          >
            <Icon
              icon="solar:crown-bold"
              className="w-6 h-6 text-amber-400"
            />
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

      {needsOnboarding && (
        <div className="px-4 py-3 bg-secondary/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold">Claim your handle</p>
              <p className="text-xs text-muted-foreground">
                Set a username so people can find you and you can post.
              </p>
            </div>
            <Link href={"/ecosystem/social/onboarding" as Route}>
              <Button size="sm" className="rounded-full">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      )}

      {renderTab()}

      {myProfile && <ComposeFab />}
    </div>
  );
}
