"use client";

import { usePathname } from "next/navigation";
import NavigationBar from "./NavigationBar";

export default function GlobalNavigation() {
  const pathname = usePathname();

  // Hide main navbar on wallet and ecosystem pages - they have their own navigation
  if (pathname.startsWith("/wallet") || pathname.startsWith("/ecosystem")) return null;

  const shouldShow =
    pathname === "/home" ||
    pathname === "/earn" ||
    pathname.startsWith("/frens") ||
    pathname.startsWith("/ecosystem");

  if (!shouldShow) return null;

  return <NavigationBar />;
}
