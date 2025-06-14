"use client";
import "./globals.css";
import { usePathname } from "next/navigation";
import { GameProvider } from "./contexts/MiningContext";
import { LeaderboardProvider } from "./contexts/LeaderboardContext";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { FrensProvider } from "./contexts/FrensContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import NavigationBar from "./navigation/NavigationBar";
import { useEffect, useState } from "react";
import Loader from "./components/MainLoader";
import { Fustat } from "next/font/google";
import telegramAnalytics from "@telegram-apps/analytics";

const fustat = Fustat({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-fustat",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
  if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
    telegramAnalytics.init({
      token:
        "eyJhcHBfbmFtZSI6InFfY2x1Yl8zOTAxIiwiYXBwX3VybCI6Imh0dHBzOi8vdC5tZS9RdWFudHVtQ2x1YkJvdCIsImFwcF9kb21haW4iOiJodHRwczovL3d3dy5xdWFudHVtY2x1Yi5zcGFjZS8ifQ==!jZPSceSMdMSx0S9SaAcGgbIYARHmiPMSW59Y3KIZln4=",
      appName: "q_club_3901",
    });
  }
}, []);
  const pathname = usePathname();
  const hiddenPaths = ["/home", "/frens", "/earn", "/mining"];
  const hideNavbar = hiddenPaths.includes(pathname);
  const [showContent, setShowContent] = useState(true);
  return (
    <html lang="en">
      <body className={`${fustat.variable} antialiased`}>
        <Script src="https://telegram.org/js/telegram-web-app.js?57"></Script>
        <GameProvider>
          <div className="main-content">
            <div className="inner-content">
              <LeaderboardProvider>
                <TonConnectUIProvider manifestUrl="https://cdn.quantumclub.space/tonconnect-manifest.json">
                  <FrensProvider>
                    {showContent ? children : <Loader />}
                    {hideNavbar && (
                      <NavigationBar setShowContent={setShowContent} />
                    )}
                  </FrensProvider>
                  <Analytics />
                  <SpeedInsights />
                </TonConnectUIProvider>
              </LeaderboardProvider>
            </div>
          </div>
        </GameProvider>
      </body>
    </html>
  );
}
