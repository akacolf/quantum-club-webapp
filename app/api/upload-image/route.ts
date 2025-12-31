import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Lazy-initialize R2 client to ensure env vars are loaded
let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
    if (!r2Client) {
        r2Client = new S3Client({
            region: "auto",
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
            },
        });
    }
    return r2Client;
}

/**
 * Server-side image upload to R2
 * This approach avoids CORS issues by proxying the upload through our API
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tokenId, imageData, fileType } = body;

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

        // Validate environment variables
        const missingVars: string[] = [];
        if (!process.env.R2_ACCOUNT_ID) missingVars.push("R2_ACCOUNT_ID");
        if (!process.env.R2_ACCESS_KEY_ID) missingVars.push("R2_ACCESS_KEY_ID");
        if (!process.env.R2_SECRET_ACCESS_KEY) missingVars.push("R2_SECRET_ACCESS_KEY");
        if (!process.env.R2_BUCKET_NAME) missingVars.push("R2_BUCKET_NAME");

        if (missingVars.length > 0) {
            console.error("Missing R2 configuration:", missingVars.join(", "));
            return NextResponse.json(
                { error: `Storage configuration error: missing ${missingVars.join(", ")}` },
                { status: 500 }
            );
        }

        // Parse base64 image data
        let buffer: Buffer;
        let contentType = fileType || "image/webp";
        
        if (imageData.startsWith('data:')) {
            // Extract content type and base64 data from data URL
            const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches) {
                return NextResponse.json(
                    { error: "Invalid image data format" },
                    { status: 400 }
                );
            }
            contentType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
        } else {
            // Assume it's already base64
            buffer = Buffer.from(imageData, 'base64');
        }

        // Validate file size (max 5MB)
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (buffer.length > MAX_SIZE) {
            return NextResponse.json(
                { error: "Image too large. Maximum size is 5MB." },
                { status: 400 }
            );
        }

        // Determine file extension based on content type
        let extension = "webp";
        if (contentType.includes("gif")) {
            extension = "gif";
        } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
            extension = "jpg";
        } else if (contentType.includes("png")) {
            extension = "png";
        }

        const key = `tokens/${tokenId}/image.${extension}`;

        // Upload directly to R2
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable", // 1 year cache
        });

        const client = getR2Client();
        
        console.log(`Uploading image to R2: ${key} (${buffer.length} bytes)`);
        await client.send(command);
        console.log(`Successfully uploaded: ${key}`);

        // Construct public URL
        let publicUrl: string;
        const configuredPublicUrl = process.env.R2_PUBLIC_URL;
        
        if (configuredPublicUrl && configuredPublicUrl.startsWith('http')) {
            publicUrl = `${configuredPublicUrl.replace(/\/$/, '')}/${key}`;
        } else {
            // Fallback URL format
            publicUrl = `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;
        }

        return NextResponse.json({
            success: true,
            publicUrl,
            key,
        });
    } catch (error) {
        console.error("Error uploading image:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to upload image" },
            { status: 500 }
        );
    }
}
