# Contributing to Quantum Club

Thank you for your interest in contributing to **Quantum Club (`quantum-club-webapp`)**! 🎉

Quantum Club is an open-source Web3 super app built as a **Telegram Mini App** on the **TON blockchain**. It integrates a multi-chain non-custodial wallet, token trading with bonding curves, a privacy-first dApp browser, real-time encrypted social chat, and gamified earning mechanisms.

This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE). By contributing to this project, you agree that your contributions will be licensed under the AGPL-3.0.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Security Vulnerability Disclosures](#security-vulnerability-disclosures)
  - [Feature Suggestions](#feature-suggestions)
  - [Code & Smart Contract Contributions](#code--smart-contract-contributions)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Forking & Cloning](#forking--cloning)
  - [Installing Dependencies](#installing-dependencies)
  - [Environment Variables Configuration](#environment-variables-configuration)
  - [Running the Local Development Server](#running-the-local-development-server)
- [Architecture & Tech Stack](#architecture--tech-stack)
  - [High-Level Directory Structure](#high-level-directory-structure)
  - [Next.js App Router Structure](#nextjs-app-router-structure)
  - [Smart Contracts (Tolk)](#smart-contracts-tolk)
  - [Firebase Services & Cloud Functions](#firebase-services--cloud-functions)
- [Development & Coding Standards](#development--coding-standards)
  - [Telegram Mini App Constraints](#telegram-mini-app-constraints)
  - [Component Architecture & SSR](#component-architecture--ssr)
  - [Styling & UI Primitives](#styling--ui-primitives)
  - [State Management & Data Fetching](#state-management--data-fetching)
  - [Web3 & Cryptographic Safety](#web3--cryptographic-safety)
- [Git & Commit Workflow](#git--commit-workflow)
  - [Branching Strategy](#branching-strategy)
  - [Commit Message Conventions](#commit-message-conventions)
- [Pre-Flight Verification](#pre-flight-verification)
- [Pull Request Process](#pull-request-process)
- [License Notice](#license-notice)

---

## Code of Conduct

We strive to build a welcoming, respectful, and safe community:
- **Respect and empathy**: Treat all collaborators, maintainers, and community members with dignity.
- **Constructive collaboration**: Frame code reviews and issue discussions around constructive technical improvement.
- **Security-first mindset**: Treat user funds, private keys, and user privacy with extreme care and zero compromise.

---

## How to Contribute

### Reporting Bugs

If you find a bug or unexpected behavior:
1. Search existing [GitHub Issues](https://github.com/akacolf/quantum-club-webapp/issues) to ensure it hasn't been reported.
2. If it is new, open an issue with:
   - A clear, concise title.
   - Exact steps to reproduce the issue.
   - Expected vs. actual behavior.
   - Environment details (Telegram Desktop, iOS Telegram, Android Telegram, or standalone web browser).
   - Screenshots, video captures, or browser console errors.

### Security Vulnerability Disclosures

> [!CAUTION]
> **Do NOT report security vulnerabilities involving private keys, mnemonic handling, wallet exploit vectors, or smart contract exploits publicly in GitHub Issues.**

If you discover a security vulnerability:
- Please report it privately to the maintainers or via GitHub Security Advisories.
- Allow maintainers adequate time to triage, remediate, and deploy a fix before any public disclosure.

### Feature Suggestions

Ideas for improving trading mechanics, wallet UX, new chain integrations, or Telegram Mini App gestures are welcome:
1. Open a discussion or an enhancement issue on GitHub.
2. Clearly explain the user use case, motivation, and potential architecture or smart contract implications.

### Code & Smart Contract Contributions

Whether improving UI responsiveness, fixing contract logic, or optimizing bundle sizes, check open issues for items marked `good first issue` or `help wanted`, or propose your own fix.

---

## Development Setup

### Prerequisites

- **Node.js**: `v22.x` (matching GitHub Actions CI) or `v20.x+`.
- **pnpm**: Version `11.x` (`corepack enable` or `npm install -g pnpm`).
- **Git**: Installed and authenticated with GitHub.

### Forking & Cloning

1. Fork the repository to your own GitHub profile.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/quantum-club-webapp.git
   cd quantum-club-webapp
   ```
3. Configure the upstream remote:
   ```bash
   git remote add upstream https://github.com/akacolf/quantum-club-webapp.git
   ```

### Installing Dependencies

Install dependencies using `pnpm`:

```bash
pnpm install --frozen-lockfile
```

> **Note**: Always use `pnpm`. Do not use `npm` or `yarn`, as lockfiles must stay synchronized with `pnpm-lock.yaml`.

### Environment Variables Configuration

Copy the template file to `.env.local`:

```bash
cp .env.example .env.local
```

Configure the necessary variables:
- **Firebase Admin & Client**: Needed for user records, real-time chats, and groups.
- **Telegram Bot Token**: Required for Telegram authentication validation.
- **Gemini AI API Key**: Required for AI chat assistant (`GOOGLE_GENERATIVE_AI_API_KEY`).
- **TON API Keys**: For RPC and testnet/mainnet interactions.

Refer to comments inside [`.env.example`](./.env.example) for detailed instructions on obtaining each credential.

### Running the Local Development Server

Start the Next.js development server:

```bash
pnpm dev
```

Visit `http://localhost:3000` in your browser. For inspecting mobile Telegram Mini App viewport dimensions, toggle device emulation in Chrome/Safari DevTools to an iPhone or Android screen (width ≤ 448px).

---

## Architecture & Tech Stack

### High-Level Directory Structure

```text
├── app/                  # Next.js 16 App Router (pages, layouts, route groups, API)
├── components/           # Reusable UI components & Radix / shadcn primitives
├── contracts/            # Tolk smart contracts, Jest test suite, and compilation scripts
├── functions/            # Firebase Cloud Functions (onTokenUpdate, graduation triggers)
├── lib/                  # TON API client, STON.fi swap SDK, encryption, utility functions
├── public/               # Static assets, icons, audio, and manifests
├── scripts/              # Contract compilation and maintenance scripts
├── stores/               # Zustand / local store definitions
├── types/                # TypeScript type declarations (trading, contracts, wallet)
└── utils/                # Session utilities, crypto formatting, helpers
```

### Next.js App Router Structure

The `app/` folder uses parenthesized route groups to organize functionality without affecting URLs:

| Route Group | Description |
|---|---|
| `app/(firebase)/` | Client SDK (`client.ts` with persistent cache) and Server Admin SDK (`server.ts`). |
| `app/(contexts)/` | React contexts: Auth, User, Wallet, Trading, Chat, Groups, Frens, Leaderboard, Tasks. |
| `app/(hooks)/` | Custom hooks and TanStack Query hooks in `queries/` (`use-trading`, `use-wallet`, etc.). |
| `app/(providers)/` | `ClientProviders.tsx` orchestrating global providers and dynamic lazy-loading. |
| `app/(components)/` | Shared page components (AIChatDrawer, Loader, ProfileSidebar). |
| `app/(navigation)/` | Global navigation, top bar, and bottom tabs. |
| `app/api/` | Serverless API routes (Telegram auth, AI chat streaming, cron jobs). |

### Smart Contracts (Tolk)

The `contracts/` directory contains contracts written in **Tolk** (modern, struct-based language for TON virtual machine):
- `jetton_master.tolk`: TEP-74 Jetton master with bonding curve automated market maker.
- `jetton_wallet.tolk`: Individual per-holder wallet contract.
- `nft_sale.tolk`: Fixed-price NFT sale contract.

**Compiling & Testing Contracts:**
```bash
# Compile Tolk contracts to BOC bytecode
pnpm compile:contracts

# Run all contract Jest unit tests
pnpm test:contracts

# Run a single contract test
cd contracts && npx jest --config jest.config.js JettonMaster
```

### Firebase Services & Cloud Functions

- **Firestore**: Database with fine-grained security rules in `firestore.rules`.
- **Storage**: Media and metadata uploads with rules in `storage.rules`.
- **Cloud Functions (`functions/`)**: Background triggers (e.g., token graduation when bonding curve market cap threshold is reached).

---

## Development & Coding Standards

### Telegram Mini App Constraints

- **Mobile Viewport (`max-w-md`)**: The app is designed for Telegram Mini Apps. The entire UI is wrapped and constrained within `max-w-md` (max width ~448px) centered on screen.
- **Touch & Gestures**: Use responsive touch targets (minimum 44x44px) and smooth gestures (`@use-gesture/react`).
- **Safe Area Insets**: Respect Telegram top/bottom safe areas when positioning headers and fixed navigation bars.

### Component Architecture & SSR

- **Default to Server Components**: Keep components as React Server Components unless client state, browser events, or hooks are needed.
- **Client Components**: Add `"use client"` at the top of files that utilize hooks or event handlers.
- **Dynamic Imports**: Lazy-load heavy components (e.g., chat drawers, swap dialogs, 3D Canvas) using `next/dynamic` with `ssr: false` where appropriate to optimize initial load.

### Styling & UI Primitives

- **Tailwind CSS v4**: Use utility classes. For conditional classes, always use `cn()` from `@/lib/utils`.
- **Icons**: Use `@iconify/react` with consistent iconography (e.g., Solar icon set).
- **Typography**: Uses the variable font **Onest** (`font-sans`).
- **Toasts**: Always use `sonner` via `toast.success()`, `toast.error()`, etc.

### State Management & Data Fetching

- **Server State**: Managed via **TanStack Query** (`@tanstack/react-query`).
- **Real-Time Data**: Firestore `onSnapshot` listeners are used for live chat, trade streams, and group messaging.
- **App/Session State**: Managed via dedicated React Contexts in `app/(contexts)/`.

### Web3 & Cryptographic Safety

- **Non-Custodial Principle**: User mnemonics, private keys, and seed phrases must NEVER leave the user's client device. Never send, log, or store keys on any server or telemetry tool.
- **Client-Side Signing**: All TON and multi-chain transactions must be signed locally on device.
- **Server Secret Isolation**: Server-only environment variables (`FIREBASE_PRIVATE_KEY`, `JWT_SECRET`, `ADMIN_API_KEY`, `PLATFORM_WALLET_MNEMONIC`) must never be referenced in client components or exposed to public bundles.

---

## Git & Commit Workflow

### Branching Strategy

- **`main`**: The primary production-ready branch. All contributions are integrated through Pull Requests targeting `main`.
- **Feature Branches**: Always branch off the latest `main`:
  - `feat/<feature-name>` (e.g., `feat/solana-swap-route`)
  - `fix/<bug-name>` (e.g., `fix/bonding-curve-slippage-calc`)
  - `contracts/<change>` (e.g., `contracts/tolk-storage-migration`)
  - `perf/<optimization>` (e.g., `perf/virtualize-token-list`)
  - `docs/<doc-update>` (e.g., `docs/contributing-guide`)

### Commit Message Conventions

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

#### Types:
- `feat`: New feature or user capability.
- `fix`: Bug fix.
- `contracts`: Smart contract changes (Tolk/FunC).
- `perf`: Performance improvements.
- `refactor`: Code reorganization with no behavior change.
- `style`: Formatting, semicolons, whitespace.
- `test`: Adding or updating test suites.
- `docs`: Documentation updates.
- `ci`: CI/CD workflow modifications.
- `chore`: Tooling, dependency, or configuration updates.

#### Examples:
```bash
git commit -m "feat(trade): add real-time price impact indicator"
git commit -m "fix(wallet): resolve jetton decimal precision on transfer"
git commit -m "contracts(jetton): add graduation event logging in master contract"
```

---

## Pre-Flight Verification

Before pushing your changes, ensure your branch passes all automated checks:

```bash
# 1. Validate TypeScript types
pnpm typecheck

# 2. Run ESLint code checks
pnpm lint

# 3. Run smart contract unit tests
pnpm test:contracts

# 4. Perform a production build smoke test
pnpm build
```

---

## Pull Request Process

1. **Rebase on `main`**: Keep your feature branch updated with the latest `upstream/main`:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
2. **Push to your Fork**:
   ```bash
   git push origin feat/your-feature-name
   ```
3. **Open a Pull Request**:
   - Ensure the **base branch** is set to `main`.
   - Fill out the PR description with what was changed, testing steps, and relevant issue references (`Fixes #123`).
   - If UI changes were made, attach screenshots or video recordings in mobile dimensions.
4. **CI Checks**: Ensure all GitHub Actions checks pass in the PR.
5. **Review & Iterate**: Address any review comments or feedback promptly.

---

## License Notice

By contributing to Quantum Club, you acknowledge and agree that your contributions are licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. If you modify or extend this code for any network-accessible service, the modified source code must remain accessible under the terms of the AGPL-3.0.

---

Thank you for contributing to the **Quantum Club** ecosystem! 🚀
