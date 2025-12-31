# QC RocketStart Contract Verification Guide

## Contract Sources

The QC RocketStart platform uses two FunC smart contracts:

### 1. Jetton Master Contract
- **File**: `contracts/jetton_master.fc`
- **Dependencies**: `contracts/imports/stdlib.fc`
- **Compiler**: @ton-community/func-js (via scripts/compile-contracts.ts)

### 2. Jetton Wallet Contract
- **File**: `contracts/jetton_wallet.fc`
- **Dependencies**: `contracts/imports/stdlib.fc`
- **Compiler**: @ton-community/func-js (via scripts/compile-contracts.ts)

## Verifying on verifier.ton.org

1. Go to https://verifier.ton.org
2. Enter the deployed contract address
3. Upload the source files:
   - For Jetton Master: `jetton_master.fc` + `imports/stdlib.fc`
   - For Jetton Wallet: `jetton_wallet.fc` + `imports/stdlib.fc`
4. Ensure the compiler version matches (check @ton-community/func-js version in package.json)

## Compilation Command

```bash
npx tsx scripts/compile-contracts.ts
```

This generates:
- `contracts/build/jetton_master.boc` - Compiled master contract
- `contracts/build/jetton_wallet.boc` - Compiled wallet contract
- `contracts/build/contract-code.ts` - Hex-encoded bytecode for deployment

## Contract Features

- TEP-74 Jetton standard compliant
- TEP-64 on-chain metadata format
- Custom bonding curve trading
- 1% platform fee + 0.5% creator fee on trades
- Automatic graduation at 2000 TON threshold
- Slippage protection on buys

## Key Addresses

- **Platform Admin**: Receives 1% trading fees
- **Token Creator**: Receives 0.5% trading fees, shown as "Owner" in explorers
