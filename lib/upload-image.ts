/**
 * Upload token image to Cloudinary via server-side proxy
 * Cloudinary provides reliable CDN URLs with auto-optimization
 */
export async function uploadTokenImage(
    tokenId: string,
    imageData: string
): Promise<string | null> {
    try {
        // If it's already a URL, return it as-is
        if (!imageData.startsWith("data:")) {
            return imageData;
        }

        console.log("Uploading image to Cloudinary...");

        const response = await fetch("/api/upload-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tokenId,
                imageData,
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
