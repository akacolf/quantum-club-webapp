"use client";
import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import InvitePopup from "@/app/frens/FriendsPageContent/invite-popup";
import Link from "next/link";

type NavigationBarProps = {
  setShowContent: (show: boolean) => void;
};

const NavigationBar = ({ setShowContent }: NavigationBarProps) => {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("home");
  const [clickedTab, setClickedTab] = useState("home");
   const handleHide = useCallback(() => setShowContent(false),[setShowContent]);
  useEffect(() => {
    try{
 if (typeof window !== "undefined") {
      const path = window.location.pathname;
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
        return;
      }
    }
    }finally{
    setShowContent(true);
    }
   
  }, [pathname,setShowContent]);

  return (
    <div className="flex justify-center w-full mt-20">
      <nav className="fixed bottom-0 w-full bg-black/80 backdrop-blur-md max-w-md">
        {activeTab === "frens" && (
          <InvitePopup />
        )}
        <ul className="flex flex-row text-center items-center justify-center gap-0">
          <li>
            <Link
              id="home"
              href={"/home"}
              onClick={()=>{handleHide();setClickedTab("home")}}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              className={`flex flex-col-reverse items-center justify-center text-[1.5rem] w-16 h-16 ${
                (clickedTab) === "home" ? "active" : "text-[#727272]"
              }`}
            >
              <span
                className={`text-[0.75rem] leading-4 ${
                  (clickedTab) === "home" ? "active" : ""
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
              onClick={()=>{handleHide();setClickedTab("ranking")}}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              
              className={`flex flex-col-reverse items-center justify-center text-[1.5rem] w-16 h-16 ${
                (clickedTab) === "ranking" ? "active" : "text-[#727272]"
              }`}
            >
              <span
                className={`text-[0.75rem] leading-4 ${
                  (clickedTab) === "ranking" ? "active" : ""
                }`}
              >
                Ranks
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 24 24">
	<path fill="currentColor" fillRule="evenodd" d="M12 1.25c-1.828 0-3.339.161-4.502.357l-.134.023c-1.01.169-1.85.31-2.507 1.118c-.42.519-.557 1.08-.588 1.705l-.492.164c-.463.154-.87.29-1.191.44c-.348.162-.667.37-.911.709s-.341.707-.385 1.088c-.04.353-.04.78-.04 1.269v.145c0 .402 0 .757.03 1.054c.032.321.103.634.28.936c.179.303.417.517.683.701c.245.17.555.343.907.538l2.64 1.467c.54 1.061 1.281 2.007 2.3 2.69c.887.596 1.952.97 3.213 1.069a.8.8 0 0 0-.053.277v1.75H9.82a1.75 1.75 0 0 0-1.716 1.407l-.219 1.093H6a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5h-1.885l-.219-1.093a1.75 1.75 0 0 0-1.716-1.407h-1.43V17a.8.8 0 0 0-.053-.277c1.261-.1 2.326-.473 3.213-1.068c1.02-.684 1.76-1.63 2.3-2.691l2.64-1.467c.352-.195.662-.368.907-.538c.265-.184.504-.398.682-.7c.178-.303.25-.616.281-.937c.03-.297.03-.652.03-1.054v-.145c0-.488 0-.916-.04-1.269c-.044-.381-.14-.75-.385-1.088c-.244-.339-.563-.547-.91-.71c-.323-.15-.729-.285-1.192-.439l-.492-.164c-.03-.626-.167-1.186-.588-1.705c-.656-.809-1.496-.95-2.506-1.118l-.135-.023A27 27 0 0 0 12 1.25m2.585 20l-.16-.799a.25.25 0 0 0-.245-.201H9.82a.25.25 0 0 0-.245.201l-.16.799zM4.288 6.028l.014-.005c.072 1.52.243 3.2.671 4.77l-1.066-.591c-.389-.217-.633-.353-.809-.475c-.162-.113-.215-.18-.244-.23c-.03-.05-.062-.128-.082-.324a11 11 0 0 1-.022-.938v-.073c0-.539.001-.88.03-1.138c.028-.238.072-.327.112-.381c.039-.055.109-.125.326-.226c.236-.11.56-.219 1.07-.39m15.41-.005c-.071 1.52-.243 3.2-.67 4.77l1.065-.591c.389-.217.633-.353.809-.475c.162-.113.215-.18.244-.23c.03-.05.062-.128.082-.324c.021-.214.022-.493.022-.938v-.073c0-.539-.001-.88-.03-1.138c-.028-.238-.072-.327-.112-.381c-.039-.055-.109-.125-.326-.226c-.236-.11-.56-.219-1.07-.39zM7.748 3.086A25.6 25.6 0 0 1 12 2.75c1.74 0 3.167.153 4.252.336c1.207.204 1.46.28 1.727.608c.262.322.287.628.233 1.983c-.09 2.258-.388 4.696-1.31 6.55c-.456.914-1.052 1.662-1.827 2.182c-.771.517-1.766.841-3.075.841s-2.303-.324-3.074-.841c-.776-.52-1.372-1.268-1.827-2.183c-.923-1.853-1.22-4.29-1.31-6.55c-.054-1.354-.03-1.66.233-1.982c.266-.328.519-.404 1.726-.608" clipRule="evenodd" />
</svg>
            </Link>
          </li>

          <li>
            <Link
              id="frens"
              href={"/frens"}
              onClick={()=>{handleHide();setClickedTab("frens")}}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              className={`flex flex-col-reverse items-center justify-center text-[1.5rem] w-16 h-16 ${
                (clickedTab) === "frens" ? "active" : "text-[#727272]"
              }`}
            >
              <span
                className={`text-[0.75rem] leading-4 ${
                  (clickedTab) === "frens" ? "active" : ""
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
              onClick={()=>{handleHide();setClickedTab("tasks")}}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              className={`flex flex-col-reverse items-center justify-center text-[1.5rem] w-16 h-16 ${
                (clickedTab) === "tasks" ? "active" : "text-[#727272]"
              }`}
            >
              <span
                className={`text-[0.75rem] leading-4 ${
                  (clickedTab) === "tasks" ? "active" : ""
                }`}
              >
                Earn
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="1.2em" height="1.2em" viewBox="0 0 256 256">
	<path fill="currentColor" d="M184 89.57V84c0-25.08-37.83-44-88-44S8 58.92 8 84v40c0 20.89 26.25 37.49 64 42.46V172c0 25.08 37.83 44 88 44s88-18.92 88-44v-40c0-20.7-25.42-37.32-64-42.43M232 132c0 13.22-30.79 28-72 28c-3.73 0-7.43-.13-11.08-.37C170.49 151.77 184 139 184 124v-18.26c29.87 4.45 48 16.53 48 26.26M72 150.25v-23.79A184 184 0 0 0 96 128a184 184 0 0 0 24-1.54v23.79A163 163 0 0 1 96 152a163 163 0 0 1-24-1.75m96-40.32V124c0 8.39-12.41 17.4-32 22.87V123.5c12.91-3.13 23.84-7.79 32-13.57M96 56c41.21 0 72 14.78 72 28s-30.79 28-72 28s-72-14.78-72-28s30.79-28 72-28m-72 68v-14.07c8.16 5.78 19.09 10.44 32 13.57v23.37C36.41 141.4 24 132.39 24 124m64 48v-4.17c2.63.1 5.29.17 8 .17c3.88 0 7.67-.13 11.39-.35a122 122 0 0 0 12.61 3.76v23.46c-19.59-5.47-32-14.48-32-22.87m48 26.25V174.4a179.5 179.5 0 0 0 24 1.6a184 184 0 0 0 24-1.54v23.79a165.5 165.5 0 0 1-48 0m64-3.38V171.5c12.91-3.13 23.84-7.79 32-13.57V172c0 8.39-12.41 17.4-32 22.87" />
</svg>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default NavigationBar;
