'use client';

import dynamic from "next/dynamic";

const AIChatDrawer = dynamic(() => import("@/app/(components)/AIChatDrawer"), { ssr: false });

export default function HomeLayout({children}: {children: React.ReactNode}) {
    return (
        <>
        {children}
        <AIChatDrawer />
        </>
    )
}