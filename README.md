# Quantum Club

<div align="center">

###**The Super Ecosystem built on Telegram and TON**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TON](https://img.shields.io/badge/TON-Blockchain-0098EA?style=for-the-badge&logo=ton)](https://ton.org/)
[![Telegram](https://img.shields.io/badge/Telegram-Mini%20App-26A5E4?style=for-the-badge&logo=telegram)](https://telegram.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## Overview

Quantum Club is a comprehensive Web3 super app designed as a Telegram Mini App, integrating a multi-chain crypto wallet, token trading platform, dApp browser, social features, and gamified earning mechanisms—all powered by the TON blockchain.

## Key Features

### Multi-Chain Wallet

- **Native TON Support**: Full TON blockchain integration with real-time balance tracking
- **Multi-Chain Assets**: Support for Bitcoin (BTC), Ethereum (ETH), Solana (SOL), and TRON
- **Jetton Management**: View, send, and receive TON-based tokens (Jettons)
- **NFT Gallery**: Browse and manage your NFT collection
- **Transaction History**: Comprehensive history with search and filtering
- **QR Code Scanning**: Scan TON Connect QR codes for seamless dApp connections
- **Price Alerts**: Set custom price alerts with Telegram notifications

### Token Trading Platform

- **Token Creation**: Deploy your own Jettons on TON blockchain
- **Bonding Curve Trading**: Buy and sell tokens with automated market making
- **Real-Time Charts**: Live price charts with candlestick data
- **Market Cap Tracking**: Monitor token progress and graduation thresholds
- **Live Trades Feed**: Real-time global trade activity
- **Token Chat**: Engage with token communities

### dApp Browser

- **Integrated Browser**: Browse TON dApps directly within the wallet
- **Privacy-First Search**: DuckDuckGo integration for private web searches (dark mode by default)
- **Popular dApps**: Quick access to STON.fi, DeDust, Getgems, and more
- **TON Connect**: Seamless wallet connections to Web3 applications
- **Category Filtering**: Browse by DEX, DeFi, NFT, Gaming, and Tools

### Token Swaps

- **Omniston-Powered**: Cross-chain swap routing for optimal rates across multiple DEXs
- **STON.fi Integration**: Direct swap support via STON.fi DEX
- **Slippage Protection**: Configurable slippage tolerance
- **Gas Estimation**: Transparent fee calculations

### NFT Marketplace

- **Browse Collections**: Discover verified NFT collections on TON
- **Purchase NFTs**: Buy NFTs directly from the integrated marketplace
- **NFT Gallery**: View and manage your NFT collection in your wallet

### Social Features

- **Encrypted Chat**: End-to-end encrypted private messaging with NaCl box encryption
- **Groups**: Create and join community groups with real-time messaging
- **QC Usernames**: Register a unique username linked to your wallet address
- **Referral System**: Earn rewards through friend referrals
- **Leaderboards**: Compete on global rankings

### Gamification

- **Mining/Earning**: Participate in mining activities
- **Solve-to-Earn**: Complete tasks to earn rewards
- **Achievements**: Unlock achievements for platform engagement
- **Quest Tasks**: Complete quests for bonus rewards

### AI Assistant

- **Gemini Integration**: AI-powered chat assistant
- **Rate Limiting**: Fair usage with server-side rate limiting
- **Contextual Help**: Get help with wallet and trading features

## Tech Stack

### Frontend

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 4.0
- **Animations**: Framer Motion, GSAP
- **UI Components**: Radix UI primitives
- **State Management**: React Context API
- **Data Fetching**: TanStack Query

### Blockchain

- **Primary Chain**: TON (The Open Network)
- **TON SDK**: @ton/ton, @ton/core, @ton/crypto
- **TON Connect**: WalletKit integration
- **Smart Contracts**: FunC (Jetton Master & Wallet)
- **DEX Integration**: STON.fi SDK, Omniston SDK

### Backend & Infrastructure

- **Authentication**: Telegram Mini App authentication
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage, AWS S3
- **Hosting**: Vercel
- **Analytics**: Vercel Analytics, Telegram Analytics
- **APIs**: TON API, STON.fi API

### Multi-Chain Support

- **Bitcoin**: bitcoinjs-lib
- **Ethereum**: viem
- **Solana**: @solana/kit
- **TRON**: tronweb

## Project Structure

```
quantum-club/
├── app/                    # Next.js App Router
│   ├── (components)/       # Shared UI components
│   ├── (contexts)/         # React Context providers
│   ├── (firebase)/         # Firebase configuration
│   ├── (hooks)/            # Custom React hooks
│   ├── (login)/            # Authentication flows
│   ├── (navigation)/       # Navigation components
│   ├── (providers)/        # App-wide providers
│   ├── api/                # API routes
│   │   ├── ai/             # AI chat endpoint
│   │   ├── auth/           # Authentication endpoints
│   │   ├── deploy-jetton/  # Token deployment
│   │   ├── graduate/       # Token graduation
│   │   ├── price-alerts/   # Price alert management
│   │   ├── tonapi/         # TON API proxy
│   │   └── ...
│   ├── chat/               # Chat features
│   ├── earn/               # Earning/mining features
│   ├── frens/              # Referral system
│   ├── groups/             # Group management
│   ├── home/               # Home dashboard
│   ├── leaderboard/        # Rankings
│   ├── trade/              # Trading platform
│   └── wallet/             # Wallet features
│       ├── browser/        # dApp browser
│       ├── history/        # Transaction history
│       ├── nft/            # NFT gallery
│       ├── send/           # Send assets
│       ├── receive/        # Receive assets
│       ├── settings/       # Wallet settings
│       ├── swap/           # Token swaps
│       └── ...
├── components/             # Shared UI components
│   └── ui/                 # Base UI primitives
├── contracts/              # Smart contracts (FunC)
│   ├── jetton_master.fc    # Jetton master contract
│   ├── jetton_wallet.fc    # Jetton wallet contract
│   ├── imports/            # Contract imports
│   └── build/              # Compiled contracts
├── lib/                    # Utility libraries
│   ├── ai/                 # AI integration
│   ├── jetton-*.ts         # Jetton operations
│   ├── stonfi.ts           # STON.fi integration
│   ├── ton-api.ts          # TON API client
│   ├── walletkit-*.ts      # WalletKit provider
│   └── ...
├── public/                 # Static assets
│   ├── lottie/             # Lottie animations
│   └── svg/                # SVG icons
├── types/                  # TypeScript definitions
└── utils/                  # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/quantum-club.git
   cd quantum-club
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env.local` and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   Refer to `.env.example` for detailed descriptions of all required Firebase, TON, Telegram Bot, and encryption parameters.

4. **Run the development server**

   ```bash
   pnpm dev
   ```

5. **Open in browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Development Commands

```bash
# Development
npm run dev              # Next.js dev server (http://localhost:3000)

# Build
npm run build            # Production build

# Lint and Typecheck
npm run lint             # ESLint
npm run typecheck        # TypeScript check (tsc --noEmit)

# Smart Contracts
npm run compile:contracts                              # Compile FunC contracts
npm run test:contracts                                 # Run all contract tests
npx jest --config contracts/jest.config.js JettonMaster  # Single test file

# Firebase Functions
cd functions && npm run build       # Build functions
cd functions && npm run serve       # Local emulator
cd functions && npm run deploy      # Deploy to Firebase
```

### Telegram Mini App Development

For testing as a Telegram Mini App:

1. Create a bot via [@BotFather](https://t.me/botfather)
2. Use [ngrok](https://ngrok.com/) or similar to expose your local server
3. Set the Mini App URL in BotFather to your ngrok URL

## Smart Contracts

The project includes custom Jetton (token) smart contracts written in FunC:

### Compiling Contracts

```bash
npm run compile:contracts
```

### Contract Architecture

- **Jetton Master**: TEP-74 compliant fungible token master contract
- **Jetton Wallet**: Individual wallet contract for each holder

See [`contracts/README.md`](./contracts/README.md) for detailed contract documentation.

## Security

### Authentication

- Telegram Mini App authentication with JWT tokens
- Server-side session validation
- Firebase Authentication integration

### Wallet Security

- Mnemonic phrases stored securely on device
- No private keys transmitted to servers
- Transaction signing happens client-side

### API Security

- Rate limiting on sensitive endpoints
- CORS protection
- Input validation and sanitization

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy

### Firebase

The project uses Firebase for:

- **Firestore**: Document database
- **Storage**: File uploads
- **Hosting**: (Optional) Static hosting

Deploy Firebase rules:

```bash
firebase deploy --only firestore:rules
```

## Analytics

- **Vercel Analytics**: Page views and web vitals
- **Vercel Speed Insights**: Performance monitoring
- **Telegram Analytics**: Mini App engagement metrics

## Contributing

We welcome contributions to Quantum Club! Whether fixing a bug, developing smart contracts in Tolk, enhancing Telegram Mini App performance, or refining UI components, please read our [Contributing Guide](CONTRIBUTING.md) for full details on development setup, architecture conventions, and pull request procedures.

1. Fork the repository and clone your fork.
2. Create a feature branch off `main` (`git checkout -b feat/amazing-feature`).
3. Commit your changes following [Conventional Commits](CONTRIBUTING.md#commit-message-conventions).
4. Run pre-flight checks (`pnpm typecheck`, `pnpm lint`, `pnpm test:contracts`).
5. Push to your branch and open a Pull Request targeting `main`.

## License

This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).

Under this license, you are free to inspect, run, modify, and contribute to the software. Any modified versions or derivative services offered over a network must also be published as open source under the same AGPL-3.0 terms.

## Links

- **Mini App**: [t.me/QuantumClubBot](https://t.me/QuantumClubBot)
- **Documentation**: Coming soon
- **Support**: Coming soon

---

<div align="center">

**Built with ❤️ by the Quantum Club Team**

</div>
