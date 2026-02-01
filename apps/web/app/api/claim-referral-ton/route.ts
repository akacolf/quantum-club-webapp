"use server";

import { NextResponse } from "next/server";
import { getSession } from "@/utils/session";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";

/**
 * POST /api/claim-referral-ton
 * 
 * Securely claim pending TON referral earnings.
 * - Authenticated via session (telegramId)
 * - Reads from user/{telegramId}/referralEarnings/ton
 * - Updates pendingAmount to 0 and increments claimedAmount
 * - Records claim transaction for audit
 * 
 * TON transfer to wallet is handled separately via on-chain transaction
 * queued by the admin/payout system.
 */
export async function POST() {
    try {
        // Authentication check
        const session = await getSession();
        if (!session || !session.user?.telegramId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const telegramId = String(session.user.telegramId);

        // Get user's referral earnings document
        const earningsRef = adminDb.doc(`user/${telegramId}/referralEarnings/ton`);
        const earningsDoc = await earningsRef.get();

        if (!earningsDoc.exists) {
            return NextResponse.json({
                success: true,
                claimedAmount: 0,
                message: "No pending earnings to claim",
            });
        }

        const earningsData = earningsDoc.data();
        const pendingAmount = Number(earningsData?.pendingAmount) || 0;

        if (pendingAmount <= 0) {
            return NextResponse.json({
                success: true,
                claimedAmount: 0,
                message: "No pending earnings to claim",
            });
        }

        // Get user's wallet address for payout
        const userDoc = await adminDb.doc(`user/${telegramId}`).get();
        const walletAddress = userDoc.data()?.walletAddress;

        if (!walletAddress) {
            return NextResponse.json(
                { error: "No wallet address found. Please set up your QC Wallet first." },
                { status: 400 }
            );
        }

        // Use transaction to ensure atomicity
        await adminDb.runTransaction(async (transaction) => {
            // Re-read earnings within transaction
            const freshEarningsDoc = await transaction.get(earningsRef);
            const freshPending = Number(freshEarningsDoc.data()?.pendingAmount) || 0;

            if (freshPending <= 0) {
                throw new Error("No pending earnings");
            }

            // Update earnings document
            transaction.update(earningsRef, {
                pendingAmount: 0,
                claimedAmount: FieldValue.increment(freshPending),
                lastClaimAt: FieldValue.serverTimestamp(),
            });

            // Create claim record for audit trail
            const claimRef = adminDb.collection(`user/${telegramId}/referralClaims`).doc();
            transaction.set(claimRef, {
                amount: freshPending,
                walletAddress,
                status: "pending_payout", // Will be updated to "completed" after on-chain transfer
                createdAt: FieldValue.serverTimestamp(),
            });

            // Add to global payout queue for admin processing
            const payoutRef = adminDb.collection("referralPayouts").doc();
            transaction.set(payoutRef, {
                telegramId,
                walletAddress,
                amount: freshPending,
                status: "pending",
                createdAt: FieldValue.serverTimestamp(),
            });
        });

        return NextResponse.json({
            success: true,
            claimedAmount: pendingAmount,
            message: "Claim submitted! TON will be sent to your wallet shortly.",
        });
    } catch (error) {
        console.error("Claim referral TON error:", error);
        
        if (error instanceof Error && error.message === "No pending earnings") {
            return NextResponse.json({
                success: true,
                claimedAmount: 0,
                message: "No pending earnings to claim",
            });
        }

        return NextResponse.json(
            { error: "Failed to process claim. Please try again." },
            { status: 500 }
        );
    }
}

/**
 * GET /api/claim-referral-ton
 * 
 * Get current referral earnings balance.
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session || !session.user?.telegramId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const telegramId = String(session.user.telegramId);
        const earningsRef = adminDb.doc(`user/${telegramId}/referralEarnings/ton`);
        const earningsDoc = await earningsRef.get();

        if (!earningsDoc.exists) {
            return NextResponse.json({
                pendingAmount: 0,
                claimedAmount: 0,
                totalEarned: 0,
            });
        }

        const data = earningsDoc.data();
        const pending = Number(data?.pendingAmount) || 0;
        const claimed = Number(data?.claimedAmount) || 0;

        return NextResponse.json({
            pendingAmount: pending,
            claimedAmount: claimed,
            totalEarned: pending + claimed,
        });
    } catch (error) {
        console.error("Get referral earnings error:", error);
        return NextResponse.json(
            { error: "Failed to fetch earnings" },
            { status: 500 }
        );
    }
}
