import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { createCipheriv } from 'node:crypto';
import { decrypt } from '@/utils/session';
import { env } from '@/env';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

// Server-side encryption function to get the encrypted telegram ID
function encryptTelegramId(telegramId: string): string {
    const encryptionKey = Buffer.from(env.AES_ENCRYPTION_KEY, 'base64');
    const iv = Buffer.from("00000000000000000000000000000000", 'utf8');
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);

    let encrypted = cipher.update(telegramId, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return encrypted.replace(/['\"]+/g, "").replace(/[^a-zA-Z0-9]/g, "");
}

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Validate session and derive telegramId server-side
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) {
            return NextResponse.json({ error: 'Session invalid' }, { status: 401 });
        }

        let sessionData;
        try {
            sessionData = await decrypt(sessionCookie);
        } catch {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        const rawTelegramId = sessionData.user.telegramId;
        if (!rawTelegramId) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        // Encrypt the telegram ID server-side (same as transfer-qntm)
        const telegramId = encryptTelegramId(String(rawTelegramId));

        // Get all unclaimed second-tier referrals
        const secondTierRef = db.collection(`user/${telegramId}/secondTierReferrals`);
        const unclaimedSnapshot = await secondTierRef.where("claimed", "==", false).get();

        if (unclaimedSnapshot.empty) {
            return NextResponse.json({
                success: true,
                claimedAmount: 0,
                message: "No pending rewards to claim"
            });
        }

        // Calculate total unclaimed rewards
        let totalReward = 0;
        const batch = db.batch();

        unclaimedSnapshot.forEach((docSnapshot: admin.firestore.QueryDocumentSnapshot) => {
            const data = docSnapshot.data();
            totalReward += Number(data.reward) || 0;

            // Mark as claimed
            batch.update(docSnapshot.ref, {
                claimed: true,
                claimedAt: new Date().toISOString()
            });
        });

        // Update user's QuantAmount
        const valuesRef = db.doc(`user/${telegramId}/miningData/values`);
        const valuesSnapshot = await valuesRef.get();

        if (!valuesSnapshot.exists) {
            return NextResponse.json({ error: "User values not found" }, { status: 404 });
        }

        const currentAmount = valuesSnapshot.data()?.QuantAmount || 0;
        const newAmount = Number(currentAmount) + totalReward;

        batch.update(valuesRef, { QuantAmount: newAmount });

        // Execute all updates atomically
        await batch.commit();

        return NextResponse.json({
            success: true,
            claimedAmount: totalReward,
            newBalance: newAmount,
            claimedCount: unclaimedSnapshot.size
        });

    } catch (error) {
        console.error("Claim tier 2 rewards error:", error);
        return NextResponse.json(
            { error: "Failed to claim rewards" },
            { status: 500 }
        );
    }
}
