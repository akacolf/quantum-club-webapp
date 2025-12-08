"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowDown } from "lucide-react";

interface PendingTransaction {
    event_id: string;
    type: string;
    amount?: string;
    symbol?: string;
    timestamp: number;
}

interface IncomingAssetsBannerProps {
    pendingTransactions: PendingTransaction[];
    isLoading?: boolean;
}

export function IncomingAssetsBanner({ pendingTransactions, isLoading }: IncomingAssetsBannerProps) {
    const hasPending = pendingTransactions.length > 0;

    if (!hasPending && !isLoading) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="w-full"
            >
                <div className="bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 border border-blue-500/30 rounded-xl p-3 flex items-center gap-3 relative overflow-hidden">
                    {/* Animated shimmer effect */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />

                    <div className="relative flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center">
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                            ) : (
                                <motion.div
                                    animate={{ y: [0, 3, 0] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    <ArrowDown className="w-4 h-4 text-blue-400" />
                                </motion.div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">
                                {isLoading ? "Checking for transactions..." : (
                                    pendingTransactions.length === 1
                                        ? "Transaction in progress"
                                        : `${pendingTransactions.length} transactions in progress`
                                )}
                            </p>
                            <p className="text-xs text-blue-300/70">
                                {isLoading ? "Please wait" : "Assets are on their way to your wallet"}
                            </p>
                        </div>
                    </div>

                    {/* Pulse indicator */}
                    {hasPending && (
                        <div className="ml-auto relative">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
