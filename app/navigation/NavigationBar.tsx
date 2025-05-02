"use client";
import React, { useState, useEffect } from "react";
/*import { Icon } from "@iconify-icon/react";*/
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
              <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24">
	<path fill="currentColor" d="M20 10a1 1 0 1 0-2 0zM6 10a1 1 0 0 0-2 0zm14.293 2.707a1 1 0 0 0 1.414-1.414zM12 3l.707-.707a1 1 0 0 0-1.414 0zm-9.707 8.293a1 1 0 1 0 1.414 1.414zM7 22h10v-2H7zm13-3v-9h-2v9zM6 19v-9H4v9zm15.707-7.707l-9-9l-1.414 1.414l9 9zm-10.414-9l-9 9l1.414 1.414l9-9zM17 22a3 3 0 0 0 3-3h-2a1 1 0 0 1-1 1zM7 20a1 1 0 0 1-1-1H4a3 3 0 0 0 3 3z" />
</svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24">
	<path fill="currentColor" d="M11 19v-3.1q-1.225-.275-2.187-1.037T7.4 12.95q-1.875-.225-3.137-1.637T3 8V7q0-.825.588-1.412T5 5h2q0-.825.588-1.412T9 3h6q.825 0 1.413.588T17 5h2q.825 0 1.413.588T21 7v1q0 1.9-1.263 3.313T16.6 12.95q-.45 1.15-1.412 1.913T13 15.9V19h3q.425 0 .713.288T17 20t-.288.713T16 21H8q-.425 0-.712-.288T7 20t.288-.712T8 19zm-4-8.2V7H5v1q0 .95.55 1.713T7 10.8m5 3.2q1.25 0 2.125-.875T15 11V5H9v6q0 1.25.875 2.125T12 14m5-3.2q.9-.325 1.45-1.088T19 8V7h-2zm-5-1.3" />
</svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="-0.5 0 16 16">
	<path fill="currentColor" d="M7.5 7a2.5 2.5 0 0 1 0-5a2.5 2.5 0 0 1 0 5m0-4C6.67 3 6 3.67 6 4.5S6.67 6 7.5 6S9 5.33 9 4.5S8.33 3 7.5 3" />
	<path fill="currentColor" d="M13.5 11c-.28 0-.5-.22-.5-.5s.22-.5.5-.5s.5-.22.5-.5A2.5 2.5 0 0 0 11.5 7h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5c.83 0 1.5-.67 1.5-1.5S11.33 3 10.5 3c-.28 0-.5-.22-.5-.5s.22-.5.5-.5A2.5 2.5 0 0 1 13 4.5c0 .62-.22 1.18-.6 1.62c1.49.4 2.6 1.76 2.6 3.38c0 .83-.67 1.5-1.5 1.5m-12 0C.67 11 0 10.33 0 9.5c0-1.62 1.1-2.98 2.6-3.38c-.37-.44-.6-1-.6-1.62A2.5 2.5 0 0 1 4.5 2c.28 0 .5.22.5.5s-.22.5-.5.5C3.67 3 3 3.67 3 4.5S3.67 6 4.5 6c.28 0 .5.22.5.5s-.22.5-.5.5h-1A2.5 2.5 0 0 0 1 9.5c0 .28.22.5.5.5s.5.22.5.5s-.22.5-.5.5m9 3h-6c-.83 0-1.5-.67-1.5-1.5v-1C3 9.57 4.57 8 6.5 8h2c1.93 0 3.5 1.57 3.5 3.5v1c0 .83-.67 1.5-1.5 1.5m-4-5A2.5 2.5 0 0 0 4 11.5v1c0 .28.22.5.5.5h6c.28 0 .5-.22.5-.5v-1A2.5 2.5 0 0 0 8.5 9z" />
</svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24">
	<g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
		<path d="M21 8c0-1.657-3.134-3-7-3S7 6.343 7 8m14 0v4c0 1.02-1.186 1.92-3 2.462c-1.134.34-2.513.538-4 .538s-2.866-.199-4-.538C8.187 13.92 7 13.02 7 12V8m14 0c0 1.02-1.186 1.92-3 2.462c-1.134.34-2.513.538-4 .538s-2.866-.199-4-.538C8.187 9.92 7 9.02 7 8" />
		<path d="M3 12v4c0 1.02 1.187 1.92 3 2.462c1.134.34 2.513.538 4 .538s2.866-.199 4-.538c1.813-.542 3-1.442 3-2.462v-1M3 12c0-1.197 1.635-2.23 4-2.711M3 12c0 1.02 1.187 1.92 3 2.462c1.134.34 2.513.538 4 .538c.695 0 1.366-.043 2-.124" />
	</g>
</svg>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default NavigationBar;
