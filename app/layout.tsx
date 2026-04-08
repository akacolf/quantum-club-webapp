import "./globals.css";
import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { Onest } from "next/font/google";
import ClientProviders from "./(providers)/ClientProviders";
import type { Metadata, Viewport } from "next";
import GlobalNavigation from "./(navigation)/GlobalNavigation";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./(contexts)/auth";
import dynamic from "next/dynamic";
import SerwistClientProvider from "./(components)/SerwistClientProvider";

const CallOverlay = dynamic(() => import("./(components)/CallOverlay"));
const IncomingCallOverlay = dynamic(() => import("./(components)/IncomingCallOverlay"));
const GroupCallOverlay = dynamic(() => import("./(components)/GroupCallOverlay"));


const onest = Onest({
  subsets: ["latin"],
  variable: "--font-onest",
  display: "swap",
  weight: "variable",
});


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Quantum Club",
  description: "The Super Ecosystem built on Telegram and TON",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Preconnect to critical API domains (includes implicit dns-prefetch) */}
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://tonapi.io" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="anonymous" />
        {/* DNS prefetch for secondary domains */}
        <link rel="dns-prefetch" href="https://cache.tonapi.io" />
        <link rel="dns-prefetch" href="https://toncenter.com" />
        <link rel="dns-prefetch" href="https://coins.llama.fi" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className={`${onest.variable} antialiased`}>
        <Script src="https://telegram.org/js/telegram-web-app.js?57" strategy="beforeInteractive"></Script>
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload"></Script>
        <SerwistClientProvider>
        <AuthProvider>
        <ClientProviders>
          <div className="flex justify-center min-h-screen bg-background">
            <div className="main-content w-full max-w-md bg-background min-h-screen relative">
              <div className="inner-content">
                {children}
                <GlobalNavigation />
                <Analytics />
                <SpeedInsights />
              </div>
            </div>
          </div>
          <CallOverlay />
          <IncomingCallOverlay />
          <GroupCallOverlay />
          <Toaster />
        </ClientProviders>
        </AuthProvider>
        </SerwistClientProvider>
      </body>
    </html>
  );
};
