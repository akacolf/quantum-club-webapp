"use client";

import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { dbfs } from "@/app/(firebase)/client";
import {
    collection,
    doc,
    setDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { motion, AnimatePresence } from "framer-motion";

interface TokenChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: Date;
    isHolder?: boolean;
}

interface TokenChatProps {
    tokenId: string;
    tokenSymbol: string;
}

export default function TokenChat({ tokenId, tokenSymbol }: TokenChatProps) {
    const { telegramId, username } = useUserContext();
    const [messages, setMessages] = useState<TokenChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Subscribe to token chat messages
    useEffect(() => {
        if (!tokenId) return;

        const messagesRef = collection(dbfs, `tokens/${tokenId}/chat`);
        const q = query(messagesRef, orderBy("timestamp", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: TokenChatMessage[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    senderId: data.senderId,
                    senderName: data.senderName || "Anon",
                    text: data.text,
                    timestamp: data.timestamp instanceof Timestamp
                        ? data.timestamp.toDate()
                        : new Date(),
                    isHolder: data.isHolder,
                };
            }).reverse(); // Reverse to show oldest first
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [tokenId]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current && isExpanded) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isExpanded]);

    // Send message
    const sendMessage = async () => {
        if (!telegramId || !newMessage.trim() || isSending) return;

        setIsSending(true);
        try {
            const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const messageRef = doc(dbfs, `tokens/${tokenId}/chat/${messageId}`);

            await setDoc(messageRef, {
                senderId: telegramId,
                senderName: username || "Anon",
                text: newMessage.trim(),
                timestamp: serverTimestamp(),
                isHolder: true, // TODO: Check if user actually holds the token
            });

            setNewMessage("");
            inputRef.current?.focus();
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    // Get initials for avatar
    const getInitials = (name: string) => {
        return name.slice(0, 2).toUpperCase();
    };

    // Generate consistent color from sender ID
    const getAvatarColor = (senderId: string) => {
        const colors = [
            "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500",
            "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500"
        ];
        const index = senderId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[index % colors.length];
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {/* Chat Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon icon="solar:chat-round-dots-bold" className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-white">{tokenSymbol} Live Chat</span>
                    {messages.length > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                            {messages.length}
                        </span>
                    )}
                </div>
                <Icon
                    icon={isExpanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
                    className="w-5 h-5 text-muted-foreground"
                />
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Messages */}
                        <ScrollArea className="h-[300px]" ref={scrollRef}>
                            <div className="p-4 space-y-3">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-[200px] text-center">
                                        <Icon icon="solar:chat-round-dots-linear" className="w-12 h-12 text-muted-foreground mb-2" />
                                        <p className="text-muted-foreground text-sm">No messages yet</p>
                                        <p className="text-muted-foreground text-xs">Be the first to say something!</p>
                                    </div>
                                ) : (
                                    messages.map((msg, index) => {
                                        const isOwn = msg.senderId === telegramId;
                                        const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;

                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                                            >
                                                {showAvatar ? (
                                                    <Avatar className={`w-8 h-8 ${getAvatarColor(msg.senderId)}`}>
                                                        <AvatarFallback className="text-white text-xs">
                                                            {getInitials(msg.senderName)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ) : (
                                                    <div className="w-8" />
                                                )}
                                                <div className={`flex-1 max-w-[75%] ${isOwn ? "text-right" : ""}`}>
                                                    {showAvatar && (
                                                        <div className={`flex items-center gap-1 mb-0.5 ${isOwn ? "justify-end" : ""}`}>
                                                            <span className="text-xs text-muted-foreground">
                                                                {isOwn ? "You" : msg.senderName}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`inline-block px-3 py-2 rounded-2xl text-sm ${isOwn
                                                                ? "bg-primary text-black rounded-br-md"
                                                                : "bg-white/10 text-white rounded-bl-md"
                                                            }`}
                                                    >
                                                        {msg.text}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                                        {formatTime(msg.timestamp)}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>

                        {/* Message Input */}
                        <div className="p-3 border-t border-white/10">
                            {telegramId ? (
                                <div className="flex gap-2">
                                    <Input
                                        ref={inputRef}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder={`Message ${tokenSymbol} holders...`}
                                        className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                                        disabled={isSending}
                                        maxLength={500}
                                    />
                                    <Button
                                        onClick={sendMessage}
                                        disabled={!newMessage.trim() || isSending}
                                        size="icon"
                                        className="bg-primary hover:bg-primary/90 text-black"
                                    >
                                        {isSending ? (
                                            <ButtonLoader />
                                        ) : (
                                            <Icon icon="solar:plain-bold" className="w-5 h-5" />
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-2">
                                    <p className="text-sm text-muted-foreground">Connect wallet to chat</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
