"use client";

import { memo, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useChat, Chat } from "@/app/(contexts)/ChatContext";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import Loader from "@/app/(components)/Loader";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Users } from "lucide-react";

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
                className="cursor-pointer bg-white/5 border-white/5 hover:bg-white/10 transition-all active:scale-[0.98] rounded-2xl"
                onClick={handleClick}
            >
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 border border-white/10">
                            {chat.type === "group" ? (
                                <AvatarFallback className="bg-white/10 text-white">
                                    <Users className="w-5 h-5" />
                                </AvatarFallback>
                            ) : (
                                <>
                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${participantName}`} />
                                    <AvatarFallback className="bg-white/10 text-white font-bold">
                                        {participantName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </>
                            )}
                        </Avatar>

                        <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-baseline">
                                <h3 className="font-semibold text-foreground truncate max-w-[70%]">
                                    {participantName}
                                </h3>
                                {chat.lastMessage && (
                                    <span className="text-xs text-muted-foreground shrink-0">
                                        {formatTime(chat.lastMessage.timestamp)}
                                    </span>
                                )}
                            </div>

                            {chat.lastMessage && (
                                <p className="text-sm text-muted-foreground truncate">
                                    {chat.lastMessage.senderId === telegramId && "You: "}
                                    {chat.lastMessage.text}
                                </p>
                            )}
                        </div>
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
        <div className="min-h-screen bg-background text-foreground pb-24 relative overflow-hidden">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 p-4 pt-8 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Messages</h1>
                    <p className="text-sm text-white/40">Chat with your community</p>
                </div>

                {/* Chats List */}
                {chats.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-16 space-y-4"
                    >
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                            <MessageCircle className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground text-center">
                            No conversations yet
                        </p>
                        <p className="text-muted-foreground text-sm text-center opacity-70">
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
