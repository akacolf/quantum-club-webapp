"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

interface ImageViewerProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    alt: string;
}

export default function ImageViewer({ isOpen, onClose, imageUrl, alt }: ImageViewerProps) {
    if (!imageUrl) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={onClose}
                >
                    {/* Dark overlay background */}
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

                    {/* Profile name - below safe area */}
                    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10">
                        <p className="text-sm font-semibold text-white">{alt}</p>
                    </div>

                    {/* Circular profile image - center */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full overflow-hidden ring-2 ring-white/20">
                            <Image
                                src={imageUrl}
                                alt={alt}
                                fill
                                className="object-cover"
                                unoptimized
                                priority
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
