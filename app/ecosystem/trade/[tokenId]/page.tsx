import type { Metadata } from "next";
import { firestore } from "@/app/(firebase)/server";
import TokenDetailClient from "./TokenDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}): Promise<Metadata> {
  const { tokenId } = await params;

  try {
    const tokenDoc = await firestore.collection("tokens").doc(tokenId).get();

    if (!tokenDoc.exists) {
      return {
        title: "Token Not Found | Quantum Club",
        description: "This token could not be found on Quantum Club.",
      };
    }

    const token = tokenDoc.data()!;
    const name = token.name || "Unknown Token";
    const symbol = token.symbol || "";
    const description =
      token.description || `Trade ${name} (${symbol}) on Quantum Club RocketStart`;

    const title = `${name} ($${symbol}) | Quantum Club`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        ...(token.image ? { images: [{ url: token.image }] } : {}),
      },
    };
  } catch (error) {
    console.error("Failed to fetch token metadata:", error);
    return {
      title: "Trade | Quantum Club",
      description: "Trade tokens on Quantum Club RocketStart.",
    };
  }
}

export default function TokenDetailPage() {
  return <TokenDetailClient />;
}
