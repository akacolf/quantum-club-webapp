"use client";
import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useAuth } from "@/app/(contexts)/auth";
import { dbfs } from "@/app/(firebase)/client";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { gsap } from "@/lib/gsap";

const navTabs = [
  {
    id: "trade",
    href: "/ecosystem/trade" as const,
    label: "Trade",
    icon: "lucide:arrow-left-right",
  },
  {
    id: "chat",
    href: "/ecosystem/chat" as const,
    label: "QC Chat",
    icon: "proicons:chat",
  },
  {
    id: "social",
    href: "/ecosystem/social" as const,
    label: "QC Social",
    icon: "tabler:social",
    iconClassName: "[&>svg]:stroke-[1.5]",
  },
];

const EcosystemNavigation = () => {
  const pathname = usePathname();
  const { telegramId } = useUserContext();
  const authCtx = useAuth();
  const currentUser = authCtx?.currentUser ?? null;
  const [totalUnread, setTotalUnread] = useState(0);
  const [tradePopoverOpen, setTradePopoverOpen] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const prevActiveTab = useRef<string>("");

  // Subscribe to total unread count across all chats
  useEffect(() => {
    if (!currentUser || !telegramId) return;
    const chatsRef = collection(dbfs, "qc-chats");
    const q = query(
      chatsRef,
      where("participants", "array-contains", telegramId),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        count += data.unreadCounts?.[telegramId] || 0;
      });
      setTotalUnread(count);
    }, (err) => {
      console.error("[EcosystemNavigation] Unread count listener error:", err);
    });
    return () => unsub();
  }, [currentUser, telegramId]);

  const getActiveTab = () => {
    for (const tab of navTabs) {
      if (pathname.startsWith(tab.href)) {
        return tab.id;
      }
    }

    return navTabs[0].id;
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

  useLayoutEffect(() => {
    const pill = pillRef.current;
    const nav = navRef.current;
    if (!pill || !nav) return;

    const activeEl = nav.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement | null;
    if (!activeEl) return;

    const navRect = nav.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const targetX = activeRect.left - navRect.left + 4;
    const targetWidth = activeRect.width - 8;

    if (!prevActiveTab.current || prevActiveTab.current === activeTab) {
      pill.style.transform = `translateX(${targetX}px)`;
      pill.style.width = `${targetWidth}px`;
      prevActiveTab.current = activeTab;
    } else {
      animatePill();
    }
  }, [activeTab, animatePill, pathname]);

  // Hide navbar when inside an individual chat conversation
  if (pathname.match(/^\/ecosystem\/chat\/.+/)) {
    prevActiveTab.current = "";
    return null;
  }

  return (
    <div className="fixed z-50 bottom-12 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] h-[70px] bg-white/10 backdrop-blur-2xl rounded-full overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none">
      <nav
        ref={navRef}
        className="grid h-full items-center relative"
        style={{ gridTemplateColumns: `repeat(${navTabs.length}, 1fr)` }}
      >
        <div
          ref={pillRef}
          className="absolute left-0 top-1 h-[calc(100%-8px)] rounded-full bg-white/10 pointer-events-none will-change-transform"
          aria-hidden
        />
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isComingSoon = "comingSoon" in tab && tab.comingSoon;

          if (isComingSoon) {
            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                className="group relative flex flex-col items-center justify-center gap-1 h-full w-full z-10 opacity-50 cursor-default"
              >
                <div data-tab-icon className="text-muted-foreground">
                  <div className="scale-100">
                    <Icon
                      icon={tab.icon}
                      className={("iconClassName" in tab && tab.iconClassName) || ""}
                      style={{ width: "1.5em", height: "1.5em" }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
                    {tab.label}
                  </span>
                  <Badge className="text-[7px] px-1 py-0 h-3 bg-primary/20 text-primary border-0 leading-none">
                    Soon
                  </Badge>
                </div>
              </div>
            );
          }

          // Trade tab: show popover when already on a trade page
          if (tab.id === "trade") {
            const isOnTradePage = pathname.startsWith("/ecosystem/trade");
            const isOnSpot = pathname.startsWith("/ecosystem/trade/spot");
            const isOnStocks = pathname.startsWith("/ecosystem/trade/stocks");
            const isOnLaunchpad = isOnTradePage && !isOnSpot && !isOnStocks;

            const tabContent = (
              <>
                <div
                  data-tab-icon
                  className={`relative transition-colors duration-200 ${
                    isActive
                      ? "text-white"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  <div className="scale-100">
                    <Icon
                      icon={tradePopoverOpen ? "lucide:x" : tab.icon}
                      className={("iconClassName" in tab && tab.iconClassName) || ""}
                      style={{ width: "1.5em", height: "1.5em" }}
                    />
                  </div>
                  {/* Small dot indicator on upper-right to hint at dropdown */}
                  {isOnTradePage && !tradePopoverOpen && (
                    <div className="absolute -top-0.5 -right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium tracking-wide transition-colors duration-300 ${
                    isActive ? "text-white" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </span>
              </>
            );

            if (isOnTradePage) {
              return (
                <Popover key={tab.id} open={tradePopoverOpen} onOpenChange={setTradePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      id={`ecosystem-nav-${tab.id}`}
                      data-tab-id={tab.id}
                      className="group relative flex flex-col items-center justify-center gap-1 h-full w-full z-10 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 [-webkit-tap-highlight-color:transparent]"
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {tabContent}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="start"
                    sideOffset={12}
                    className="w-52 p-1.5 bg-[#1a1a1a] border-0 rounded-xl ring-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
                  >
                    <Link
                      href="/ecosystem/trade"
                      onClick={() => setTradePopoverOpen(false)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] ${isOnLaunchpad ? "bg-white/5" : "hover:bg-white/10"}`}
                    >
                      <Icon icon="mynaui:rocket-solid" className="w-5 h-5 shrink-0 text-primary" />
                      <div className="flex-1 text-left">
                        <p className="whitespace-nowrap text-sm font-semibold text-white">QC RocketStart</p>
                        <p className="text-[10px] text-muted-foreground">Launchpad</p>
                      </div>
                      {isOnLaunchpad && (
                        <Icon icon="lucide:check" className="w-4 h-4 text-primary" />
                      )}
                    </Link>
                    <Link
                      href="/ecosystem/trade/spot"
                      onClick={() => setTradePopoverOpen(false)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] ${isOnSpot ? "bg-white/5" : "hover:bg-white/10"}`}
                    >
                      <Icon icon="solar:chart-2-bold" className="w-5 h-5 shrink-0 text-primary" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-white">Spot</p>
                        <p className="text-[10px] text-muted-foreground">Trade tokens</p>
                      </div>
                      {isOnSpot && (
                        <Icon icon="lucide:check" className="w-4 h-4 text-white" />
                      )}
                    </Link>
                    <Link
                      href="/ecosystem/trade/stocks"
                      onClick={() => setTradePopoverOpen(false)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 [-webkit-tap-highlight-color:transparent] ${isOnStocks ? "bg-white/5" : "hover:bg-white/10"}`}
                    >
                      <Icon icon="solar:graph-up-bold" className="w-5 h-5 shrink-0 text-primary" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-white">xStocks</p>
                        <p className="text-[10px] text-muted-foreground">Tokenized equities</p>
                      </div>
                      {isOnStocks && (
                        <Icon icon="lucide:check" className="w-4 h-4 text-white" />
                      )}
                    </Link>
                  </PopoverContent>
                </Popover>
              );
            }

            // Not on trade page: normal link
            return (
              <Link
                key={tab.id}
                id={`ecosystem-nav-${tab.id}`}
                href={tab.href}
                prefetch={true}
                data-tab-id={tab.id}
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={(e) => e.button === 1 && e.preventDefault()}
                className="group relative flex flex-col items-center justify-center gap-1 h-full w-full z-10"
              >
                {tabContent}
              </Link>
            );
          }

          return (
            <Link
              key={tab.id}
              id={`ecosystem-nav-${tab.id}`}
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
                className={`relative transition-all duration-300 ${
                  isActive
                    ? "text-white"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <div className="scale-100">
                  {tab.id === "chat" ? (
                    <Image src="/png/qc-chat-logo.png" alt="QC Chat" width={26} height={26} />
                  ) : (
                    <Icon
                      icon={tab.icon}
                      className={("iconClassName" in tab && tab.iconClassName) || ""}
                      style={{ width: "1.5em", height: "1.5em" }}
                    />
                  )}
                </div>
                {tab.id === "chat" && totalUnread > 0 && (
                  <span className="absolute -top-1 -right-2 h-[18px] min-w-[18px] px-[5px] text-[11px] font-semibold rounded-full bg-red-500 text-white flex items-center justify-center leading-none shadow-sm">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
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

export default EcosystemNavigation;
