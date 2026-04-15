"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Broadcast } from "@/lib/broadcasts-types";

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

export function BroadcastCard({ broadcast }: { broadcast: Broadcast }) {
  return (
    <Link
      href={`/ecosystem/broadcasts/${broadcast.handle}` as const}
      prefetch
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
