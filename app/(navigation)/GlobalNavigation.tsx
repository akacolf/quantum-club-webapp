"use client";

import { usePathname } from "next/navigation";
import NavigationBar from "./NavigationBar";

export default function GlobalNavigation() {
  const pathname = usePathname();

  // Logic to determine if NavigationBar should be shown
  // Based on previous usage:
  // - Home: Only on /home (from app/home/Content.tsx)
  // - Earn: Only on /earn (from app/earn/layout.tsx)
  // - Frens: On /frens and sub-routes (from app/frens/layout.tsx)
  // - Wallet: On /wallet and sub-routes
  
  const shouldShow = 
    pathname === "/home" || 
    pathname === "/earn" || 
    pathname.startsWith("/frens") || 
    pathname.startsWith("/wallet");

  if (!shouldShow) return null;

  return <NavigationBar />;
}
