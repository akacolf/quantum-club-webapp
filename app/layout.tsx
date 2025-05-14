"use client"
import localFont from "next/font/local";
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
import { useState } from "react";
import Loader from "./loadingss";

const interdisplay = localFont({
  src: [
    {
      path: './fonts/InterDisplay-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/InterDisplay-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/InterDisplay-SemiBold.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/InterDisplay-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-interdisplay',
  display: 'swap',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const hiddenPaths = ["/home", "/frens", "/earn", "/leaderboard", "/mining"];
  const hideNavbar = hiddenPaths.includes(pathname);
  const [showContent,setShowContent] = useState(true);
  return (
    <html lang="en">
      <body
      className={`${interdisplay.variable} antialiased`}
      >
        <Script src="https://telegram.org/js/telegram-web-app.js?57"></Script>
        <GameProvider>
            <div className="main-content">
              <div className="inner-content">
                <LeaderboardProvider>
                  <TonConnectUIProvider manifestUrl="https://cdn.quantumclub.space/tonconnect-manifest.json">
                    <FrensProvider>
                      {showContent ? children:<Loader/>}
                      {hideNavbar && <NavigationBar setShowContent={setShowContent}/>}
                    </FrensProvider>
                    <Analytics />
                    <SpeedInsights/>
                  </TonConnectUIProvider>
                </LeaderboardProvider>
              </div>
            </div>
        </GameProvider>
      </body>
    </html>
  );
}
