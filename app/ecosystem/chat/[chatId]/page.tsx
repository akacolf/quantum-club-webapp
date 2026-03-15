import type { Metadata } from "next";
import ChatConversationClient from "./ChatConversationClient";

export const metadata: Metadata = {
  title: "Chat | Quantum Club",
  description: "Chat on Quantum Club.",
};

export default async function ChatConversationPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  return <ChatConversationClient key={chatId} />;
}
