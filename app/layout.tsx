import "./globals.css";
import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { Onest } from "next/font/google";
import ClientProviders from "./(providers)/ClientProviders";
import type { Metadata } from "next";
import GlobalNavigation from "./(navigation)/GlobalNavigation";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./(contexts)/auth";


const onest = Onest({
  subsets: ["latin"],
  variable: "--font-onest",
  display: "swap",
  weight: "variable",
});


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
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className={`${onest.variable} antialiased`}>
        <Script src="https://telegram.org/js/telegram-web-app.js?57"></Script>
        <AuthProvider>
        <ClientProviders>
          <div className="flex justify-center min-h-screen bg-neutral-100 dark:bg-neutral-900">
            <div className="main-content w-full max-w-md bg-background min-h-screen shadow-2xl relative">
              <div className="inner-content">
                {children}
                <GlobalNavigation />
                <Analytics />
                <SpeedInsights />
              </div>
            </div>
          </div>
          <Toaster />
        </ClientProviders>
        </AuthProvider>
      </body>
    </html>
  );
};

