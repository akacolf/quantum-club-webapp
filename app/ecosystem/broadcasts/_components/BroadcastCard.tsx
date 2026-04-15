"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { dbfs } from "@/app/(firebase)/client";
import type { Broadcast, BroadcastPost } from "@/lib/broadcasts-types";

function formatCount(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const POSTS_PRELOAD = 25;

export function BroadcastCard({ broadcast }: { broadcast: Broadcast }) {
  const queryClient = useQueryClient();
  // Prefetch at most once per card per mount — repeated hovers shouldn't
  // refetch, the onSnapshot listener on the channel page will keep it fresh.
  const prefetchedRef = useRef(false);

  const warmChannelCache = useCallback(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;

    // Seed the channel page's broadcast-by-handle cache with the data we
    // already have in hand — the channel page shows immediately instead of
    // waiting for the initial handle lookup + broadcast doc read.
    queryClient.setQueryData<Broadcast>(
      ["broadcasts", "byHandle", broadcast.handle],
      broadcast,
    );

    // Kick off a one-shot posts fetch so the feed renders on arrival. The
    // channel's live onSnapshot listener will take over from there.
    const q = query(
      collection(dbfs, "broadcasts", broadcast.id, "posts"),
      orderBy("createdAt", "desc"),
      limit(POSTS_PRELOAD),
    );
    getDocs(q)
      .then((snap) => {
        const posts: BroadcastPost[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            broadcastId: broadcast.id,
            content: (data.content as string) ?? "",
            media: (data.media as string[]) ?? [],
            createdAt: data.createdAt ?? null,
            editedAt: data.editedAt ?? null,
            parentPostId: (data.parentPostId as string | null) ?? null,
            reactions: (data.reactions as BroadcastPost["reactions"]) ?? {},
            viewCount: (data.viewCount as number) ?? 0,
          };
        });
        queryClient.setQueryData(
          ["broadcasts", "posts", broadcast.id],
          posts,
        );
      })
      .catch(() => {
        /* best-effort prefetch — ignore errors */
      });
  }, [broadcast, queryClient]);

  return (
    <Link
      href={`/ecosystem/broadcasts/${broadcast.handle}` as const}
      prefetch
      onMouseEnter={warmChannelCache}
      onFocus={warmChannelCache}
      onTouchStart={warmChannelCache}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111] border border-[#222] hover:border-[#333] transition-colors"
    >
      <Avatar className="w-12 h-12 shrink-0">
        {broadcast.avatar ? (
          <AvatarImage src={broadcast.avatar} alt={broadcast.name} />
        ) : null}
        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
          {getInitials(broadcast.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white truncate">
            {broadcast.name}
          </span>
          {broadcast.verified && (
            <Icon
              icon="solar:verified-check-bold"
              className="w-4 h-4 text-primary shrink-0"
              aria-label="Verified"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          @{broadcast.handle} · {formatCount(broadcast.subscriberCount)} subscribers
        </p>
        {broadcast.bio ? (
          <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-1">
            {broadcast.bio}
          </p>
        ) : null}
      </div>
      <Icon
        icon="lucide:chevron-right"
        className="w-4 h-4 text-muted-foreground shrink-0"
      />
    </Link>
  );
}
