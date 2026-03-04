import { uploadTokenImage as uploadTokenImageAction } from "@/app/ecosystem/trade/actions";

/**
 * Upload token image to Cloudinary via server action
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

        const result = await uploadTokenImageAction({ tokenId, imageData });

        if (result?.serverError) {
            console.error("Image upload failed:", result.serverError);
            return null;
        }

        if (result?.data?.success && result.data.publicUrl) {
            console.log("Image uploaded successfully:", result.data.publicUrl);
            return result.data.publicUrl;
        }

        console.error("Upload response missing publicUrl");
        return null;
    } catch (error) {
        console.error("Failed to upload image:", error);
        return null;
    }
}
