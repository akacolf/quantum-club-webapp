"use client";

import Image from "next/image";
import { CldImage } from "next-cloudinary";

interface TokenImageProps {
    src: string | undefined | null;
    alt: string;
    width: number;
    height: number;
    className?: string;
    fallback?: React.ReactNode;
}

/**
 * Smart token image component that uses CldImage for Cloudinary URLs
 * and falls back to regular Image for other URLs
 */
export function TokenImage({ src, alt, width, height, className, fallback }: TokenImageProps) {
    if (!src) {
        return fallback || null;
    }

    // Check if it's a Cloudinary URL
    const isCloudinary = src.includes("res.cloudinary.com");

    if (isCloudinary) {
        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{ext}
        const match = src.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
        const publicId = match ? match[1] : src;

        return (
            <CldImage
                src={publicId}
                alt={alt}
                width={width}
                height={height}
                className={className}
                crop="fill"
                gravity="auto"
            />
        );
    }

    // Regular image URL
    return (
        <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={className}
            unoptimized
        />
    );
}

/**
 * Token image that fills its container
 */
export function TokenImageFill({ src, alt, className, fallback }: Omit<TokenImageProps, "width" | "height">) {
    if (!src) {
        return fallback || null;
    }

    // Check if it's a Cloudinary URL
    const isCloudinary = src.includes("res.cloudinary.com");

    if (isCloudinary) {
        // Extract public_id from Cloudinary URL
        const match = src.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
        const publicId = match ? match[1] : src;

        return (
            <CldImage
                src={publicId}
                alt={alt}
                fill
                className={className}
                crop="fill"
                gravity="auto"
                sizes="(max-width: 768px) 100px, 150px"
            />
        );
    }

    // Regular image URL
    return (
        <Image
            src={src}
            alt={alt}
            fill
            className={className}
            unoptimized
        />
    );
}
