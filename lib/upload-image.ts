import { storage } from "@/app/(firebase)/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Upload token image to Firebase Storage
 * This is simpler and more reliable than R2 pre-signed URLs
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

        console.log("Uploading image to Firebase Storage...");

        // Extract content type and base64 data
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            console.error("Invalid image data format");
            return null;
        }

        const contentType = matches[1];
        const base64Data = matches[2];

        // Convert base64 to Blob
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: contentType });

        // Determine file extension
        let extension = "webp";
        if (contentType.includes("gif")) {
            extension = "gif";
        } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
            extension = "jpg";
        } else if (contentType.includes("png")) {
            extension = "png";
        }

        // Upload to Firebase Storage
        const storageRef = ref(storage, `tokens/${tokenId}/image.${extension}`);
        const snapshot = await uploadBytes(storageRef, blob, {
            contentType,
            cacheControl: "public, max-age=31536000, immutable",
        });

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log("Image uploaded successfully:", downloadURL);

        return downloadURL;
    } catch (error) {
        console.error("Failed to upload image:", error);
        return null;
    }
}
