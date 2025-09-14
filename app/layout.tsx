import "./globals.css";
import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import localFont from "next/font/local";
import ClientProviders from "./(providers)/ClientProviders";
import type { Metadata } from "next";

const interDisplay = localFont({
  src: [
    {
      path: "./(fonts)/InterDisplay/Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "./(fonts)/InterDisplay/ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "./(fonts)/InterDisplay/Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./(fonts)/InterDisplay/Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./(fonts)/InterDisplay/Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./(fonts)/InterDisplay/SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./(fonts)/InterDisplay/Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./(fonts)/InterDisplay/ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "./(fonts)/InterDisplay/Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-interDisplay",
  display: "swap",
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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${interDisplay.variable} antialiased`}>
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
