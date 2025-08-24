'use client';

import { usePathname } from "next/navigation";
import NavigationBar from "../(navigation)/NavigationBar";

export default function EarnLayout({children}: {children: React.ReactNode}) {
    const pathname = usePathname();
    const showNavbar = pathname === "/earn";
    return (
        <>
        {showNavbar && <NavigationBar />}
        {children}
        </>
    )
}