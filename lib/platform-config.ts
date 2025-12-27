// Platform configuration constants

// Platform wallet address that receives fees
// REQUIRED: Set NEXT_PUBLIC_PLATFORM_WALLET in your .env file
const platformWallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET;

if (!platformWallet) {
    console.error("⚠️ CRITICAL: NEXT_PUBLIC_PLATFORM_WALLET environment variable is not set!");
    console.error("Platform fees will not be collectible without this.");
}

export const PLATFORM_WALLET_ADDRESS = platformWallet || "";

// Admin API key for protected endpoints (fee withdrawal, etc.)
export const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

// Fee configuration (in TON)
export const FEE_CONFIG = {
    tokenCreation: 0.5,       // Fee for creating a token
    tokenDeployment: 0.15,    // Gas for on-chain deployment
    tradingFeePercent: 1,     // 1% trading fee
    platformSharePercent: 50, // Platform gets 50% of trading fee
    creatorSharePercent: 50,  // Creator gets 50% of trading fee
    graduationFeePercent: 2,  // 2% of collected TON on graduation
};

// Total fee for token creation
export const TOTAL_CREATION_FEE = FEE_CONFIG.tokenCreation + FEE_CONFIG.tokenDeployment;

// DEX graduation settings (STON.fi)
export const DEX_CONFIG = {
    routerAddress: "EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt", // STON.fi v2 Router
    ptonMasterAddress: "EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad3qY00o9lU", // pTON v2
    minLiquidity: "100000000000", // 100 TON minimum for pool creation
    lpBurnPercent: 100, // 100% of LP tokens burned (locked forever)
};
