"use client";

import Link from "next/link";
import type { Route } from "next";
import { Icon } from "@iconify/react";
import { haptics } from "@/lib/haptics";

/** Floating-action button that opens the composer. Sits above the global nav bar. */
export function ComposeFab() {
  return (
    <Link
      href={"/ecosystem/social/compose" as Route}
      onClick={() => haptics.medium()}
      className="fixed bottom-32 right-5 z-30 size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      aria-label="New post"
    >
      <Icon icon="solar:pen-new-square-bold" className="w-6 h-6" />
    </Link>
  );
}
