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
    tokenCreation: 0,           // FREE token creation (no platform fee)
    tokenDeployment: 0.08,      // Gas for deployment (~0.05 contract + ~0.03 network fees)
    platformFeePercent: 1,       // 1% to platform on every trade
    creatorFeePercent: 0.5,      // 0.5% to token creator on every trade
    totalTradingFeePercent: 1.5, // Total 1.5% per trade
    graduationFeePercent: 2,     // 2% on graduation to DEX
};

export const TRADING_FEE_PERCENT = FEE_CONFIG.totalTradingFeePercent;

// Total cost for token creation (gas for deployment)
export const TOTAL_CREATION_FEE = FEE_CONFIG.tokenDeployment;
export const DEPLOYMENT_GAS = FEE_CONFIG.tokenDeployment;

// Minimum balance required for token creation (with buffer)
export const MIN_BALANCE_FOR_CREATION = 0.1; // 0.1 TON minimum recommended

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
