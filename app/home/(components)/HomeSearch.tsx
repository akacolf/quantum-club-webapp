"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

const SEARCH_ITEMS = [
  { label: "Wallet", description: "Manage your assets", href: "/wallet", icon: "lucide:wallet" },
  { label: "Deposit", description: "Receive assets", href: "/wallet/receive", icon: "lucide:arrow-down" },
  { label: "Trade", description: "Open trading", href: "/ecosystem/trade", icon: "lucide:arrow-left-right" },
  { label: "Earn", description: "Complete QNTM tasks", href: "/earn", icon: "lucide:gift" },
  { label: "Solve", description: "Solve to earn", href: "/earn/solvetoearn", icon: "lucide:brain" },
  { label: "Frens", description: "Invite and track referrals", href: "/frens", icon: "lucide:user-plus" },
  { label: "Chat", description: "Open ecosystem chat", href: "/ecosystem/chat", icon: "lucide:message-circle" },
  { label: "QC AI", description: "Ask the club assistant", href: "/ecosystem/chat/qc-ai", icon: "lucide:sparkles" },
  { label: "Leaderboard", description: "View rankings", href: "/leaderboard", icon: "lucide:trophy" },
  { label: "Story", description: "Your ecosystem activity", href: "/story", icon: "lucide:book-open" },
  { label: "Roadmap", description: "See Quantum Club goals", href: "/home/roadmap", icon: "lucide:route" },
  { label: "Profile", description: "Manage your profile", href: "/home/profile", icon: "lucide:user" },
];

export default function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return SEARCH_ITEMS.filter((item) => {
      const haystack = `${item.label} ${item.description}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    }).slice(0, 5);
  }, [normalizedQuery]);

  const goTo = (href: string) => {
    setQuery("");
    router.push(href as Parameters<typeof router.push>[0]);
  };

  return (
    <div className="relative w-[90%] mx-auto">
      <div className="relative">
        <Icon
          icon="lucide:search"
          className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) {
              event.preventDefault();
              goTo(results[0].href);
            }
          }}
          placeholder="Search Quantum Club"
          className="h-11 w-full rounded-xl border-0 bg-[#111] pl-10 pr-10 text-sm font-medium text-white outline-none transition-colors placeholder:text-neutral-500 focus:bg-[#161616]"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Clear search"
          >
            <Icon icon="lucide:x" className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {normalizedQuery ? (
        <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl bg-[#111] shadow-2xl">
          {results.length > 0 ? (
            results.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => goTo(item.href)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[#1a1a1a]"
              >
                <Icon icon={item.icon} className="h-4 w-4 shrink-0 text-neutral-400" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{item.label}</span>
                  <span className="block truncate text-xs text-neutral-500">{item.description}</span>
                </span>
              </button>
            ))
          ) : (
            <div className="px-3.5 py-4 text-sm text-neutral-500">No results found.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
