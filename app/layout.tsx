import "./globals.css";
import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { Fustat } from "next/font/google";
import ClientProviders from "./(providers)/ClientProviders";

const fustat = Fustat({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-fustat",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fustat.variable} antialiased`}>
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
