"use client";

import { cn } from "@/lib/utils";
import { SOCIAL_FEED_TABS, type SocialFeedTab } from "@/lib/validations";

const LABELS: Record<SocialFeedTab, string> = {
  forYou: "For you",
  following: "Following",
  discover: "Discover",
};

interface Props {
  tab: SocialFeedTab;
  onChange: (tab: SocialFeedTab) => void;
}

/**
 * Sticky top tab bar — pure underline indicator, no outline borders. Used on
 * the main feed; profile pages use a similar component but with different
 * tab values.
 */
export function FeedTabs({ tab, onChange }: Props) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur grid grid-cols-3">
      {SOCIAL_FEED_TABS.map((t) => {
        const active = tab === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              "h-12 text-sm font-medium relative transition-colors",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {LABELS[t]}
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
  );
}
