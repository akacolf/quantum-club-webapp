"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const HomeIcon = React.memo(() => (
  <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1.5em"
            height="1.5em"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M20 10a1 1 0 1 0-2 0zM6 10a1 1 0 0 0-2 0zm14.293 2.707a1 1 0 0 0 1.414-1.414zM12 3l.707-.707a1 1 0 0 0-1.414 0zm-9.707 8.293a1 1 0 1 0 1.414 1.414zM7 22h10v-2H7zm13-3v-9h-2v9zM6 19v-9H4v9zm15.707-7.707l-9-9l-1.414 1.414l9 9zm-10.414-9l-9 9l1.414 1.414l9-9zM17 22a3 3 0 0 0 3-3h-2a1 1 0 0 1-1 1zM7 20a1 1 0 0 1-1-1H4a3 3 0 0 0 3 3z"
            />
          </svg>
));
HomeIcon.displayName = "HomeIcon";

const EarnIcon = React.memo(() => (
  <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1.5em"
            height="1.5em"
            viewBox="0 0 256 256"
          >
            <path
              fill="currentColor"
              d="M184 89.57V84c0-25.08-37.83-44-88-44S8 58.92 8 84v40c0 20.89 26.25 37.49 64 42.46V172c0 25.08 37.83 44 88 44s88-18.92 88-44v-40c0-20.7-25.42-37.32-64-42.43M232 132c0 13.22-30.79 28-72 28c-3.73 0-7.43-.13-11.08-.37C170.49 151.77 184 139 184 124v-18.26c29.87 4.45 48 16.53 48 26.26M72 150.25v-23.79A184 184 0 0 0 96 128a184 184 0 0 0 24-1.54v23.79A163 163 0 0 1 96 152a163 163 0 0 1-24-1.75m96-40.32V124c0 8.39-12.41 17.4-32 22.87V123.5c12.91-3.13 23.84-7.79 32-13.57M96 56c41.21 0 72 14.78 72 28s-30.79 28-72 28s-72-14.78-72-28s30.79-28 72-28m-72 68v-14.07c8.16 5.78 19.09 10.44 32 13.57v23.37C36.41 141.4 24 132.39 24 124m64 48v-4.17c2.63.1 5.29.17 8 .17c3.88 0 7.67-.13 11.39-.35a122 122 0 0 0 12.61 3.76v23.46c-19.59-5.47-32-14.48-32-22.87m48 26.25V174.4a179.5 179.5 0 0 0 24 1.6a184 184 0 0 0 24-1.54v23.79a165.5 165.5 0 0 1-48 0m64-3.38V171.5c12.91-3.13 23.84-7.79 32-13.57V172c0 8.39-12.41 17.4-32 22.87"
            />
          </svg>
));
EarnIcon.displayName = "EarnIcon";

const FrensIcon = React.memo(() => (
  <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1.5em"
            height="1.5em"
            viewBox="-0.5 0 16 16"
          >
            <path
              fill="currentColor"
              d="M7.5 7a2.5 2.5 0 0 1 0-5a2.5 2.5 0 0 1 0 5m0-4C6.67 3 6 3.67 6 4.5S6.67 6 7.5 6S9 5.33 9 4.5S8.33 3 7.5 3"
            />
            <path
              fill="currentColor"
              d="M13.5 11c-.28 0-.5-.22-.5-.5s.22-.5.5-.5s.5-.22.5-.5A2.5 2.5 0 0 0 11.5 7h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5c.83 0 1.5-.67 1.5-1.5S11.33 3 10.5 3c-.28 0-.5-.22-.5-.5s.22-.5.5-.5A2.5 2.5 0 0 1 13 4.5c0 .62-.22 1.18-.6 1.62c1.49.4 2.6 1.76 2.6 3.38c0 .83-.67 1.5-1.5 1.5m-12 0C.67 11 0 10.33 0 9.5c0-1.62 1.1-2.98 2.6-3.38c-.37-.44-.6-1-.6-1.62A2.5 2.5 0 0 1 4.5 2c.28 0 .5.22.5.5s-.22.5-.5.5C3.67 3 3 3.67 3 4.5S3.67 6 4.5 6c.28 0 .5.22.5.5s-.22.5-.5.5h-1A2.5 2.5 0 0 0 1 9.5c0 .28.22.5.5.5s.5.22.5.5s-.22.5-.5.5m9 3h-6c-.83 0-1.5-.67-1.5-1.5v-1C3 9.57 4.57 8 6.5 8h2c1.93 0 3.5 1.57 3.5 3.5v1c0 .83-.67 1.5-1.5 1.5m-4-5A2.5 2.5 0 0 0 4 11.5v1c0 .28.22.5.5.5h6c.28 0 .5-.22.5-.5v-1A2.5 2.5 0 0 0 8.5 9z"
            />
          </svg>
));
FrensIcon.displayName = "FrensIcon";

