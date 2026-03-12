"use client";

import React from "react";
import dynamic from "next/dynamic";

const AIChatDrawer = dynamic(() => import("@/app/(components)/AIChatDrawer"), { ssr: false });

export default function TradeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {children}
            <AIChatDrawer />
        </>
    );
}
