// Development utilities for testing the trading platform
// This file provides functions to seed test data and bypass requirements in dev mode

import { dbfs } from "@/app/(firebase)/client";
import { doc, setDoc, serverTimestamp, collection, getDocs, query, limit } from "firebase/firestore";
import { DEFAULT_BONDING_CURVE, DEFAULT_ANTI_DUMP_CONFIG, DEFAULT_GRADUATION_THRESHOLD } from "@/types/trading";

// Check if we're in development mode
export const isDevelopment = process.env.NODE_ENV === "development";

// Generate a random token ID
const generateTokenId = () => {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Sample token data for seeding
const sampleTokens = [
    {
        name: "Quantum Cat",
        symbol: "QCAT",
        description: "The first quantum-powered meme cat on TON! 🐱⚛️",
        image: "",
    },
    {
        name: "Moon Rocket",
        symbol: "MOON",
        description: "Destination: Moon. Fuel: Community. LFG! 🚀🌕",
        image: "",
    },
    {
        name: "Diamond Hands",
        symbol: "DMH",
        description: "For those who never sell. 💎🙌",
        image: "",
    },
    {
        name: "Pepe TON",
        symbol: "PTON",
        description: "The rarest Pepe on TON blockchain. Ultra rare. 🐸",
        image: "",
    },
    {
        name: "Wojak Finance",
        symbol: "WOJAK",
        description: "When you buy the top and it keeps going up. 📈",
        image: "",
    },
];

// Create a test token in Firestore
export async function createTestToken(
    creatorId: string,
    creatorUsername: string,
    tokenData?: {
        name: string;
        symbol: string;
        description: string;
        image: string;
    }
) {
    const data = tokenData || sampleTokens[Math.floor(Math.random() * sampleTokens.length)];
    const tokenId = generateTokenId();

    // Random starting values for variety
    const randomMultiplier = 1 + Math.random() * 5; // 1x to 6x from base
    const basePrice = BigInt(Math.floor(10000 * randomMultiplier)); // NanoTON
    const randomSupply = BigInt(Math.floor(Math.random() * 1000000000000000)); // Random supply
    const randomVolume = (Math.random() * 100).toFixed(2);
    const randomHolders = Math.floor(Math.random() * 50) + 1;
    const randomTrades = Math.floor(Math.random() * 200) + 10;
    const randomPriceChange = (Math.random() * 40) - 20; // -20% to +20%

    const tokenDoc = {
        // Metadata
        name: data.name,
        symbol: data.symbol,
        description: data.description,
        image: data.image,
        nameLower: data.name.toLowerCase(),
        creatorId,
        creatorUsername,
        createdAt: serverTimestamp(),

        // Supply & pricing
        totalSupply: randomSupply.toString(),
        currentPrice: basePrice.toString(),
        marketCap: (basePrice * randomSupply / BigInt(1e9)).toString(),
        volume24h: randomVolume,
        priceChange24h: randomPriceChange,

        // Bonding curve
        bondingCurve: DEFAULT_BONDING_CURVE,

        // Anti-dump configuration
        antiDumpConfig: DEFAULT_ANTI_DUMP_CONFIG,

        // Status
        status: "bonding",
        graduationThreshold: DEFAULT_GRADUATION_THRESHOLD,

        // Stats
        holders: randomHolders,
        trades: randomTrades,
    };

    const tokenRef = doc(dbfs, `tokens/${tokenId}`);
    await setDoc(tokenRef, tokenDoc);

    return { id: tokenId, ...tokenDoc, createdAt: new Date() };
}

// Seed multiple test tokens
export async function seedTestTokens(creatorId: string, creatorUsername: string, count: number = 5) {
    const tokens = [];

    for (let i = 0; i < Math.min(count, sampleTokens.length); i++) {
        try {
            const token = await createTestToken(creatorId, creatorUsername, sampleTokens[i]);
            tokens.push(token);
            console.log(`✅ Created test token: ${token.name} (${token.symbol})`);
        } catch (error) {
            console.error(`❌ Failed to create token ${sampleTokens[i].name}:`, error);
        }
    }

    return tokens;
}

// Check if test tokens already exist
export async function hasTestTokens(): Promise<boolean> {
    try {
        const tokensRef = collection(dbfs, "tokens");
        const q = query(tokensRef, limit(1));
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch {
        return false;
    }
}

// Initialize test data if needed
export async function initializeTestData(userId: string, username: string): Promise<boolean> {
    if (!isDevelopment) {
        console.log("Test data initialization is only available in development mode");
        return false;
    }

    const hasTokens = await hasTestTokens();
    if (hasTokens) {
        console.log("Test tokens already exist");
        return true;
    }

    console.log("Seeding test tokens...");
    await seedTestTokens(userId, username, 5);
    console.log("Test data initialization complete!");
    return true;
}

// Create a test position (simulate buying a token)
export async function createTestPosition(
    userId: string,
    tokenId: string,
    amount: string = "1000000000" // 1B tokens
) {
    if (!isDevelopment) return null;

    const positionRef = doc(dbfs, `users/${userId}/positions/${tokenId}`);
    const now = new Date();

    const position = {
        tokenId,
        balance: amount,
        vestedBalance: (BigInt(amount) / BigInt(2)).toString(), // 50% vested
        vestingSchedule: [
            { amount: (BigInt(amount) / BigInt(2)).toString(), unlocksAt: now, isUnlocked: true },
            { amount: (BigInt(amount) / BigInt(2)).toString(), unlocksAt: new Date(now.getTime() + 6 * 60 * 60 * 1000), isUnlocked: false },
        ],
        averageBuyPrice: "10000", // 0.00001 TON
        totalInvested: "10000000000", // 10 TON
        unrealizedPnl: "0",
        unrealizedPnlPercent: 0,
        createdAt: serverTimestamp(),
    };

    await setDoc(positionRef, position);
    console.log(`✅ Created test position for token ${tokenId}`);
    return position;
}

// Create test trade history
export async function createTestTrade(
    tokenId: string,
    userId: string,
    username: string,
    type: "buy" | "sell" = "buy"
) {
    if (!isDevelopment) return null;

    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tradeRef = doc(dbfs, `tokens/${tokenId}/trades/${tradeId}`);

    const amount = BigInt(Math.floor(Math.random() * 1000000000000)); // Random amount
    const price = BigInt(Math.floor(Math.random() * 100000)); // Random price

    const trade = {
        id: tradeId,
        tokenId,
        type,
        userId,
        username,
        amount: amount.toString(),
        price: price.toString(),
        totalTon: ((amount * price) / BigInt(1e9)).toString(),
        timestamp: serverTimestamp(),
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        status: "completed",
    };

    await setDoc(tradeRef, trade);
    console.log(`✅ Created test ${type} trade for token ${tokenId}`);
    return trade;
}

// Clear all test tokens (for resetting)
export async function clearTestTokens() {
    if (!isDevelopment) {
        console.log("Clear function is only available in development mode");
        return false;
    }

    try {
        const tokensRef = collection(dbfs, "tokens");
        const snapshot = await getDocs(tokensRef);

        const deletePromises = snapshot.docs.map(async (docSnapshot) => {
            const { deleteDoc: deleteFsDoc } = await import("firebase/firestore");
            await deleteFsDoc(docSnapshot.ref);
        });

        await Promise.all(deletePromises);
        console.log(`✅ Cleared ${snapshot.docs.length} test tokens`);
        return true;
    } catch (error) {
        console.error("Failed to clear test tokens:", error);
        return false;
    }
}

// Generate random price movement for a token
export async function simulatePriceMovement(tokenId: string) {
    if (!isDevelopment) return null;

    const { getDoc, updateDoc } = await import("firebase/firestore");
    const tokenRef = doc(dbfs, `tokens/${tokenId}`);
    const tokenSnap = await getDoc(tokenRef);

    if (!tokenSnap.exists()) return null;

    const token = tokenSnap.data();
    const currentPrice = BigInt(token.currentPrice || "10000");

    // Random price change between -10% and +15%
    const changePercent = (Math.random() * 25) - 10;
    const multiplier = 100 + Math.floor(changePercent);
    const newPrice = (currentPrice * BigInt(multiplier)) / BigInt(100);

    await updateDoc(tokenRef, {
        currentPrice: newPrice.toString(),
        priceChange24h: changePercent,
        volume24h: (parseFloat(token.volume24h || "0") + Math.random() * 10).toFixed(2),
        trades: (token.trades || 0) + Math.floor(Math.random() * 5) + 1,
    });

    console.log(`📈 Simulated price movement for ${tokenId}: ${changePercent.toFixed(2)}%`);
    return { newPrice: newPrice.toString(), changePercent };
}

