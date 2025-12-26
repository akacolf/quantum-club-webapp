// Price History Service
// This can be called by a Cloud Function every minute, or triggered after each trade

import { dbfs } from "@/app/(firebase)/client";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

export async function savePriceSnapshot(tokenId: string): Promise<void> {
    try {
        // Get current token data
        const tokenRef = doc(dbfs, `tokens/${tokenId}`);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) return;

        const token = tokenSnap.data();
        const currentPrice = token.currentPrice || "0";
        const marketCap = token.marketCap || "0";

        // Create snapshot ID based on timestamp (1-minute buckets)
        const now = new Date();
        const bucketId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

        // Save price snapshot
        await setDoc(doc(dbfs, `tokens/${tokenId}/priceHistory/${bucketId}`), {
            price: currentPrice,
            marketCap: marketCap,
            timestamp: serverTimestamp(),
            open: currentPrice, // For candlestick charts
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
        }, { merge: true });

    } catch (error) {
        console.error("Error saving price snapshot:", error);
    }
}

// Call this after each trade to update the current minute's candle
export async function updatePriceCandle(
    tokenId: string,
    price: string,
): Promise<void> {
    try {
        const now = new Date();
        const bucketId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

        const candleRef = doc(dbfs, `tokens/${tokenId}/priceHistory/${bucketId}`);
        const candleSnap = await getDoc(candleRef);

        if (candleSnap.exists()) {
            const data = candleSnap.data();
            const currentHigh = BigInt(data.high || "0");
            const currentLow = BigInt(data.low || price);
            const newPrice = BigInt(price);

            await setDoc(candleRef, {
                close: price,
                high: newPrice > currentHigh ? price : data.high,
                low: newPrice < currentLow ? price : data.low,
                timestamp: serverTimestamp(),
            }, { merge: true });
        } else {
            // New candle
            await setDoc(candleRef, {
                open: price,
                high: price,
                low: price,
                close: price,
                timestamp: serverTimestamp(),
            });
        }
    } catch (error) {
        console.error("Error updating price candle:", error);
    }
}
