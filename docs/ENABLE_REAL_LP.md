# Enabling Real LP Creation

## Current Status
The graduation system is currently in **SIMULATION MODE** for safety during beta.

When a token graduates, it:
1. ✅ Detects market cap threshold reached
2. ✅ Queues for graduation
3. ⚠️ **Simulates** LP creation (generates mock addresses)
4. ✅ Updates token status to "graduated"

## How to Enable Real LP Creation

### Prerequisites
1. A funded TON wallet with enough TON for LP creation
2. The 24-word mnemonic phrase for that wallet
3. Confidence that the graduation logic is working correctly

### Step 1: Set Platform Mnemonic
```bash
firebase functions:config:set platform.mnemonic="word1 word2 word3 ... word24"
```

### Step 2: Modify the Graduation Function
In `functions/src/index.ts`, replace the simulation call:

```typescript
// BEFORE (simulation)
const result = await simulateGraduation(graduation);

// AFTER (real LP creation)
const result = await createLiquidityPool(
    graduation.jettonAddress!, // Token's jetton address
    graduation.collectedTon,   // TON amount for LP
    "1000000000000",           // Token amount (adjust based on supply)
    config.platformMnemonic
);
```

### Step 3: Redeploy Functions
```bash
cd functions && npm run build
firebase deploy --only functions
```

### Step 4: Test with a Low-Value Token First
Before enabling for all tokens, test with a token that has minimal value.

## Safety Considerations
- The platform wallet will hold TON from all bonding curves
- LP creation transfers this TON to STON.fi
- Once LP tokens are burned, liquidity is permanent
- Start with small amounts to verify everything works

## Monitoring
After enabling, monitor:
```bash
firebase functions:log --only processGraduationQueue
```
