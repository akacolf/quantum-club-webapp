/**
 * Upload token image to Cloudflare R2 via server-side proxy
 * This approach avoids CORS issues by sending the image through our API
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

        console.log("Uploading image via server-side proxy...");

        // Send the image data to our API which will upload to R2
        const response = await fetch("/api/upload-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tokenId,
                imageData, // Send the full base64 data URL
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Image upload failed:", response.status, errorData);
            return null;
        }

        const result = await response.json();
        
        if (result.success && result.publicUrl) {
            console.log("Image uploaded successfully:", result.publicUrl);
            return result.publicUrl;
        }

        console.error("Upload response missing publicUrl:", result);
        return null;
    } catch (error) {
        console.error("Failed to upload image:", error);
        return null;
    }
}
