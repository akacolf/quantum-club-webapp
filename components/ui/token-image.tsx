"use client";

import Image from "next/image";

interface TokenImageProps {
    src: string | undefined | null;
    alt: string;
    width: number;
    height: number;
    className?: string;
    fallback?: React.ReactNode;
}

/**
 * Token image component with safe error handling
 * Uses regular Next.js Image for all URLs (simpler and more reliable)
 */
export function TokenImage({ src, alt, width, height, className, fallback }: TokenImageProps) {
    if (!src) {
        return fallback || null;
    }

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

