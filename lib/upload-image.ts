/**
 * Upload token image to Cloudflare R2
 * Uses pre-signed URLs for secure direct uploads
 */
export async function uploadTokenImage(
    tokenId: string,
    imageData: string
): Promise<string | null> {
    try {
        // If it's already a URL, return it as-is
        if (!imageData.startsWith('data:')) {
            return imageData;
        }

        // Extract content type and base64 data
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            console.error("Invalid base64 image data");
            return null;
        }

        const contentType = matches[1];
        const base64Data = matches[2];

        // Convert base64 to blob
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: contentType });

        // Request pre-signed upload URL from our API
        const response = await fetch("/api/upload-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tokenId,
                fileType: contentType,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Failed to get upload URL:", errorData);
            return null;
        }

        const { uploadUrl, publicUrl } = await response.json();

        console.log("Uploading to R2 with pre-signed URL...");
        console.log("Upload URL domain:", new URL(uploadUrl).hostname);
        
        // Upload directly to R2 using pre-signed URL
        const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            body: blob,
            headers: {
                "Content-Type": contentType,
            },
            mode: "cors", // Explicitly request CORS
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text().catch(() => "");
            console.error("Failed to upload to R2:", {
                status: uploadResponse.status,
                statusText: uploadResponse.statusText,
                errorText,
            });
            return null;
        }

        console.log("Image uploaded successfully to R2:", publicUrl);
        return publicUrl;
    } catch (error) {
        // More detailed error for CORS issues
        if (error instanceof TypeError && (error.message.includes("Failed to fetch") || error.message.includes("NetworkError"))) {
            console.error("R2 Upload CORS Error: The R2 bucket needs CORS configuration to allow uploads from this origin.");
            console.error("Add your domain to AllowedOrigins in R2 bucket settings:", window.location.origin);
        } else {
            console.error("Failed to upload image:", error);
        }
        return null;
    }
}
