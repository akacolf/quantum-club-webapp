# Contract Verification Guide

## Quick Verification via UI

The easiest way to verify your contracts is through the official TON Verifier:

### Step 1: Go to the Verifier

Visit: **https://verifier.ton.org**

### Step 2: Connect Wallet

Connect your TON wallet (the one that deployed the contract)

### Step 3: Enter Contract Address

Paste your Jetton Master contract address:

```
EQACVgYkBldXS7emkuBQtNCMq84yuccBl1FkLY4jeKCSIS4b
```

### Step 4: Upload Source Files

Upload files in this exact order:

1. `contracts/imports/stdlib.fc` (standard library)
2. `contracts/jetton_master.fc` (main contract)

### Step 5: Configure Compiler

- **Compiler**: func
- **Version**: 0.4.4 (or the version you used to compile)
- **Command Line**: `-SPA stdlib.fc jetton_master.fc`

### Step 6: Verify

Click "Verify" and sign the transaction with your wallet.

---

## What Happens After Verification

1. The verifier compiles your source code
2. It compares the resulting bytecode with on-chain code
3. If they match, it creates an on-chain proof
4. Explorers (Tonviewer, TONSCAN) will show "Verified ✓"
5. The "SCAM" label should be removed

---

## Source Files Ready for Verification

The following clean source files are ready:

- `contracts/jetton_master.fc` - Main Jetton contract (420 lines, no comments)
- `contracts/jetton_wallet.fc` - Wallet contract (270 lines, no comments)
- `contracts/imports/stdlib.fc` - Standard library

---

## Troubleshooting

### "Code doesn't match"

- Make sure you're using the exact same compiler version
- Check that files are uploaded in the correct order
- Ensure no modifications were made after deployment

### "SCAM label still showing"

- Verification takes a few minutes to propagate
- Try refreshing the explorer page
- Contact Tonviewer support if it persists after 24h

---

## Programmatic Verification (Advanced)

For automated verification, see:

- `scripts/verify-contract.ts` - Helper script
- https://github.com/ton-community/contract-verifier-backend - API docs
