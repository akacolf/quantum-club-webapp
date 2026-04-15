"use client";

import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import type { BroadcastPost } from "@/lib/broadcasts-types";
import type { Timestamp } from "firebase/firestore";
import { ReactionBar } from "./ReactionBar";

function formatRelative(ts: Timestamp | null): string {
  if (!ts) return "";
  const date = ts.toDate();
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatCount(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

interface Props {
  post: BroadcastPost;
  handle: string;
  qcId: string | null;
}

export function PostCard({ post, handle, qcId }: Props) {
  const href = `/ecosystem/broadcasts/${handle}/${post.id}` as Route;

  return (
    <article className="rounded-2xl bg-[#111] border border-[#222] overflow-hidden">
      <Link href={href} prefetch className="block">
        {post.media.length > 0 && (
          <div className="relative w-full aspect-video bg-[#0a0a0a]">
            <Image
              src={post.media[0]}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 448px) 100vw, 448px"
              unoptimized
            />
          </div>
        )}
        <div className="px-4 pt-3 pb-2">
          {post.content && (
            <p className="text-sm text-white whitespace-pre-wrap break-words">
              {post.content}
            </p>
          )}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-2">
            <span>{formatRelative(post.createdAt)}</span>
            {post.editedAt ? <span>· edited</span> : null}
            {post.viewCount > 0 && (
              <span className="flex items-center gap-1">
                ·
                <Icon icon="lucide:eye" className="w-3 h-3" />
                {formatCount(post.viewCount)}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="px-4 pb-3">
        <ReactionBar post={post} qcId={qcId} />
      </div>
    </article>
  );
}
