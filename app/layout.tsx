"use client"
import { Inter_Tight } from "next/font/google";
import "./globals.css";
import { usePathname } from "next/navigation";
import { GameProvider } from "./contexts/MiningContext";
import { TabProvider } from "./contexts/TabContext";
import { LeaderboardProvider } from "./contexts/LeaderboardContext";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { FrensProvider } from "./contexts/FrensContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import NavigationBar from "./navigation/NavigationBar";

const intertight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-intertight",
  display: "swap",
  weight: "variable",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const hiddenPaths = ["/home", "/frens", "/earn", "/leaderboard", "/mining"];
  const hideNavbar = hiddenPaths.includes(pathname);
  return (
    <html lang="en">
      <body
      className={`${intertight.variable} antialiased`}
      >
        <Script src="https://telegram.org/js/telegram-web-app.js?57"></Script>
        <GameProvider>
          <TabProvider>
            <div className="main-content">
              <div className="inner-content">
                <LeaderboardProvider>
                  <TonConnectUIProvider manifestUrl="https://cdn.quantumclub.space/tonconnect-manifest.json">
                    <FrensProvider>
                      {children}
                      {hideNavbar && <NavigationBar/>}
                    </FrensProvider>
                    <Analytics />
                    <SpeedInsights/>
                  </TonConnectUIProvider>
                </LeaderboardProvider>
              
              </div>
            </div>
          </TabProvider>
        </GameProvider>
      </body>
    </html>
  );
}
