"use client";

import { use, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import {
  useSocialProfileByHandle,
  useUserPosts,
  useUserReplies,
} from "@/app/(hooks)/queries/use-social";
import { recordSocialProfileView } from "../affinity-actions";
import {
  SOCIAL_PROFILE_TABS,
  type SocialProfileTab,
} from "@/lib/validations";
import { ProfileHeader } from "../_components/ProfileHeader";
import { PostFeed } from "../_components/PostFeed";
import { EmptyState } from "../_components/EmptyState";
import { cn } from "@/lib/utils";

const TAB_LABELS: Record<SocialProfileTab, string> = {
  posts: "Posts",
  replies: "Replies",
  media: "Media",
};

export default function SocialProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  useTelegramBackButton("/ecosystem/social");

  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;

  const { data: profile } = useSocialProfileByHandle(handle);
  const posts = useUserPosts(profile?.id ?? null);
  const replies = useUserReplies(profile?.id ?? null);

  // Fire one profile-view affinity bump per profile per mount, after the
  // viewer has settled on the page for ~1.5s. Prevents accidental bumps from
  // tap-throughs and quick back-nav.
  const viewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!profile?.id || !qcId || qcId === profile.id) return;
    if (viewedRef.current === profile.id) return;
    const t = setTimeout(() => {
      viewedRef.current = profile.id;
      recordSocialProfileView({ authorQcId: profile.id }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [profile?.id, qcId]);

  const [tab, setTab] = useQueryState<SocialProfileTab>(
    "view",
    parseAsStringEnum<SocialProfileTab>([...SOCIAL_PROFILE_TABS])
      .withDefault("posts")
      .withOptions({ history: "replace" }),
  );

  if (profile === undefined) {
    return (
      <div className="min-h-screen pb-28">
        <Skeleton className="w-full aspect-[3/1]" />
        <div className="px-4 -mt-10 relative">
          <Skeleton className="w-20 h-20 rounded-full ring-4 ring-background" />
          <Skeleton className="h-5 w-40 mt-3" />
          <Skeleton className="h-4 w-24 mt-2" />
        </div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-28">
        <EmptyState
          icon="solar:user-cross-rounded-linear"
          title="Profile not found"
          description={`No one has claimed @${handle} yet.`}
        />
      </div>
    );
  }

  const mediaPosts = (posts.data ?? []).filter((p) => p.media.length > 0);

  return (
    <div className="min-h-screen bg-background pb-28">
      <ProfileHeader profile={profile} qcId={qcId} />

      <div className="mt-4 grid grid-cols-3 sticky top-0 z-10 bg-background/95 backdrop-blur">
        {SOCIAL_PROFILE_TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "h-12 text-sm font-medium relative transition-colors",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {TAB_LABELS[t]}
              <span
                aria-hidden
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 bottom-0 h-[2px] rounded-full transition-all",
                  active ? "w-12 bg-primary" : "w-0 bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      {tab === "posts" && (
        <PostFeed
          posts={posts.data}
          qcId={qcId}
          emptyState={
            <EmptyState
              icon="solar:document-text-linear"
              title="No posts yet"
              description={`@${profile.handle} hasn't posted anything.`}
            />
          }
        />
      )}
      {tab === "replies" && (
        <PostFeed
          posts={replies.data}
          qcId={qcId}
          emptyState={
            <EmptyState
              icon="solar:chat-round-line-linear"
              title="No replies yet"
              description={`@${profile.handle} hasn't replied to anyone.`}
            />
          }
        />
      )}
      {tab === "media" && (
        <PostFeed
          posts={posts.data === undefined ? undefined : mediaPosts}
          qcId={qcId}
          emptyState={
            <EmptyState
              icon="solar:gallery-linear"
              title="No media yet"
              description={`@${profile.handle} hasn't shared any photos.`}
            />
          }
        />
      )}

      {profile.subscriptionEnabled && (
        <div className="mx-4 mt-4 p-4 rounded-2xl bg-secondary/50 flex items-center gap-3">
          <Icon
            icon="solar:crown-bold"
            className="w-6 h-6 text-primary shrink-0"
          />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Premium content</p>
            <p className="text-xs text-muted-foreground">
              Subscriptions coming soon
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
