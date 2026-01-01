"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TradingProvider } from "@/app/(contexts)/TradingContext";

export default function TradeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isChecking, setIsChecking] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
        // Skip check for waitlist page
        if (pathname === "/trade/waitlist") {
            setIsChecking(false);
            setHasAccess(true);
            return;
        }

        async function checkBetaAccess() {
            try {
                // Check current access status
                const checkRes = await fetch("/api/beta-access");
                const checkData = await checkRes.json();

                if (checkData.hasAccess) {
                    setHasAccess(true);
                    setIsChecking(false);
                    return;
                }

                // Try to request access
                const requestRes = await fetch("/api/beta-access", {
                    method: "POST",
                });

                if (requestRes.ok) {
                    setHasAccess(true);
                    setIsChecking(false);
                    return;
                }

                // Access denied - redirect to waitlist
                router.replace("/trade/waitlist");
            } catch (error) {
                console.error("Beta access check failed:", error);
                // On error, allow access (fail open)
                setHasAccess(true);
                setIsChecking(false);
            }
        }

        checkBetaAccess();
    }, [pathname, router]);

    // Show loading while checking
    if (isChecking) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black z-50">
                <div className="flex flex-col items-center gap-4">
                    {/* Spinner */}
                    <div className="relative flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full border-2 border-white/20 border-t-white animate-spin shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                        <div className="absolute w-10 h-10 rounded-full border-2 border-white/20 border-b-white animate-[spin_1.5s_linear_infinite_reverse]" />
                        <div className="absolute w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Checking access...
                    </p>
                </div>
            </div>
        );
    }

    if (!hasAccess) {
        return null;
    }

    return (
        <TradingProvider>
            {children}
        </TradingProvider>
    );
}
