"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "@iconify-icon/react";
import { usePathname } from "next/navigation";
import InvitePopup from "@/app/frens/FriendsPageContent/invite-popup";
import { useRouter } from "next/navigation";
import Link from "next/link";

const NavigationBar = ({invite, isPopupOpen, PopupClose, inviteFren, CopyLink } : {invite: void; isPopupOpen: void; PopupClose: void; inviteFren: void; CopyLink: void;}) => {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("home");
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/home"); // prefetches pages //
    router.prefetch("/frens");
    router.prefetch("/earn");
    router.prefetch("/leaderboard");
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Tarayıcıya özel kodlar burada çalışır
      const path = window.location.pathname; // Geçerli URL yolunu al;
      if (path.includes("/earn")) {
        setActiveTab("tasks");
        return;
      }
      if (path.includes("/frens")) {
        setActiveTab("frens");
        return;
      }
      if (path.includes("/airdrop")) {
        setActiveTab("airdrop");
        return;
      }
      if (path.includes("/home")) {
        setActiveTab("home");
        return;
      }
      if (path.includes("leaderboard")) {
        setActiveTab("ranking");
      }
    }
  }, [pathname]);

  return (
    <div className="flex justify-center w-full mt-20">
      <nav className="fixed bottom-0 w-full bg-black max-w-md">
        {activeTab === "frens" && (
          <InvitePopup invite={invite} isPopupOpen={isPopupOpen} PopupClose={PopupClose} inviteFren={inviteFren} CopyLink={CopyLink} />
        )}
        <ul className="flex flex-row text-center items-center justify-center gap-0">
          <li>
            <Link
              id="home"
              href={"/home"}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              className={`flex flex-col-reverse items-center justify-center text-[1.5rem] w-16 h-16 ${
                activeTab === "home" ? "active" : "text-[#727272]"
              }`}
            >
              <span
                className={`text-[0.75rem] leading-4 ${
                  activeTab === "home" ? "active" : ""
                }`}
              >
                Home
              </span>
              <Icon icon="iconamoon:home" width="1.2em" height="1.2em" />
            </Link>
          </li>

          <li>
            <Link
              id="leaderboard"
              href={"/leaderboard"}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              className={`flex flex-col-reverse items-center justify-center text-[1.5rem] w-16 h-16 ${
                activeTab === "ranking" ? "active" : "text-[#727272]"
              }`}
            >
              <span
                className={`text-[0.75rem] leading-4 ${
                  activeTab === "ranking" ? "active" : ""
                }`}
              >
                Ranks
              </span>
              <Icon icon="mage:trophy" width="1.2em" height="1.2em" />
            </Link>
          </li>

          <li>
            <Link
              id="frens"
              href={"/frens"}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              className={`flex flex-col-reverse items-center justify-center text-[1.5rem] w-16 h-16 ${
                activeTab === "frens" ? "active" : "text-[#727272]"
              }`}
            >
              <span
                className={`text-[0.75rem] leading-4 ${
                  activeTab === "frens" ? "active" : ""
                }`}
              >
                Frens
              </span>
              <Icon icon="formkit:people" width="1.2em" height="1.2em" />
            </Link>
          </li>

          <li>
            <Link
              id="tasks"
              href={"/earn"}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              className={`flex flex-col-reverse items-center justify-center text-[1.5rem] w-16 h-16 ${
                activeTab === "tasks" ? "active" : "text-[#727272]"
              }`}
            >
              <span
                className={`text-[0.75rem] leading-4 ${
                  activeTab === "tasks" ? "active" : ""
                }`}
              >
                Earn
              </span>
              <Icon icon="ph:coins" width="1.2em" height="1.2em" />
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default NavigationBar;
