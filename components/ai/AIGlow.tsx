"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AILoadingGlow() {
    return (
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-lg">
            <motion.div
                className="absolute inset-[-50%] w-[200%] h-[200%]"
                style={{
                    background: "rgba(255,255,255,0.16)",
                    opacity: 0.3,
                }}
                animate={{
                    rotate: 360,
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />
            <div className="absolute inset-[1px] bg-[#111] rounded-lg" />
        </div>
    );
}

interface AIGlowBorderProps {
    children: React.ReactNode;
    isLoading: boolean;
    className?: string;
}

export function AIGlowBorder({ 
    children, 
    isLoading,
    className,
}: AIGlowBorderProps) {
    return (
        <div className={cn("relative", className)}>
            {isLoading && (
                <motion.div
                    className="absolute -inset-[1px] rounded-lg z-0"
                    style={{
                        background: "rgba(255,255,255,0.18)",
                        backgroundSize: "200% 100%",
                    }}
                    animate={{
                        backgroundPosition: ["0% 0%", "200% 0%"],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />
            )}
            <div className={cn("relative z-10 rounded-lg", className)}>
                {children}
            </div>
        </div>
    );
}
