// ================================================================
// QC RocketStart - Operation Codes
// ================================================================
// TEP-74 Jetton Standard + Custom Trading Operations
// ================================================================

// ----- TEP-74 Standard Jetton Operations -----
const OP_TRANSFER = 0xf8a7ea5
const OP_TRANSFER_NOTIFICATION = 0x7362d09c
const OP_INTERNAL_TRANSFER = 0x178d4519
const OP_EXCESSES = 0xd53276db
const OP_BURN = 0x595f07bc
const OP_BURN_NOTIFICATION = 0x7bdd97de

// ----- Bonding Curve Trading Operations -----
const OP_BUY = 0xaf750d34              // Buy tokens with TON
const OP_SELL_REQUEST = 0x742b36d8     // Initiate token sell
const OP_SELL_NOTIFICATION = 0xb7e76bfd // Burn notification for sells

// ----- Admin Operations -----
const OP_MINT = 0x15
const OP_CHANGE_ADMIN = 0x3
const OP_UPGRADE = 0x4
const OP_CLAIM = 0x4e400a03
const OP_WITHDRAW_FEES = 0x46454553    // "FEES" in hex

// ----- Graduation Operations -----
const OP_GRADUATE = 0x47524144         // "GRAD" in hex

// ----- Fee Payment Identifier -----
const OP_FEE_PAYMENT = 0xfdaa7c9d

// ----- External Log Operations (for indexers) -----
const `log::deploy` = 0x44455059          // "DEPY" - Contract deployed
const `log::buy` = 0x42555921             // "BUY!" - Token purchased
const `log::sell` = 0x53454c4c            // "SELL" - Token sold
const `log::graduate` = 0x47524144        // "GRAD" - Token graduated to DEX
