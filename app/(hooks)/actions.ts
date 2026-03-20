"use server";

import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";
import { env } from "@/env";
import admin from "firebase-admin";
import { encryptTelegramId } from "@/utils/encrypt-telegram-id";

// ---------------------------------------------------------------------------
// getProfilePhoto — fetch Telegram user profile photo via bot token
// ---------------------------------------------------------------------------

const getProfilePhotoSchema = z.object({
    telegramId: z.string().min(1),
});

export const getProfilePhoto = authActionClient
    .schema(getProfilePhotoSchema)
    .action(async ({ parsedInput: { telegramId } }) => {
        const botToken = env.NEXT_PUBLIC_VERCEL_ENV === "production"
            ? env.BOT_TOKEN
            : env.DEV_BOT_TOKEN;

        if (!botToken) {
            return { photoUrl: null };
        }

        try {
            const photosUrl = `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${telegramId}&limit=1`;
            const photosResponse = await fetch(photosUrl);
            if (!photosResponse.ok) return { photoUrl: null };

            const photosData = await photosResponse.json();
            if (!photosData.ok || !photosData.result?.photos?.length) return { photoUrl: null };

            const photo = photosData.result.photos[0];
            if (!photo || photo.length === 0) return { photoUrl: null };

            const fileId = photo[0].file_id;
            const fileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
            const fileResponse = await fetch(fileUrl);
            if (!fileResponse.ok) return { photoUrl: null };

            const fileData = await fileResponse.json();
            if (!fileData.ok || !fileData.result?.file_path) return { photoUrl: null };

            const imageUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) return { photoUrl: null };

            const imageBuffer = await imageResponse.arrayBuffer();
            const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
            const base64 = Buffer.from(imageBuffer).toString("base64");
            const photoUrl = `data:${contentType};base64,${base64}`;

            return { photoUrl };
        } catch (error) {
            console.error("Error fetching profile photo:", error);
            return { photoUrl: null };
        }
    });

// ---------------------------------------------------------------------------
// getLeaderboardData — fetch leaderboard rankings
// ---------------------------------------------------------------------------

const getLeaderboardSchema = z.object({
    telegramId: z.string().min(1).optional(),
});

export const getLeaderboardData = authActionClient
    .schema(getLeaderboardSchema)
    .action(async ({ ctx: { session }, parsedInput: { telegramId: requestedTelegramId } }) => {
        // Resolve telegram ID from session
        const rawTelegramId = String(session.user?.telegramId || "");
        const telegramId = rawTelegramId ? encryptTelegramId(rawTelegramId) : requestedTelegramId || null;

        const valuesSnapshot = await admin.firestore()
            .collection("userRanks")
            .orderBy("QuantAmount", "desc")
            .limit(50)
            .get();

        const allValues = valuesSnapshot.docs.map((rankDoc) => ({
            id: rankDoc.id,
            username: rankDoc.data().username,
            QuantAmount: Math.round(Number(rankDoc.data().QuantAmount || 0)),
        }));

        let rank = 0;
        if (telegramId) {
            const rankSnapshot = await admin.firestore().doc(`userRanks/${telegramId}`).get();
            if (rankSnapshot.exists) {
                rank = Number(rankSnapshot.data()?.rank || 0);
            }
        }

        const colsnap = admin.firestore().collectionGroup("miningData");
        const snapshot = await colsnap
            .aggregate({
                totalAmount: admin.firestore.AggregateField.sum("QuantAmount"),
            })
            .get();

        const totalAmount = Math.round(Number(snapshot.data().totalAmount || 0));
        const usersnapshot = await admin.firestore().collection("user").count().get();
        const userCount = usersnapshot.data().count;

        return { allValues, totalAmount, rank, userCount };
    });

// ---------------------------------------------------------------------------
// fetchPriceAlerts — get price alerts for the authenticated user
// ---------------------------------------------------------------------------

export const fetchPriceAlerts = authActionClient
    .schema(z.object({}))
    .action(async ({ ctx: { session } }) => {
        const telegramId = String(session.user.telegramId);

        const snapshot = await firestore
            .collection("priceAlerts")
            .where("telegramId", "==", telegramId)
            .orderBy("createdAt", "desc")
            .get();

        const alerts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return { alerts };
    });
