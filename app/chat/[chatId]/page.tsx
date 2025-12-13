"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useChat, Message } from "@/app/(contexts)/ChatContext";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import Loader from "@/app/(components)/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, User } from "lucide-react";

export default function ChatPage() {
    useTelegramBackButton("/chat");
    const params = useParams();
    const chatId = params.chatId as string;

    const { telegramId } = useGameContext();
    const { chats, currentMessages, sendMessage, subscribeToChat } = useChat();

    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const chat = chats.find((c) => c.id === chatId);

    // Get other participant name for header
    const getOtherName = () => {
        if (!chat) return "Chat";
        if (chat.type === "group") return chat.groupName || "Group";
        const otherIndex = chat.participants.findIndex((p) => p !== telegramId);
        return chat.participantNames[otherIndex] || "Unknown";
    };

    // Subscribe to messages
    useEffect(() => {
        const unsubscribe = subscribeToChat(chatId);
        setLoading(false);
        return unsubscribe;
    }, [chatId, subscribeToChat]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [currentMessages]);

    const handleSend = async () => {
        if (!message.trim() || sending) return;

        setSending(true);
        const success = await sendMessage(chatId, message);
        if (success) {
            setMessage("");
        }
        setSending(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    if (loading && currentMessages.length === 0) {
        return <Loader />;
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-[#333] p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="font-semibold text-white">{getOtherName()}</h1>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {currentMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <p>No messages yet</p>
                        <p className="text-sm">Say hello!</p>
                    </div>
                ) : (
                    currentMessages.map((msg, index) => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwn={msg.senderId === telegramId}
                            showAvatar={
                                index === 0 ||
                                currentMessages[index - 1].senderId !== msg.senderId
                            }
                            formatTime={formatTime}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="sticky bottom-0 z-20 bg-black/90 backdrop-blur-xl border-t border-[#333] p-4 pb-safe">
                <div className="flex items-center gap-2">
                    <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500"
                        disabled={sending}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={sending || !message.trim()}
                        className="bg-white text-black hover:bg-gray-200 disabled:opacity-50 px-4"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function MessageBubble({
    message,
    isOwn,
    showAvatar,
    formatTime,
}: {
    message: Message;
    isOwn: boolean;
    showAvatar: boolean;
    formatTime: (date: Date) => string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
        >
            {showAvatar && !isOwn && (
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {message.senderName.charAt(0).toUpperCase()}
                </div>
            )}
            {!showAvatar && !isOwn && <div className="w-8" />}
            <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl ${isOwn
                        ? "bg-white text-black rounded-br-sm"
                        : "bg-[#1a1a1a] text-white rounded-bl-sm"
                    }`}
            >
                {!isOwn && showAvatar && (
                    <p className="text-xs font-medium text-purple-400 mb-1">
                        {message.senderName}
                    </p>
                )}
                <p className="text-sm break-words">{message.text}</p>
                <p className={`text-xs mt-1 ${isOwn ? "text-gray-500" : "text-gray-500"}`}>
                    {formatTime(message.timestamp)}
                </p>
            </div>
        </motion.div>
    );
}
