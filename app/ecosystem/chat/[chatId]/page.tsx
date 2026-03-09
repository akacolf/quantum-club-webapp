import type { Metadata } from "next";
import ChatConversationClient from "./ChatConversationClient";

export const metadata: Metadata = {
  title: "Chat | Quantum Club",
  description: "Chat on Quantum Club.",
};

export default function ChatConversationPage() {
  return <ChatConversationClient />;
}
