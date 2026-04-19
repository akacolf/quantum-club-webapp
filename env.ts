import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Firebase Admin SDK
    FIREBASE_CLIENT_EMAIL: z.string().min(1),
    FIREBASE_PRIVATE_KEY: z.string().min(1),
    FIREBASE_PRIVATE_KEY_ID: z.string().optional(),
    FIREBASE_PROJECT_ID: z.string().min(1),
    FIREBASE_CLIENT_ID: z.string().optional(),

    // Auth & Encryption
    JWT_SECRET: z.string().min(1),
    AES_ENCRYPTION_KEY: z.string().min(32, "AES key must be at least 32 characters (256-bit)"),

    // Telegram Bot
    BOT_TOKEN: z.string().min(1),
    DEV_BOT_TOKEN: z.string().optional(),
    BOT_USERNAME: z.string().optional(),

    // AI
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),


    // Platform
    ADMIN_API_KEY: z.string().optional(),
    ADMIN_TELEGRAM_IDS: z.string().optional(),
    PLATFORM_WALLET_MNEMONIC: z.string().min(1),
    PLATFORM_WALLET_VERSION: z.string().optional(),

    // Cron
    CRON_SECRET: z.string().min(1),

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    // Cloudflare TURN
    CLOUDFLARE_TURN_KEY_ID: z.string().optional(),
    CLOUDFLARE_TURN_API_TOKEN: z.string().optional(),

    // TON API (server-only key)
    TONAPI_KEY: z.string().optional(),

    // Analytics
    TGA_AUTH_TOKEN: z.string().optional(),

    // Build tools
    ANALYZE: z.string().optional(),
  },

  client: {
    // Firebase Client SDK
    NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
    NEXT_PUBLIC_AUTH_DOMAIN: z.string().min(1),
    NEXT_PUBLIC_PROJECT_ID: z.string().min(1),
    NEXT_PUBLIC_STORAGE_BUCKET: z.string().min(1),
    NEXT_PUBLIC_SENDER_ID: z.string().min(1),
    NEXT_PUBLIC_APP_ID: z.string().min(1),
    NEXT_PUBLIC_MEASUREMENT_ID: z.string().optional(),

    // Platform
    NEXT_PUBLIC_PLATFORM_WALLET: z.string().min(1),

    // TON
    NEXT_PUBLIC_TONAPI_KEY: z.string().min(1),
    NEXT_PUBLIC_TON_NETWORK: z.enum(["mainnet", "testnet"]).default("mainnet"),

    // Vercel
    NEXT_PUBLIC_VERCEL_ENV: z.string().optional(),
  },

  runtimeEnv: {
    // Server
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID,
    JWT_SECRET: process.env.JWT_SECRET,
    AES_ENCRYPTION_KEY: process.env.AES_ENCRYPTION_KEY,
    BOT_TOKEN: process.env.BOT_TOKEN,
    DEV_BOT_TOKEN: process.env.DEV_BOT_TOKEN,
    BOT_USERNAME: process.env.BOT_USERNAME,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ADMIN_API_KEY: process.env.ADMIN_API_KEY,
    ADMIN_TELEGRAM_IDS: process.env.ADMIN_TELEGRAM_IDS,
    PLATFORM_WALLET_MNEMONIC: process.env.PLATFORM_WALLET_MNEMONIC,
    PLATFORM_WALLET_VERSION: process.env.PLATFORM_WALLET_VERSION,
    CRON_SECRET: process.env.CRON_SECRET,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    CLOUDFLARE_TURN_KEY_ID: process.env.CLOUDFLARE_TURN_KEY_ID,
    CLOUDFLARE_TURN_API_TOKEN: process.env.CLOUDFLARE_TURN_API_TOKEN,
    TONAPI_KEY: process.env.TONAPI_KEY,
    TGA_AUTH_TOKEN: process.env.TGA_AUTH_TOKEN,
    ANALYZE: process.env.ANALYZE,
    // Client
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_AUTH_DOMAIN: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
    NEXT_PUBLIC_PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID,
    NEXT_PUBLIC_STORAGE_BUCKET: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
    NEXT_PUBLIC_SENDER_ID: process.env.NEXT_PUBLIC_SENDER_ID,
    NEXT_PUBLIC_APP_ID: process.env.NEXT_PUBLIC_APP_ID,
    NEXT_PUBLIC_MEASUREMENT_ID: process.env.NEXT_PUBLIC_MEASUREMENT_ID,
    NEXT_PUBLIC_PLATFORM_WALLET: process.env.NEXT_PUBLIC_PLATFORM_WALLET,
    NEXT_PUBLIC_TONAPI_KEY: process.env.NEXT_PUBLIC_TONAPI_KEY,
    NEXT_PUBLIC_TON_NETWORK: process.env.NEXT_PUBLIC_TON_NETWORK,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
  },

  // Only skip when explicitly opted out. The library internally handles the
  // client/server split — on the client it only validates NEXT_PUBLIC_ vars
  // and blocks access to server vars via proxy.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  emptyStringAsUndefined: true,
});
