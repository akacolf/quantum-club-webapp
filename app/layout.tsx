import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";
import { GameProvider } from "./contexts/MiningContext";
import { LeaderboardProvider } from "./contexts/LeaderboardContext";
import { TabProvider } from "./contexts/TabContext";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { FrensProvider } from "./contexts/FrensContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quantum Club",
  description: "Developed by the Quantum Club Team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${interTight.variable} ${interTight.variable} antialiased`}
      >
        <script src="https://telegram.org/js/telegram-web-app.js?57"></script>
        <GameProvider>
          <TabProvider>
            <div className="main-content">
              <div className="inner-content">
                <LeaderboardProvider>
                  <TonConnectUIProvider manifestUrl="https://cdn.quantumclub.space/tonconnect-manifest.json">
                    <FrensProvider>{children}</FrensProvider>
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
