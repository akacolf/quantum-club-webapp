# QC RocketStart Smart Contracts

This directory contains the FunC smart contracts for the QC RocketStart bonding curve token platform.

## Contracts

### 1. jetton_master.fc
The main Jetton Master contract with integrated bonding curve trading.

**Features:**
- TEP-74 compliant Jetton standard
- Linear bonding curve for automated price discovery
- Buy/sell directly through the contract
- 1% platform fee + 1% creator fee on trades
- Graduation mechanism to DEX (STON.fi)
- Fee withdrawal for platform and creator

**Operations:**
| Op Code | Name | Description |
|---------|------|-------------|
| 0x402eff0b | buy | Buy tokens with TON |
| 0x7bdd97de | burn_notification | Sell tokens (via wallet burn) |
| 0x46454553 | withdraw_fees | Withdraw accumulated fees |
| 0x47524144 | graduate | Graduate to DEX |

**GET Methods:**
- `get_jetton_data()` - TEP-74 standard
- `get_wallet_address(owner)` - TEP-74 standard
- `get_curve_data()` - Bonding curve status
- `preview_buy(ton_amount)` - Preview token output
- `preview_sell(token_amount)` - Preview TON output

### 2. jetton_wallet.fc
Standard TEP-74 Jetton Wallet for user balances.

**Features:**
- Transfer tokens to other wallets
- Receive tokens from other wallets
- Burn tokens (triggers sell on master)

## Bonding Curve Math

The contract uses a linear bonding curve:

```
price = INITIAL_PRICE + (total_supply * CURVE_SLOPE / ONE_TOKEN)
```

Default parameters:
- `INITIAL_PRICE`: 0.001 TON per token
- `CURVE_SLOPE`: 0.0001 (price increases per token)
- `GRADUATION_TARGET`: 2000 TON (triggers DEX graduation)
- `PLATFORM_FEE`: 1%
- `CREATOR_FEE`: 1%

## Deployment Flow

1. **Create Token**: Deploy Jetton Master with:
   - Admin address (platform)
   - Creator address
   - Metadata (name, symbol, image)
   - Jetton wallet code

2. **Buy Tokens**: Send TON to master with `op::buy`
   - Tokens minted to buyer's wallet
   - Fees accumulated in contract

3. **Sell Tokens**: Call `burn` on wallet
   - Triggers `burn_notification` to master
   - Master sends TON to seller

4. **Graduate**: When `ton_reserve >= graduation_target`
   - Send remaining tokens + TON to STON.fi
   - Create liquidity pool

## Compilation

To compile the contracts, use the TON compiler (func):

```bash
# Install func compiler
npm install -g @ton-community/func-js

# Compile master
func -o build/jetton_master.boc -SPA contracts/jetton_master.fc

# Compile wallet
func -o build/jetton_wallet.boc -SPA contracts/jetton_wallet.fc
```

Or use Blueprint SDK:
```bash
npm create ton@latest
# Copy contracts to contracts/ folder
npx blueprint build
```

## Security Considerations

1. **Access Control**: Admin and creator have separate fee withdrawal
2. **Reentrancy**: Protected by TON's async message model
3. **Integer Overflow**: Uses `muldiv` for safe math
4. **Front-running**: TON's asynchronous nature reduces front-running risk

## License

MIT License - QC RocketStart Platform
