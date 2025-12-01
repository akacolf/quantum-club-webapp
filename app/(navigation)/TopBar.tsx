"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function TopBar() {
  return (
    <div className="absolute top-4 right-4 z-50">
      <ThemeToggle />
    </div>
  );
}
