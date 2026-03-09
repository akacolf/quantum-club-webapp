import type { Metadata } from "next";
import TokenDetailClient from "./TokenDetailClient";

export const metadata: Metadata = {
  title: "Trade | Quantum Club",
  description: "Trade tokens on Quantum Club RocketStart.",
};

export default function TokenDetailPage() {
  return <TokenDetailClient />;
}
