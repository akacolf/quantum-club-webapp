"use client";

import React from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ImageViewerProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    alt: string;
}

export default function ImageViewer({ isOpen, onClose, imageUrl, alt }: ImageViewerProps) {
    if (!imageUrl) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                side="bottom"
                className="h-[85vh] bg-background/95 backdrop-blur-xl border-white/10 p-0 overflow-hidden"
            >
                <VisuallyHidden>
                    <SheetTitle>{alt}</SheetTitle>
                </VisuallyHidden>

                <div className="relative w-full h-full flex flex-col">
                    {/* Header with close button */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <p className="text-sm font-medium text-white truncate">{alt}</p>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-white"
                            onClick={onClose}
                        >
                            <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Image container */}
                    <div className="flex-1 relative flex items-center justify-center bg-black/30 p-4">
                        <div className="relative w-full h-full max-w-md mx-auto">
                            <Image
                                src={imageUrl}
                                alt={alt}
                                fill
                                className="object-contain"
                                unoptimized
                                priority
                            />
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
