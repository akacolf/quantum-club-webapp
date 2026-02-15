"use client";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useAuth } from "@/app/(contexts)/auth";
import { dbfs } from "@/app/(firebase)/client";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";

const navTabs = [
  {
    id: "trade",
    href: "/ecosystem/trade",
    label: "Trade",
    icon: "lucide:arrow-left-right",
  },
  {
    id: "chat",
    href: "/ecosystem/chat",
    label: "QC Chat",
    icon: "proicons:chat",
  },
  {
    id: "social",
    href: "/ecosystem/social",
    label: "QC Social",
    icon: "tabler:social",
    iconClassName: "[&>svg]:stroke-[1.5]",
    comingSoon: true,
  },
];

const EcosystemNavigation = () => {
  const pathname = usePathname();
  const { telegramId } = useUserContext();
  const authCtx = useAuth();
  const currentUser = authCtx?.currentUser ?? null;
  const [totalUnread, setTotalUnread] = useState(0);

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
    }, () => {});
    return () => unsub();
  }, [currentUser, telegramId]);

  // Hide navbar when inside an individual chat conversation
  if (pathname.match(/^\/ecosystem\/chat\/.+/)) {
    return null;
  }

  const getActiveTab = () => {
    for (const tab of navTabs) {
      if (pathname.startsWith(tab.href)) {
        return tab.id;
      }
    }

    return navTabs[0].id;
  };

  const activeTab = getActiveTab();

  return (
    <div className="fixed z-50 bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] h-[70px] bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:to-transparent before:pointer-events-none">
      <nav
        className="grid h-full items-center relative"
        style={{ gridTemplateColumns: `repeat(${navTabs.length}, 1fr)` }}
      >
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isComingSoon = "comingSoon" in tab && tab.comingSoon;

          if (isComingSoon) {
            return (
              <div
                key={tab.id}
                className="group relative flex flex-col items-center justify-center gap-1 h-full w-full z-10 opacity-50 cursor-default"
              >
                <div className="text-muted-foreground">
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

          return (
            <Link
              key={tab.id}
              id={`ecosystem-nav-${tab.id}`}
              href={tab.href}
              prefetch={true}
              onClick={(e) => pathname === tab.href && e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              className="group relative flex flex-col items-center justify-center gap-1 h-full w-full z-10"
            >
              <div
                className={`relative transition-all duration-300 ${
                  isActive
                    ? "text-primary scale-110"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <div className="scale-100">
                  <Icon
                    icon={tab.icon}
                    className={("iconClassName" in tab && tab.iconClassName) || ""}
                    style={{ width: "1.5em", height: "1.5em" }}
                  />
                </div>
                {tab.id === "chat" && totalUnread > 0 && (
                  <span className="absolute -top-1 -right-2 h-[18px] min-w-[18px] px-[5px] text-[11px] font-semibold rounded-full bg-red-500 text-white flex items-center justify-center leading-none shadow-sm">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium tracking-wide transition-colors duration-300 ${
                  isActive ? "text-primary" : "text-muted-foreground"
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
