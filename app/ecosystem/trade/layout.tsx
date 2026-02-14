"use client";

import React from "react";
import dynamic from "next/dynamic";
import { TradingProvider } from "@/app/(contexts)/TradingContext";

const AIChatDrawer = dynamic(() => import("@/app/(components)/AIChatDrawer"), { ssr: false });

export default function TradeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <TradingProvider>
            {children}
            <AIChatDrawer />
        </TradingProvider>
    );
}
