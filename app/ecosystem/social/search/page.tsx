"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import { parseAsString, useQueryState } from "nuqs";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";
import { Input } from "@/components/ui/input";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { Avatar } from "../_components/Avatar";
import { VerifiedBadge, getVerificationKind } from "../_components/VerifiedBadge";
import { EmptyState } from "../_components/EmptyState";
import type { SocialProfile } from "@/lib/social-types";

interface SearchHit
  extends Pick<SocialProfile, "id" | "handle" | "displayName" | "avatar"> {
  isPro: boolean;
}

export default function SocialSearchPage() {
  useTelegramBackButton("/ecosystem/social");

  const [q, setQ] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  );
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim().toLowerCase().replace(/^@+/, "");
    if (term.length < 2) {
      setHits(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const handle = setTimeout(async () => {
      try {
        const snap = await getDocs(
          query(
            collection(dbfs, "socialProfiles"),
            orderBy("handle"),
            where("handle", ">=", term),
            where("handle", "<", `${term}`),
            limit(20),
          ),
        );
        if (cancelled) return;
        const now = Date.now();
        const results: SearchHit[] = snap.docs.map((d) => {
          const data = d.data();
          const expires = data.proExpiresAt as
            | { toMillis(): number }
            | null
            | undefined;
          return {
            id: d.id,
            handle: (data.handle as string) ?? d.id,
            displayName: (data.displayName as string) ?? "",
            avatar: (data.avatar as string | null) ?? null,
            isPro: expires != null && expires.toMillis() > now,
          };
        });
        setHits(results);
      } catch (err) {
        console.error("[social search]", err);
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q]);

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur px-4 pt-4 pb-3">
        <div className="relative">
          <Icon
            icon="lucide:search"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search QC Social"
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            className="pl-10 h-11 rounded-full"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="Clear"
            >
              <Icon icon="lucide:x" className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {q.trim().length < 2 ? (
        <EmptyState
          icon="iconoir:search"
          title="Search QC Social"
          description="Type a handle or display name to find people."
        />
      ) : loading && hits === null ? (
        <EmptyState
          icon="iconoir:search"
          title="Searching…"
          description={`Looking for @${q.trim().replace(/^@+/, "")}`}
        />
      ) : hits && hits.length === 0 ? (
        <EmptyState
          icon="lucide:user-x"
          title="No matches"
          description={`No one found for "${q.trim()}".`}
        />
      ) : (
        <ul className="divide-y divide-border/40">
          {hits?.map((hit) => (
            <li key={hit.id}>
              <Link
                href={`/ecosystem/social/${hit.handle}` as Route}
                className="flex items-center gap-3 px-4 py-3 active:bg-secondary/40 transition-colors"
              >
                <Avatar src={hit.avatar} name={hit.displayName || hit.handle} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-sm truncate">
                      {hit.displayName || hit.handle}
                    </p>
                    {(() => {
                      const kind = getVerificationKind({
                        handle: hit.handle,
                        isPro: hit.isPro,
                      });
                      return kind ? <VerifiedBadge tone={kind} /> : null;
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    @{hit.handle}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
