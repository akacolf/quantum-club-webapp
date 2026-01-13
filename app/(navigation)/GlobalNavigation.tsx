"use client";

import { usePathname } from "next/navigation";
import NavigationBar from "./NavigationBar";

export default function GlobalNavigation() {
  const pathname = usePathname();

  // Hide main navbar on wallet pages - wallet has its own navigation
  if (pathname.startsWith("/wallet")) return null;

  const shouldShow =
    pathname === "/home" ||
    pathname === "/earn" ||
    pathname.startsWith("/frens") ||
    pathname.startsWith("/trade");

  if (!shouldShow) return null;

  return <NavigationBar />;
}
