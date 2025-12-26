// Platform configuration constants
// These should be environment variables in production

// Platform wallet address that receives fees
// Set this in your .env file as NEXT_PUBLIC_PLATFORM_WALLET
export const PLATFORM_WALLET_ADDRESS =
    process.env.NEXT_PUBLIC_PLATFORM_WALLET ||
    "UQBUSXMd54HOJlmmh4TsuMvIcwB91kkIlz6HTgj62dN43S3U"; // Replace with your actual platform wallet

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
