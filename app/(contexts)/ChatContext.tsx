"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { dbfs } from "@/app/(firebase)/client";
import {
    collection,
    doc,
    getDocs,
    setDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { useUserContext } from "./UserContext";

export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: Date;
}

export interface Chat {
    id: string;
    type: "direct" | "group";
    participants: string[];
    participantNames: string[];
    groupId?: string;
    groupName?: string;
    lastMessage?: {
        text: string;
        senderId: string;
        timestamp: Date;
    };
}

interface ChatContextType {
    chats: Chat[];
    loading: boolean;
    currentMessages: Message[];
    sendMessage: (chatId: string, text: string) => Promise<boolean>;
    startDirectChat: (otherUserId: string, otherUsername: string) => Promise<string | null>;
    subscribeToChat: (chatId: string) => () => void;
    refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const { telegramId, username } = useUserContext();
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMessages, setCurrentMessages] = useState<Message[]>([]);

    // Fetch user's chats
    const refreshChats = useCallback(async () => {
        if (!telegramId) return;

        setLoading(true);
        try {
            const chatsRef = collection(dbfs, "chats");
            const q = query(
                chatsRef,
                where("participants", "array-contains", telegramId),
                orderBy("lastMessage.timestamp", "desc"),
                limit(50)
            );
            const snapshot = await getDocs(q);

            const chatsList: Chat[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    type: data.type || "direct",
                    participants: data.participants || [],
                    participantNames: data.participantNames || [],
                    groupId: data.groupId,
                    groupName: data.groupName,
                    lastMessage: data.lastMessage ? {
                        text: data.lastMessage.text,
                        senderId: data.lastMessage.senderId,
                        timestamp: data.lastMessage.timestamp instanceof Timestamp
                            ? data.lastMessage.timestamp.toDate()
                            : new Date(),
                    } : undefined,
                };
            });

            setChats(chatsList);
        } catch (error) {
            console.error("Error fetching chats:", error);
        } finally {
            setLoading(false);
        }
    }, [telegramId]);

    // Start a direct chat with another user
    const startDirectChat = useCallback(async (
        otherUserId: string,
        otherUsername: string
    ): Promise<string | null> => {
        if (!telegramId || !username) return null;

        try {
            // Check if chat already exists
            const existingChat = chats.find(
                (c) => c.type === "direct" && c.participants.includes(otherUserId)
            );
            if (existingChat) return existingChat.id;

            // Create new chat
            const chatId = [telegramId, otherUserId].sort().join("_");
            const chatRef = doc(dbfs, `chats/${chatId}`);

            await setDoc(chatRef, {
                type: "direct",
                participants: [telegramId, otherUserId],
                participantNames: [username || "Unknown", otherUsername],
                createdAt: serverTimestamp(),
            });

            await refreshChats();
            return chatId;
        } catch (error) {
            console.error("Error starting chat:", error);
            return null;
        }
    }, [telegramId, username, chats, refreshChats]);

    // Send a message
    const sendMessage = useCallback(async (chatId: string, text: string): Promise<boolean> => {
        if (!telegramId || !username || !text.trim()) return false;

        try {
            const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const messageRef = doc(dbfs, `chats/${chatId}/messages/${messageId}`);

            const messageData = {
                senderId: telegramId,
                senderName: username || "Unknown",
                text: text.trim(),
                timestamp: serverTimestamp(),
            };

            await setDoc(messageRef, messageData);

            // Update last message on chat
            const chatRef = doc(dbfs, `chats/${chatId}`);
            await setDoc(chatRef, {
                lastMessage: {
                    text: text.trim(),
                    senderId: telegramId,
                    timestamp: serverTimestamp(),
                },
            }, { merge: true });

            return true;
        } catch (error) {
            console.error("Error sending message:", error);
            return false;
        }
    }, [telegramId, username]);

    // Subscribe to chat messages (real-time)
    const subscribeToChat = useCallback((chatId: string) => {
        const messagesRef = collection(dbfs, `chats/${chatId}/messages`);
        const q = query(messagesRef, orderBy("timestamp", "asc"), limit(100));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const messages: Message[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    senderId: data.senderId,
                    senderName: data.senderName || "Unknown",
                    text: data.text,
                    timestamp: data.timestamp instanceof Timestamp
                        ? data.timestamp.toDate()
                        : new Date(),
                };
            });
            setCurrentMessages(messages);
        });

        return unsubscribe;
    }, []);

    // Initial fetch
    useEffect(() => {
        if (telegramId) {
            refreshChats();
        }
    }, [telegramId, refreshChats]);

    return (
        <ChatContext.Provider
            value={{
                chats,
                loading,
                currentMessages,
                sendMessage,
                startDirectChat,
                subscribeToChat,
                refreshChats,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return context;
}
