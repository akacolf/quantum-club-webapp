"use server";

import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to fetch a Telegram user's profile photo URL.
 * Uses the Telegram Bot API's getUserProfilePhotos and getFile methods.
 */
export async function POST(req: NextRequest) {
    const botToken = process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
        ? process.env.BOT_TOKEN
        : process.env.DEV_BOT_TOKEN;

    if (!botToken) {
        return NextResponse.json(
            { error: "Bot token not configured" },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const { telegramId } = body;

        if (!telegramId) {
            return NextResponse.json(
                { error: "telegramId is required" },
                { status: 400 }
            );
        }

        // Step 1: Get user profile photos
        const photosUrl = `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${telegramId}&limit=1`;
        const photosResponse = await fetch(photosUrl);

        if (!photosResponse.ok) {
            return NextResponse.json({ photoUrl: null });
        }

        const photosData = await photosResponse.json();

        if (!photosData.ok || !photosData.result?.photos?.length) {
            // User has no profile photo
            return NextResponse.json({ photoUrl: null });
        }

        // Get the smallest photo (first in the array is smallest)
        const photo = photosData.result.photos[0];
        if (!photo || photo.length === 0) {
            return NextResponse.json({ photoUrl: null });
        }

        // Get the file_id of the smallest size (good for thumbnails)
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

        // Step 3: Construct the full photo URL
        const photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;

        return NextResponse.json({ photoUrl });
    } catch (error) {
        console.error("Error fetching profile photo:", error);
        return NextResponse.json({ photoUrl: null });
    }
}
