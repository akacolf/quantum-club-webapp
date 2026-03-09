@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quantum Club is a Web3 super app built as a Telegram Mini App on the TON blockchain. It features a multi-chain wallet (TON, ETH, BTC, SOL, TRON), token trading with bonding curves, dApp browser, social features, and gamified earning. This is a single Next.js app (not a monorepo despite README references to Turborepo).

## Commands

```bash
npm run dev                # Next.js dev server (http://localhost:3000)
npm run build              # Production build
npm run lint               # ESLint
npm run typecheck          # TypeScript check (tsc --noEmit)

# Smart contracts (Tolk)
npm run compile:contracts                                    # Compile Tolk to BOC
npm run test:contracts                                       # Run all contract tests
cd contracts && npx jest --config jest.config.js JettonMaster  # Single test file

# Firebase Cloud Functions
cd functions && npm run build    # Build functions
cd functions && npm run serve    # Local emulator
cd functions && npm run deploy   # Deploy to Firebase
```

## Architecture

### Tech Stack
- **Next.js 16** (App Router) + **TypeScript 5.9** + **Tailwind CSS 4** + **React 19**
- **Firebase**: Firestore (database), Storage, Auth (custom tokens + email/password)
- **TON SDK**: @ton/ton, @ton/core, @ton/crypto for blockchain operations
- **TanStack Query**: Data fetching/caching layer
- **Radix UI / shadcn/ui**: Component primitives in `components/ui/`
- **Framer Motion + GSAP**: Animations
- **Font**: Onest (Google Fonts, variable weight)

### App Router Layout

Route groups (parenthesized, don't affect URLs) organize shared code:

| Directory | Purpose |
|---|---|
| `app/(firebase)/` | `client.ts` (client SDK + Firestore persistent cache) and `server.ts` (Admin SDK) |
| `app/(contexts)/` | React Context providers: auth, UserContext, WalletContext, TradingContext, ChatContext, GroupsContext, FrensContext, LeaderboardContext, TaskContext, AddressBookContext |
| `app/(hooks)/` | Custom hooks + `queries/` subfolder with TanStack Query hooks (use-trading, use-wallet, use-chat, use-prices, use-groups, use-trades) |
| `app/(providers)/` | `ClientProviders.tsx` composes all providers; lazy-loads heavy ones (Chat, Groups, Trading, Omniston) via `next/dynamic` |
| `app/(components)/` | Shared page components (AIChatDrawer, Loader, ProfileSidebar) |
| `app/(navigation)/` | GlobalNavigation, NavigationBar, TopBar |
| `app/(login)/` | Login/auth UI components and helpers |

### Provider Hierarchy (in layout.tsx)
`AuthProvider` > `ClientProviders` (wraps QueryClientProvider > ThemeProvider > UserDataProvider > WalletProvider > lazy-loaded providers)

### Authentication - Dual System
1. **Telegram Mini App**: initData validated server-side, JWT session cookie via `jose`
2. **Firebase Auth**: Custom tokens, email/password, Google OAuth linking
- Auth context: `app/(contexts)/auth.tsx`
- Server actions for cookies: `app/(contexts)/actions.ts`
- Session utils: `utils/session.ts`

### Middleware
`proxy.ts` (exported as Next.js middleware config) handles:
- OFAC sanctioned country blocking on protected routes
- Session cookie validation and auto-renewal

### Key Route Pages
`/home` (dashboard), `/wallet` (wallet + sub-routes: send, receive, history, swap, browser, staking, nft, settings), `/trade` (bonding curve trading + `[tokenId]`), `/ecosystem` (social hub), `/chat/[chatId]`, `/groups`, `/earn`, `/frens`, `/leaderboard`

### API Routes (`app/api/`)
- **Auth**: `/api/auth/telegram/`
- **AI**: `/api/ai/chat/` (streaming response)
- **Cron**: `/api/cron/leaderboard-update/`, `/api/cron/price-alerts/`

### Smart Contracts (`contracts/`)
Tolk contracts for TEP-74 compliant Jetton with bonding curve + NFT marketplace:
- `jetton_master.tolk` - Buy (0xaf750d34), Sell/burn (0x7bdd97de), Graduate (0x47524144)
- `jetton_wallet.tolk` - Per-holder wallet
- `nft_sale.tolk` - Fixed-price NFT sale (0.5% marketplace fee)
- Uses modern Tolk idioms: struct-based storage with auto-serialization, `InMessage` entry point
- Bonding curve: `price = INITIAL_PRICE + (total_supply * CURVE_SLOPE / MAX_SUPPLY)`
- Compiled via `@ton/tolk-js`: `contracts/build/` (BOC files + `contract-code.ts`)

### Firebase Cloud Functions (`functions/`)
Single function `onTokenUpdate` - triggers on token document updates, checks graduation threshold ($69K market cap), creates STON.fi liquidity pool.

### Key Library Files (`lib/`)
- `ton-api.ts` - Unified TonAPI client wrapper
- `jetton-operations.ts` - TEP-74 message builders
- `stonfi.ts` - STON.fi DEX swap integration
- `platform-config.ts` - Platform variants (QC Wallet vs QC RocketStart)
- `walletkit-provider.tsx` - TON Connect WalletKit
- `ton-encrypted-comment.ts` - NaCl box encryption for transfer comments
- `ai/` - Gemini integration with rate limiting

## Code Conventions

- **Imports**: Absolute with `@/` prefix (maps to project root)
- **Components**: `"use client"` only when state/effects are needed; default to server components
- **Naming**: PascalCase components, camelCase hooks/utils, UPPER_SNAKE_CASE constants
- **Styling**: Tailwind utility classes; use `cn()` from `@/lib/utils` for conditional classes
- **State**: React Context for app state, TanStack Query for server state, Firestore `onSnapshot` for real-time data (chat/groups)
- **Icons**: `@iconify/react` with Solar icon set (e.g., `solar:eye-linear`)
- **Toast notifications**: Sonner library
- **Max width**: App is constrained to `max-w-md` (mobile-first Telegram Mini App)
- **TypeScript**: Strict mode enabled; trading types in `types/trading.ts`
- **tsconfig excludes**: `functions/`, `scripts/`, `contracts/` (separate TS configs)
