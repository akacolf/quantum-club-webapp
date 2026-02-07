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
import { useChatsQuery, useSendMessage as useSendMessageMutation } from "@/app/(hooks)/queries/use-chat";

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
    const [currentMessages, setCurrentMessages] = useState<Message[]>([]);

    // TanStack Query for chats
    const chatsQuery = useChatsQuery(telegramId);
    const sendMessageMutation = useSendMessageMutation(telegramId, username);

    const chats = chatsQuery.data ?? [];
    const loading = chatsQuery.isFetching;

    const refreshChats = useCallback(async () => {
        chatsQuery.refetch();
    }, [chatsQuery]);

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
            await sendMessageMutation.mutateAsync({ chatId, text });
            return true;
        } catch (error) {
            console.error("Error sending message:", error);
            return false;
        }
    }, [telegramId, username, sendMessageMutation]);

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