const EcosystemIcon = React.memo(() => (
  <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1.5em"
            height="1.5em"
            viewBox="0 0 16 16"
          >
            <path
              fill="currentColor"
              d="M11 8a2.64 2.64 0 0 0-.53-1.59l1.33-1.32a2.2 2.2 0 0 0 .82.17a1.94 1.94 0 0 0 2-1.88a2 2 0 0 0-4 0a1.76 1.76 0 0 0 .24.88L9.53 5.59A3.14 3.14 0 0 0 8 5.19a3 3 0 0 0-2.93 2.19h-.69A2 2 0 0 0 2.5 6.13A1.94 1.94 0 0 0 .5 8a1.94 1.94 0 0 0 2 1.88a2 2 0 0 0 1.88-1.25h.69A3 3 0 0 0 8 10.82A2.91 2.91 0 0 0 11 8m1.62-5.24a.69.69 0 0 1 .75.62a.76.76 0 0 1-1.5 0a.7.7 0 0 1 .75-.62M2.5 8.63A.7.7 0 0 1 1.75 8a.7.7 0 0 1 .75-.62a.7.7 0 0 1 .75.62a.7.7 0 0 1-.75.63m5.5.94A1.67 1.67 0 0 1 6.25 8A1.66 1.66 0 0 1 8 6.44A1.67 1.67 0 0 1 9.75 8A1.68 1.68 0 0 1 8 9.57"
            />
            <path
              fill="currentColor"
              d="M2.5 4.38a2 2 0 0 0 .82-.17L5.08 6A3.7 3.7 0 0 1 6 5.13L4.26 3.38a1.76 1.76 0 0 0 .24-.88a1.94 1.94 0 0 0-2-1.87a1.94 1.94 0 0 0-2 1.87a1.94 1.94 0 0 0 2 1.88m0-2.5a.7.7 0 0 1 .75.62a.7.7 0 0 1-.75.63a.7.7 0 0 1-.75-.63a.7.7 0 0 1 .75-.62m11 9.75a2 2 0 0 0-.82.17L10.92 10a3.7 3.7 0 0 1-.93.84l1.74 1.74a1.75 1.75 0 0 0-.23.88a2 2 0 0 0 4 0a1.94 1.94 0 0 0-2-1.83m0 2.5a.7.7 0 0 1-.75-.63a.76.76 0 0 1 1.5 0a.7.7 0 0 1-.75.63"
            />
          </svg>
));
EcosystemIcon.displayName = "EcosystemIcon";

const navTabs = [
  { id: "home", href: "/home", label: "Home", icon: <HomeIcon /> },
  { id: "earn", href: "/earn", label: "Earn", icon: <EarnIcon /> },
  { id: "frens", href: "/frens", label: "Frens", icon: <FrensIcon /> },
  { id: "ecosystem", href: "/ecosystem", label: "Ecosystem", icon: <EcosystemIcon /> },
];

const NavigationBar = () => {
  const pathname = usePathname();

  let activeTab = "home";
  if (pathname.includes("/earn")) activeTab = "earn";
  else if (pathname.includes("/frens")) activeTab = "frens";
  else if (pathname.includes("/ecosystem")) activeTab = "ecosystem";

  return (
      <div
        className="dock dock-sm bg-black/80 backdrop-blur-md min-h-[5rem] z-50"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)" }}
      >
        {navTabs.map(tab => (
          <Link
          key={tab.id}
          id={tab.id}
          href={tab.href}
          onClick={e => pathname === tab.href && e.preventDefault()}
          className={activeTab === tab.id ? "active" : "text-neutral-500"}
          onContextMenu={e => e.preventDefault()}
          onMouseDown={e => e.button === 1 && e.preventDefault()}
          >
            {tab.icon}
            <div className="dock-label font-medium">{tab.label}</div> 
          </Link>
        ))}
      </div>
      
  );
};

export default NavigationBar;
