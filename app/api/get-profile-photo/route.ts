"use server";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { decrypt } from "@/utils/session";
import { env } from "@/env";

const getProfilePhotoSchema = z.object({
    telegramId: z.string().min(1),
});

/**
 * API endpoint to fetch a Telegram user's profile photo.
 * Proxies the image through the server to avoid exposing the bot token.
 * Returns the image as base64 data URI or null.
 */
export async function POST(req: NextRequest) {
    // Validate session
    const sessionCookie = req.cookies.get("session")?.value;
    if (!sessionCookie) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        await decrypt(sessionCookie);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const botToken = env.NEXT_PUBLIC_VERCEL_ENV === "production"
        ? env.BOT_TOKEN
        : env.DEV_BOT_TOKEN;

    if (!botToken) {
        return NextResponse.json(
            { error: "Bot token not configured" },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const parsed = getProfilePhotoSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0]?.message || "Invalid request body" },
                { status: 400 }
            );
        }
        const { telegramId } = parsed.data;

        // Step 1: Get user profile photos
        const photosUrl = `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${telegramId}&limit=1`;
        const photosResponse = await fetch(photosUrl);

        if (!photosResponse.ok) {
            return NextResponse.json({ photoUrl: null });
        }

        const photosData = await photosResponse.json();

        if (!photosData.ok || !photosData.result?.photos?.length) {
            return NextResponse.json({ photoUrl: null });
        }

        const photo = photosData.result.photos[0];
        if (!photo || photo.length === 0) {
            return NextResponse.json({ photoUrl: null });
        }

        const fileId = photo[0].file_id;

        // Step 2: Get file path from file_id
        const fileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
        const fileResponse = await fetch(fileUrl);

        if (!fileResponse.ok) {
            return NextResponse.json({ photoUrl: null });
        }

        const fileData = await fileResponse.json();

        if (!fileData.ok || !fileData.result?.file_path) {
            return NextResponse.json({ photoUrl: null });
        }

        // Step 3: Fetch the image server-side (bot token stays on server)
        const imageUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
        const imageResponse = await fetch(imageUrl);

        if (!imageResponse.ok) {
            return NextResponse.json({ photoUrl: null });
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
        const base64 = Buffer.from(imageBuffer).toString("base64");
        const photoUrl = `data:${contentType};base64,${base64}`;

        return NextResponse.json({ photoUrl });
    } catch (error) {
        console.error("Error fetching profile photo:", error);
        return NextResponse.json({ photoUrl: null });
    }
}
