"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useWalletStore } from "@/stores/wallet-store";
import { useCallback, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
const navTabs = [
  {
    id: "home",
    href: "/wallet" as const,
    label: "Home",
    icon: "lucide:wallet",
    exact: true
  },
  {
    id: "swap",
    href: "/wallet/swap" as const,
    label: "Swap",
    icon: "lucide:arrow-left-right"
  },
  {
    id: "explore",
    href: "/wallet/explore" as const,
    label: "Explore",
    icon: "lucide:globe"
  },
  {
    id: "liquidity",
    href: "/wallet/liquidity" as const,
    label: "Liquidity",
    icon: "lucide:droplets"
  },
  {
    id: "settings",
    href: "/wallet/settings" as const,
    label: "Settings",
    icon: "lucide:settings"
  },
];

// Routes where the wallet navbar should be hidden (onboarding flow)
const HIDDEN_ROUTES = ["/wallet/import", "/wallet/backup", "/wallet/verify"];

const WalletNavigation = () => {
  const pathname = usePathname();
  const walletAddress = useWalletStore((s) => s.walletAddress);
  const pillRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const prevActiveTab = useRef<string>("home");

  const getActiveTab = () => {
    // Check for exact match first (wallet home)
    const exactMatch = navTabs.find(tab => tab.exact && pathname === tab.href);
    if (exactMatch) return exactMatch.id;
    
    // Then check for path prefix matches (excluding exact-only tabs)
    for (const tab of navTabs) {
      if (!tab.exact && pathname.startsWith(tab.href)) {
        return tab.id;
      }
    }
    
    // Default to home if on any wallet page
    if (pathname.startsWith("/wallet")) return "home";
    return "home";
  };

  const activeTab = getActiveTab();

  const animatePill = useCallback(() => {
    const pill = pillRef.current;
    const nav = navRef.current;
    if (!pill || !nav) return;

    const activeEl = nav.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement | null;
    if (!activeEl) return;

    const navRect = nav.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const targetX = activeRect.left - navRect.left + 4;
    const targetWidth = activeRect.width - 8;

    if (prevActiveTab.current === activeTab) return;

    gsap.to(pill, {
      x: targetX,
      width: targetWidth,
      duration: 0.45,
      ease: "power3.out",
    });

    const activeIcon = activeEl.querySelector("[data-tab-icon]");
    if (activeIcon) {
      gsap.fromTo(
        activeIcon,
        { scale: 0.85 },
        { scale: 1, duration: 0.35, ease: "back.out(2)" },
      );
    }

    prevActiveTab.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const pill = pillRef.current;
    const nav = navRef.current;
    if (!pill || !nav) return;

    const activeEl = nav.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement | null;
    if (!activeEl) return;

    const navRect = nav.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const targetX = activeRect.left - navRect.left + 4;
    const targetWidth = activeRect.width - 8;

    if (prevActiveTab.current === activeTab) {
      pill.style.transform = `translateX(${targetX}px)`;
      pill.style.width = `${targetWidth}px`;
    } else {
      animatePill();
    }
  }, [activeTab, animatePill]);

  // Hide navbar during wallet creation/import flow or when no wallet exists
  if (!walletAddress || HIDDEN_ROUTES.some((route) => pathname.startsWith(route))) {
    return null;
  }

  return (
    <div className="fixed z-50 bottom-8 left-1/2 h-[70px] w-[90%] max-w-[420px] -translate-x-1/2 overflow-hidden rounded-full bg-secondary shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <nav ref={navRef} className="grid h-full grid-cols-5 items-center relative">
        <div
          ref={pillRef}
          className="absolute left-0 top-2 h-[calc(100%-16px)] rounded-full bg-white/10 pointer-events-none will-change-transform"
          aria-hidden
        />
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              id={`wallet-nav-${tab.id}`}
              href={tab.href}
              prefetch={true}
              data-tab-id={tab.id}
              onClick={(e) => pathname === tab.href && e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              className="group relative flex flex-col items-center justify-center gap-1 h-full w-full z-10"
            >
              <div
                data-tab-icon
                className={`transition-colors duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <div className="scale-100">
                  <Icon icon={tab.icon} style={{ width: '1.5em', height: '1.5em' }} />
                </div>
              </div>
              <span
                className={`text-[10px] font-medium tracking-wide transition-colors duration-300 ${
                  isActive ? "text-white" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default WalletNavigation;
