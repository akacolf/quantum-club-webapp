import type { Metadata } from "next";
import { firestore } from "@/app/(firebase)/server";
import ChatConversationClient from "./ChatConversationClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chatId: string }>;
}): Promise<Metadata> {
  const { chatId } = await params;

  try {
    const chatDoc = await firestore.collection("qc-chats").doc(chatId).get();

    if (!chatDoc.exists) {
      return {
        title: "Chat | Quantum Club",
        description: "Chat on Quantum Club.",
      };
    }

    const chat = chatDoc.data()!;
    const isGroup = chat.isGroup || chat.isGlobal;
    const name = isGroup
      ? chat.groupName || "Group Chat"
      : "Chat";
    const title = `${name} | Quantum Club`;
    const description = isGroup
      ? `Join ${name} on Quantum Club`
      : "Chat on Quantum Club";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
      },
    };
  } catch (error) {
    console.error("Failed to fetch chat metadata:", error);
    return {
      title: "Chat | Quantum Club",
      description: "Chat on Quantum Club.",
    };
  }
}

export default function ChatConversationPage() {
  return <ChatConversationClient />;
}
