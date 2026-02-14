"use client";

import React from "react";
import { TradingProvider } from "@/app/(contexts)/TradingContext";

export default function TradeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <TradingProvider>
            {children}
        </TradingProvider>
    );
}
