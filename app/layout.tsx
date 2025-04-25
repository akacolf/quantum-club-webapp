import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";
import UserProvider from "./contexts/MiningContext";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quantum Club",
  description: "Developed by the Quantum Club Team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${interTight.variable} ${interTight.variable} antialiased`}
      >
        <script src="https://telegram.org/js/telegram-web-app.js?57"></script>
        <UserProvider>
        {children}
        </UserProvider>
      </body>
    </html>
  );
}
