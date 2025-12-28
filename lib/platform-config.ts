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
    tokenCreation: 0.5,         // Fee for creating a token (sent to platform)
    tokenDeployment: 0.05,      // Gas for on-chain deployment (Blum uses 0.015, we use 0.05 for safety)
    // Trading fees (sent directly during each transaction - no accumulation)
    platformFeePercent: 1,      // 1% to platform treasury on every trade
    creatorFeePercent: 0.5,     // 0.5% to token creator on every trade
    totalTradingFeePercent: 1.5, // Total trading fee (1% + 0.5%)
    graduationFeePercent: 2,    // 2% of collected TON on graduation (to platform)
};

// Legacy aliases for backwards compatibility
export const TRADING_FEE_PERCENT = FEE_CONFIG.totalTradingFeePercent;

// Total fee for token creation
export const TOTAL_CREATION_FEE = FEE_CONFIG.tokenCreation + FEE_CONFIG.tokenDeployment;

// DEX graduation settings (STON.fi)
export const DEX_CONFIG = {
    routerAddress: "EQB3ncyBUTjZUA5EnFKR5_EnOMI9V1tTEAAPaiU71gc4TiUt", // STON.fi v2 Router
    ptonMasterAddress: "EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad3qY00o9lU", // pTON v2
    minLiquidity: "100000000000", // 100 TON minimum for pool creation
    lpBurnPercent: 100, // 100% of LP tokens burned (locked forever)
};

// Token supply configuration
export const TOKEN_CONFIG = {
    maxSupply: BigInt("1000000000000000000"), // 1 billion tokens * 10^9 (with 9 decimals)
    maxSupplyFormatted: "1,000,000,000", // 1 billion tokens for display
    decimals: 9,
    // Default slippage tolerance options (in percentage)
    slippageOptions: [0.5, 1, 3, 5],
    defaultSlippage: 1, // 1% default slippage
};
