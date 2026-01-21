import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getSession } from "@/utils/session";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Rate limiting for uploads
const uploadRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_UPLOADS_PER_HOUR = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * POST /api/upload-image
 * 
 * Upload token image to Cloudinary
 * Returns permanent public URL
 */
export async function POST(req: NextRequest) {
    try {
        // Session authentication
        const session = await getSession();
        if (!session || !session.user?.telegramId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const telegramId = String(session.user.telegramId);
        
        // Rate limiting
        const now = Date.now();
        const userRateLimit = uploadRateLimitMap.get(telegramId);
        
        if (userRateLimit) {
            if (now < userRateLimit.resetTime) {
                if (userRateLimit.count >= MAX_UPLOADS_PER_HOUR) {
                    return NextResponse.json(
                        { error: "Upload rate limit exceeded. Max 20 uploads per hour." },
                        { status: 429 }
                    );
                }
                userRateLimit.count++;
            } else {
                uploadRateLimitMap.set(telegramId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
            }
        } else {
            uploadRateLimitMap.set(telegramId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        }
        
        const { tokenId, imageData } = await req.json();

        if (!tokenId) {
            return NextResponse.json(
                { error: "Token ID is required" },
                { status: 400 }
            );
        }

        if (!imageData) {
            return NextResponse.json(
                { error: "Image data is required" },
                { status: 400 }
            );
        }

        // Validate Cloudinary config
        if (!process.env.CLOUDINARY_CLOUD_NAME || 
            !process.env.CLOUDINARY_API_KEY || 
            !process.env.CLOUDINARY_API_SECRET) {
            console.error("Missing Cloudinary configuration");
            return NextResponse.json(
                { error: "Image upload not configured" },
                { status: 500 }
            );
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(imageData, {
            folder: "qcrocketstart-jettons",
            public_id: tokenId,
            overwrite: true,
            resource_type: "image",
            // Auto-optimize for web
            transformation: [
                { quality: "auto", fetch_format: "auto" }
            ],
        });

        console.log("Cloudinary upload success:", result.secure_url);

        return NextResponse.json({
            success: true,
            publicUrl: result.secure_url,
            publicId: result.public_id,
        });
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Upload failed" },
            { status: 500 }
        );
    }
}
