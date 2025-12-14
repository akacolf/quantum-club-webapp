"use client";

import { memo, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useChat, Chat } from "@/app/(contexts)/ChatContext";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import Loader from "@/app/(components)/Loader";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, ChevronRight, Users } from "lucide-react";

// Utility function moved outside component to prevent recreation
const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
        return "Yesterday";
    } else if (days < 7) {
        return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
};

interface ChatItemProps {
    chat: Chat;
    index: number;
    telegramId: string;
    onNavigate: (chatId: string) => void;
}

// Memoized chat item component for performance
const ChatItem = memo(function ChatItem({ chat, index, telegramId, onNavigate }: ChatItemProps) {
    const participantName = useMemo(() => {
        if (chat.type === "group") return chat.groupName || "Group";
        const otherIndex = chat.participants.findIndex((p) => p !== telegramId);
        return chat.participantNames[otherIndex] || "Unknown";
    }, [chat, telegramId]);

    const handleClick = useCallback(() => {
        onNavigate(chat.id);
    }, [chat.id, onNavigate]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card
                className="bg-[#1a1a1a]/80 border-[#333] backdrop-blur-xl cursor-pointer hover:bg-[#2a2a2a]/80 transition-colors"
                onClick={handleClick}
            >
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                            {chat.type === "group" ? (
                                <Users className="w-5 h-5" />
                            ) : (
                                participantName.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-white truncate">
                                {participantName}
                            </h3>
                            {chat.lastMessage && (
                                <p className="text-sm text-gray-400 truncate">
                                    {chat.lastMessage.senderId === telegramId && "You: "}
                                    {chat.lastMessage.text}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {chat.lastMessage && (
                            <span className="text-xs text-gray-500">
                                {formatTime(chat.lastMessage.timestamp)}
                            </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
});

export default function ChatListPage() {
    useTelegramBackButton("/home");
    const router = useRouter();
    const { chats, loading } = useChat();
    const { telegramId } = useGameContext();

    // Memoized navigation handler
    const handleNavigate = useCallback((chatId: string) => {
        router.push(`/chat/${chatId}`);
    }, [router]);

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 p-4 pt-8 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white">Messages</h1>
                    <p className="text-sm text-gray-400">Chat with your community</p>
                </div>

                {/* Chats List */}
                {chats.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-16 space-y-4"
                    >
                        <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center">
                            <MessageCircle className="w-8 h-8 text-gray-500" />
                        </div>
                        <p className="text-gray-400 text-center">
                            No conversations yet
                        </p>
                        <p className="text-gray-500 text-sm text-center">
                            Start a chat from a group member&apos;s profile
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-2">
                        {chats.map((chat, index) => (
                            <ChatItem
                                key={chat.id}
                                chat={chat}
                                index={index}
                                telegramId={telegramId || ""}
                                onNavigate={handleNavigate}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
