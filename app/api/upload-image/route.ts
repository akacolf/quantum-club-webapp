import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export async function POST(req: NextRequest) {
    try {
        const { tokenId, fileType } = await req.json();

        if (!tokenId) {
            return NextResponse.json(
                { error: "Token ID is required" },
                { status: 400 }
            );
        }

        // Validate environment variables with detailed logging
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

        // Determine file extension based on content type
        let extension = "webp";
        if (fileType?.includes("gif")) {
            extension = "gif";
        } else if (fileType?.includes("jpeg") || fileType?.includes("jpg")) {
            extension = "jpg";
        } else if (fileType?.includes("png")) {
            extension = "png";
        }

        const key = `tokens/${tokenId}/image.${extension}`;

        // Create pre-signed URL for upload (valid for 5 minutes)
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            ContentType: fileType || "image/webp",
            CacheControl: "public, max-age=31536000, immutable", // 1 year cache
        });

        const client = getR2Client();
        const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

        // Construct public URL
        // Use R2_PUBLIC_URL if provided, otherwise log a warning
        let publicUrl: string;
        const configuredPublicUrl = process.env.R2_PUBLIC_URL;
        console.log("R2_PUBLIC_URL from env:", configuredPublicUrl ? `"${configuredPublicUrl}"` : "NOT SET");
        
        if (configuredPublicUrl && configuredPublicUrl.startsWith('http')) {
            publicUrl = `${configuredPublicUrl.replace(/\/$/, '')}/${key}`;
        } else {
            // Fallback: This URL format requires enabling public access on the R2 bucket
            // The actual subdomain is shown in your Cloudflare dashboard when you enable public access
            console.warn("R2_PUBLIC_URL not set or invalid. Using constructed URL - make sure public access is enabled on your bucket.");
            publicUrl = `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;
        }

        return NextResponse.json({
            uploadUrl,
            publicUrl,
            key,
        });
    } catch (error) {
        console.error("Error generating upload URL:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate upload URL" },
            { status: 500 }
        );
    }
}

