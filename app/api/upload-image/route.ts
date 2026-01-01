import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/upload-image
 * 
 * Upload token image to Cloudinary
 * Returns permanent public URL
 */
export async function POST(req: NextRequest) {
    try {
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
            folder: "quantum-club-tokens",
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
