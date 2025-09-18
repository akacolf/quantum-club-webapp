import "./globals.css";
import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { Inter } from "next/font/google";
import ClientProviders from "./(providers)/ClientProviders";
import type { Metadata } from "next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})


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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <Script src="https://telegram.org/js/telegram-web-app.js?57"></Script>
        <ClientProviders>
          <div className="main-content">
            <div className="inner-content">
              {children}
              <Analytics />
              <SpeedInsights />
            </div>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
};
