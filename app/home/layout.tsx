'use client';

import { usePathname } from "next/navigation";
import NavigationBar from "@/app/(navigation)/NavigationBar"
export default function HomeLayout({children}: {children: React.ReactNode}) {
    const pathname = usePathname();
    const showNavbar = pathname === "/home";
    return (
        <>
        {showNavbar && <NavigationBar />}
        {children}
        </>
    )
}