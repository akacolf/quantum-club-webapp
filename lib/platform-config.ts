// Platform configuration constants

import { env } from "@/env";

// RocketStart uses TON Testnet so users can trade with no real funds risk
export const ROCKETSTART_TESTNET = true;

// Platform wallet address that receives fees (validated by T3 Env)
export const PLATFORM_WALLET_ADDRESS = env.NEXT_PUBLIC_PLATFORM_WALLET;

// Admin API key for protected endpoints (fee withdrawal, etc.)
// Lazy getter — this file is imported by client components (for FEE_CONFIG etc.),
// so we can't access server env vars at module level.
export function getAdminApiKey(): string {
  return env.ADMIN_API_KEY ?? "";
}

// Fee configuration (in TON)
export const FEE_CONFIG = {
    tokenCreation: 0,           // FREE token creation (no platform creation fee)
    tokenDeployment: 0.05,      // Network gas estimation for contract deployment
    serviceFeePercent: 1,       // 1% platform service fee
    referralFeePercent: 0.1,    // 0.1% allocated to the trader's referrer
    totalTradingFeePercent: 1.1, // Total 1.1% per trade (1% service + 0.1% referral)
    displayPlatformFeePercent: 1.1, // Displayed in UI fee breakdowns
    graduationFeePercent: 2,     // 2% fee on graduation to STON.fi DEX
};

// DEX graduation settings (STON.fi)
export const DEX_CONFIG = {
  routerAddress: "EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt", // STON.fi v2 Router
  ptonMasterAddress: "EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad3qY00o9lU", // pTON v2
  minLiquidity: "100000000000", // 100 TON minimum for pool creation
  lpBurnPercent: 100, // 100% of LP tokens burned (locked forever)
};
