"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";

const navTabs = [
  {
    id: "trade",
    href: "/ecosystem/trade",
    label: "Trade",
    icon: "lucide:arrow-left-right",
  },
];

const EcosystemNavigation = () => {
  const pathname = usePathname();

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
                className={`transition-all duration-300 ${
                  isActive
                    ? "text-primary scale-110"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <div className="scale-100">
                  <Icon
                    icon={tab.icon}
                    style={{ width: "1.5em", height: "1.5em" }}
                  />
                </div>
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
