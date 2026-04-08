"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const SerwistProvider = dynamic(
  () => import("@serwist/turbopack/react").then((mod) => mod.SerwistProvider),
  { ssr: false }
);

export default function SerwistClientProvider({ children }: { children: ReactNode }) {
  return <SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>;
}
