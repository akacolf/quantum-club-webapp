"use client";
import { GameProvider } from "../contexts/MiningContext";
import { LeaderboardProvider } from "../contexts/LeaderboardContext";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { FrensProvider } from "../contexts/FrensContext";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <GameProvider>
      <LeaderboardProvider>
        <TonConnectUIProvider manifestUrl="https://cdn.quantumclub.space/tonconnect-manifest.json">
          <FrensProvider>
            {children}
          </FrensProvider>
        </TonConnectUIProvider>
      </LeaderboardProvider>
    </GameProvider>
  );
};