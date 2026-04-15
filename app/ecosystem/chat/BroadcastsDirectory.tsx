"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useBroadcastsDiscovery } from "@/app/(hooks)/queries/use-broadcasts";
import { BroadcastCard } from "@/app/ecosystem/broadcasts/_components/BroadcastCard";

export default function BroadcastsDirectory() {
  const { data: broadcasts } = useBroadcastsDiscovery();

  return (
    <div className="px-4 pt-3 pb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-white">Verified broadcasts</p>
          <p className="text-[11px] text-muted-foreground">
            One-way feeds from trusted creators
          </p>
        </div>
        <Link
          href="/ecosystem/broadcasts/apply"
          prefetch
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold hover:bg-primary/25 transition-colors"
        >
          <Icon icon="lucide:plus" className="w-3 h-3" />
          Apply
        </Link>
      </div>

      {broadcasts === undefined ? (
        <DirectorySkeleton />
      ) : broadcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icon
            icon="solar:radio-minimalistic-linear"
            className="w-10 h-10 text-muted-foreground/60 mb-2"
          />
          <p className="text-sm font-semibold text-white">No broadcasts yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
            Verified broadcasts will appear here once approved.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {broadcasts.map((b) => (
            <BroadcastCard key={b.id} broadcast={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function DirectorySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111] border border-[#222]"
        >
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
