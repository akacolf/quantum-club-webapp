"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/(contexts)/auth";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import {
  useBroadcastByHandle,
  useBroadcastPosts,
  useIsBroadcastAdmin,
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
  useTelegramBackButton("/ecosystem/chat?tab=discover&discoverTab=broadcasts");

  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;

  const { data: broadcast } = useBroadcastByHandle(handle);
  const { data: posts } = useBroadcastPosts(broadcast?.id ?? null);
  const { data: isAdmin } = useIsBroadcastAdmin(broadcast?.id ?? null, qcId);

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
    <div className="min-h-screen pb-32 max-w-md mx-auto text-foreground">
      {/* Cover banner — rounded card with horizontal margin, mirrors NFT collection page */}
      <div className="relative h-44 mx-4 mt-4 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/25 via-primary/10 to-transparent">
        {broadcast.coverImage ? (
          <Image
            src={broadcast.coverImage}
            alt={broadcast.name}
            fill
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon
              icon="solar:radio-minimalistic-bold"
              className="w-20 h-20 text-primary/30"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 relative z-10 space-y-4 -mt-12"
      >
        {/* Square rounded avatar with punch-out border, NFT-collection style */}
        <div className="flex items-end justify-between gap-3">
          <div className="w-24 h-24 rounded-2xl border-4 border-background overflow-hidden bg-card shrink-0">
            {broadcast.avatar ? (
              <Image
                src={broadcast.avatar}
                alt={broadcast.name}
                width={96}
                height={96}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/15 text-primary text-xl font-bold">
                {getInitials(broadcast.name)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pb-2">
            {isAdmin && (
              <Link
                href={`/ecosystem/broadcasts/${broadcast.handle}/manage` as Route}
                prefetch
                className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs font-semibold hover:bg-[#222] transition-colors"
              >
                <Icon icon="lucide:settings" className="w-3.5 h-3.5" />
                Manage
              </Link>
            )}
            <SubscribeButton broadcastId={broadcast.id} qcId={qcId} />
          </div>
        </div>

        {/* Name + handle + bio */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{broadcast.name}</h1>
            {broadcast.verified && (
              <Icon
                icon="solar:verified-check-bold"
                className="w-6 h-6 text-primary shrink-0"
                aria-label="Verified"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            @{broadcast.handle} ·{" "}
            {formatCount(broadcast.subscriberCount)} subscribers
          </p>
          {broadcast.bio ? (
            <p className="text-sm text-white/80 whitespace-pre-wrap pt-1">
              {broadcast.bio}
            </p>
          ) : null}
        </div>
      </motion.div>

      {/* Post feed */}
      <section className={cn("px-4 mt-6 space-y-3")}>
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
              {isAdmin
                ? "Tap the + button to publish the first post."
                : "Check back soon — new posts will appear here."}
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

      {/* Floating compose button, admin-only */}
      {isAdmin && (
        <Link
          href={`/ecosystem/broadcasts/${broadcast.handle}/compose` as Route}
          prefetch
          aria-label="New post"
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
        >
          <Icon icon="lucide:plus" className="w-6 h-6" />
        </Link>
      )}
    </div>
  );
}

function ChannelSkeleton() {
  return (
    <div className="min-h-screen pb-28 max-w-md mx-auto">
      <Skeleton className="h-44 mx-4 mt-4 rounded-2xl" />
      <div className="px-4 -mt-12 space-y-4">
        <Skeleton className="w-24 h-24 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
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
