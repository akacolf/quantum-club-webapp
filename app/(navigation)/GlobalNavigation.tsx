"use client";

import { usePathname } from "next/navigation";
import NavigationBar from "./NavigationBar";

export default function GlobalNavigation() {
  const pathname = usePathname();

  const shouldShow = 
    pathname === "/home" || 
    pathname === "/earn" || 
    pathname.startsWith("/frens") || 
    pathname.startsWith("/wallet");

  if (!shouldShow) return null;

  return <NavigationBar />;
}
