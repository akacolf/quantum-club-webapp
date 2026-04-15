"use client";

import { use } from "react";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import {
  useBroadcastByHandle,
  useBroadcastPosts,
} from "@/app/(hooks)/queries/use-broadcasts";
import { SubscribeButton } from "../_components/SubscribeButton";
import { PostCard } from "../_components/PostCard";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatCount(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export default function BroadcastChannelPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  useTelegramBackButton("/ecosystem/broadcasts");

  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;

  const { data: broadcast } = useBroadcastByHandle(handle);
  const { data: posts } = useBroadcastPosts(broadcast?.id ?? null);

  if (broadcast === undefined) {
    return <ChannelSkeleton />;
  }

  if (broadcast === null) {
    return (
      <div className="min-h-screen px-4 pt-10 pb-28 max-w-md mx-auto flex flex-col items-center text-center">
        <Icon
          icon="solar:radio-minimalistic-linear"
          className="w-12 h-12 text-muted-foreground/60 mb-3"
        />
        <p className="text-base font-semibold text-white">
          Broadcast not found
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          @{handle} doesn&apos;t exist or isn&apos;t verified yet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 max-w-md mx-auto">
      {broadcast.coverImage ? (
        <div
          className="h-28 bg-cover bg-center"
          style={{ backgroundImage: `url(${broadcast.coverImage})` }}
        />
      ) : (
        <div className="h-20 bg-gradient-to-b from-primary/20 to-transparent" />
      )}

      <header className="px-4 -mt-8">
        <div className="flex items-end gap-3">
          <Avatar className="w-20 h-20 border-4 border-[#0a0a0a]">
            {broadcast.avatar ? (
              <AvatarImage src={broadcast.avatar} alt={broadcast.name} />
            ) : null}
            <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
              {getInitials(broadcast.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 pb-1">
            <div className="flex items-center justify-end">
              <SubscribeButton broadcastId={broadcast.id} qcId={qcId} />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold text-white truncate">
              {broadcast.name}
            </h1>
            {broadcast.verified && (
              <Icon
                icon="solar:verified-check-bold"
                className="w-5 h-5 text-primary"
                aria-label="Verified"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            @{broadcast.handle} ·{" "}
            {formatCount(broadcast.subscriberCount)} subscribers
          </p>
          {broadcast.bio ? (
            <p className="text-sm text-white/80 mt-2 whitespace-pre-wrap">
              {broadcast.bio}
            </p>
          ) : null}
        </div>
      </header>

      <section className="px-4 mt-6 space-y-3">
        {posts === undefined ? (
          <PostFeedSkeleton />
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icon
              icon="solar:chat-round-line-linear"
              className="w-10 h-10 text-muted-foreground/60 mb-2"
            />
            <p className="text-sm font-semibold text-white">No posts yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Check back soon — new posts will appear here.
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              handle={broadcast.handle}
              qcId={qcId}
            />
          ))
        )}
      </section>
    </div>
  );
}

function ChannelSkeleton() {
  return (
    <div className="min-h-screen pb-28 max-w-md mx-auto">
      <div className="h-20 bg-gradient-to-b from-primary/20 to-transparent" />
      <div className="px-4 -mt-8">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-12 w-full mt-3" />
        </div>
      </div>
    </div>
  );
}

function PostFeedSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-[#111] border border-[#222] p-4">
          <Skeleton className="h-3 w-20 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </>
  );
}
