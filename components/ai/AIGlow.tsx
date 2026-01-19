"use client";

import { motion } from "framer-motion";

export function AILoadingGlow() {
    return (
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-xl">
            <motion.div
                className="absolute inset-[-50%] w-[200%] h-[200%]"
                style={{
                    background: "conic-gradient(from 0deg, transparent 0deg, #ff0080 60deg, #7928ca 120deg, #4f46e5 180deg, #0ea5e9 240deg, #ff0080 300deg, transparent 360deg)",
                    opacity: 0.2, // increased opacity for visibility
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
            <div className="absolute inset-[1px] bg-[#111] rounded-xl" />
        </div>
    );
}

import { cn } from "@/lib/utils";

export function AIGlowBorder({ 
    children, 
    isLoading, 
    className = "rounded-xl" 
}: { 
    children: React.ReactNode; 
    isLoading: boolean; 
    className?: string;
}) {
    return (
        <div className={cn("relative", className)}>
            {isLoading && (
                <motion.div
                    className={cn("absolute -inset-[2px] z-0", className)}
                    style={{
                        background: "linear-gradient(45deg, #ff0080, #7928ca, #4f46e5, #0ea5e9)",
                        backgroundSize: "300% 300%",
                        filter: "blur(8px)",
                    }}
                    animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />
            )}
            <div className={cn("relative z-10 bg-[#111] overflow-hidden", className)}>
                {children}
            </div>
        </div>
    );
}
