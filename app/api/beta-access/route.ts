import { NextResponse } from "next/server";
import { getSession } from "@/utils/session";
import { firestore as adminDb } from "@/app/(firebase)/server";
import { FieldValue } from "firebase-admin/firestore";

const BETA_CONFIG_DOC = "betaAccess/config";
const BETA_USERS_COLLECTION = "betaAccess/config/users";

/**
 * GET /api/beta-access
 * Check if current user has beta access
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session?.user?.telegramId) {
            return NextResponse.json({ hasAccess: false, reason: "not_logged_in" });
        }

        const telegramId = String(session.user.telegramId);

        // Check if user already has access
        const userDoc = await adminDb.doc(`${BETA_USERS_COLLECTION}/${telegramId}`).get();
        
        if (userDoc.exists) {
            return NextResponse.json({ hasAccess: true });
        }

        // Check beta config
        const configDoc = await adminDb.doc(BETA_CONFIG_DOC).get();
        
        if (!configDoc.exists) {
            // Beta not configured - allow all
            return NextResponse.json({ hasAccess: true, reason: "beta_not_configured" });
        }

        const config = configDoc.data()!;
        
        if (!config.enabled) {
            // Beta disabled - allow all
            return NextResponse.json({ hasAccess: true, reason: "beta_disabled" });
        }

        const currentCount = config.currentCount || 0;
        const maxUsers = config.maxUsers || 100;

        if (currentCount >= maxUsers) {
            return NextResponse.json({ 
                hasAccess: false, 
                reason: "beta_full",
                spotsRemaining: 0,
                position: currentCount + 1
            });
        }

        return NextResponse.json({ 
            hasAccess: false, 
            reason: "not_enrolled",
            spotsRemaining: maxUsers - currentCount
        });
    } catch (error) {
        console.error("Beta access check error:", error);
        return NextResponse.json({ hasAccess: true, reason: "error_fallback" });
    }
}

/**
 * POST /api/beta-access
 * Request beta access (grants if spots available)
 */
export async function POST() {
    try {
        const session = await getSession();
        if (!session?.user?.telegramId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const telegramId = String(session.user.telegramId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const username = (session.user as any).username || "";

        // Check if user already has access
        const userRef = adminDb.doc(`${BETA_USERS_COLLECTION}/${telegramId}`);
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
            return NextResponse.json({ success: true, message: "Already enrolled" });
        }

        // Get config and check availability
        const configRef = adminDb.doc(BETA_CONFIG_DOC);
        const configDoc = await configRef.get();
        
        if (!configDoc.exists) {
            // Create default config and grant access
            await configRef.set({
                maxUsers: 100,
                currentCount: 1,
                enabled: true,
                createdAt: FieldValue.serverTimestamp()
            });
            
            await userRef.set({
                grantedAt: FieldValue.serverTimestamp(),
                username
            });
            
            return NextResponse.json({ success: true, message: "Access granted" });
        }

        const config = configDoc.data()!;
        
        if (!config.enabled) {
            // Beta disabled - grant access without counting
            await userRef.set({
                grantedAt: FieldValue.serverTimestamp(),
                username,
                grantedWhileDisabled: true
            });
            return NextResponse.json({ success: true, message: "Access granted" });
        }

        const currentCount = config.currentCount || 0;
        const maxUsers = config.maxUsers || 100;

        if (currentCount >= maxUsers) {
            return NextResponse.json(
                { error: "Beta is full", spotsRemaining: 0 },
                { status: 403 }
            );
        }

        // Use transaction for atomic counter update
        await adminDb.runTransaction(async (transaction) => {
            const freshConfig = await transaction.get(configRef);
            const count = freshConfig.data()?.currentCount || 0;
            
            if (count >= maxUsers) {
                throw new Error("Beta full");
            }

            transaction.update(configRef, {
                currentCount: FieldValue.increment(1)
            });
            
            transaction.set(userRef, {
                grantedAt: FieldValue.serverTimestamp(),
                username,
                position: count + 1
            });
        });

        return NextResponse.json({ success: true, message: "Access granted" });
    } catch (error) {
        console.error("Beta access grant error:", error);
        
        if (error instanceof Error && error.message === "Beta full") {
            return NextResponse.json(
                { error: "Beta is full" },
                { status: 403 }
            );
        }
        
        return NextResponse.json(
            { error: "Failed to grant access" },
            { status: 500 }
        );
    }
}
