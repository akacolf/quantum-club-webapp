"use client";

import type { SocialPost } from "@/lib/social-types";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "./PostCard";

interface Props {
  posts: SocialPost[] | undefined;
  qcId: string | null;
  emptyState: React.ReactNode;
}

export function PostFeed({ posts, qcId, emptyState }: Props) {
  if (posts === undefined) {
    return (
      <div className="divide-y divide-border/30">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="divide-y divide-border/30">
      {posts.map((post) => (
        <PostCard
          key={`${post.authorQcId}:${post.id}`}
          post={post}
          qcId={qcId}
        />
      ))}
    </div>
  );
}
