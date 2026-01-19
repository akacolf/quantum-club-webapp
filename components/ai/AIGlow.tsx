"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AILoadingGlow() {
    return (
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-xl">
            <motion.div
                className="absolute inset-[-50%] w-[200%] h-[200%]"
                style={{
                    background: "conic-gradient(from 0deg, transparent 0deg, #ff0080 60deg, #7928ca 120deg, #4f46e5 180deg, #0ea5e9 240deg, #ff0080 300deg, transparent 360deg)",
                    opacity: 0.2,
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

export function AIGlowBorder({ 
    children, 
    isLoading,
    className,
}: { 
    children: React.ReactNode; 
    isLoading: boolean; 
    className?: string;
}) {
    return (
        <div className={cn("relative rounded-xl", className)}>
            {isLoading && (
                <motion.div
                    className="absolute -inset-[2px] rounded-xl z-0"
                    style={{
                        background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7, #d946ef, #ec4899, #f43f5e)",
                        backgroundSize: "400% 400%",
                    }}
                    animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            )}
            <div className={cn("relative z-10 rounded-xl overflow-hidden", className)}>
                {children}
            </div>
        </div>
    );
}
