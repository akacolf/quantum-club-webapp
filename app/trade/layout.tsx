"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TradingProvider } from "@/app/(contexts)/TradingContext";
import Loader from "@/app/(components)/Loader";

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
            <div className="fixed inset-0 flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-2">
                    <Loader />
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
