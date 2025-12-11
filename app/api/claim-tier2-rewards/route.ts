import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID!,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
            privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        }),
    });
}

const db = admin.firestore();

export async function POST(request: Request) {
    try {
        const { telegramId } = await request.json();

        if (!telegramId) {
            return NextResponse.json({ error: "Missing telegramId" }, { status: 400 });
        }

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
