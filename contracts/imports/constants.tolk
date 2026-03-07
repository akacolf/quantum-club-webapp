// ================================================================
// QC RocketStart - Constants & Configuration
// ================================================================
// All configurable parameters for the bonding curve contracts
// ================================================================

// ----- Gas & Storage Configuration -----
const MIN_TON_FOR_STORAGE = 50000000      // 0.05 TON - Minimum contract balance
const MIN_TON_WALLET_STORAGE = 10000000   // 0.01 TON - Minimum wallet balance
const GAS_CONSUMPTION = 15000000          // 0.015 TON - Gas per operation
const FORWARD_FEE = 10000000              // 0.01 TON - Message forward fee
const JETTON_WALLET_DEPLOY_GAS = 150000000 // 0.15 TON - Wallet deployment gas (increased for reliable minting)

// ----- Token Configuration -----
const DECIMALS = 9
const ONE_TOKEN = 1000000000              // 10^9 (1 token in nano)
const MAX_SUPPLY = 1000000000000000000    // 1 billion tokens (10^9 * 10^9)

// ----- Bonding Curve Parameters -----
// Price = INITIAL_PRICE + (supply * CURVE_SLOPE / MAX_SUPPLY)
const INITIAL_PRICE = 1000                // 0.000001 TON per token initially
const CURVE_SLOPE = 100000                // Price increase rate

// ----- Graduation Configuration -----
const GRADUATION_TARGET = 2000000000000   // 2000 TON to graduate
const GRADUATION_FEE_BPS = 200            // 2% graduation fee

// ----- Fee Configuration (basis points = 1/10000) -----
// All fees go to platform, referral distribution happens off-chain
const PLATFORM_FEE_BPS = 110              // 1.1% total platform fee (includes referral pool)
// Note: 0.1% of this is distributed to referrers via backend
