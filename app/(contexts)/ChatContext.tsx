"use client";

import React, { useEffect } from "react";
import { dbfs } from "@/app/(firebase)/client";
import {
    collection,
    doc,
    setDoc,
    query,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { useUserContext } from "./UserContext";
import { useChatsQuery, useSendMessage as useSendMessageMutation } from "@/app/(hooks)/queries/use-chat";
import { useChatStore, type Message } from "@/stores/chat-store";
import { useShallow } from "zustand/shallow";

// Re-export types from the store
export type { Message, Chat } from "@/stores/chat-store";

/**
 * Bridge hook — syncs TanStack Query data and Firestore operations into the Zustand store.
 * Called once inside ChatProvider.
 */
function useChatBridge() {
    const { telegramId, username } = useUserContext();

    const chatsQuery = useChatsQuery(telegramId);
    const sendMessageMutation = useSendMessageMutation(telegramId, username);

    // Sync query data into the store
    useEffect(() => {
        useChatStore.setState({
            chats: chatsQuery.data ?? [],
            loading: chatsQuery.isLoading,
        });
    }, [chatsQuery.data, chatsQuery.isLoading]);

    // Wire up action implementations that depend on React hooks
    useEffect(() => {
        useChatStore.setState({
            refreshChats: async () => { chatsQuery.refetch(); },

            sendMessage: async (chatId: string, text: string): Promise<boolean> => {
                if (!telegramId || !username || !text.trim()) return false;
                try {
                    await sendMessageMutation.mutateAsync({ chatId, text });
                    return true;
                } catch (error) {
                    console.error("Error sending message:", error);
                    return false;
                }
            },

            startDirectChat: async (otherUserId: string, otherUsername: string): Promise<string | null> => {
                if (!telegramId || !username) return null;
                try {
                    const currentChats = useChatStore.getState().chats;
                    const existingChat = currentChats.find(
                        (c) => c.type === "direct" && c.participants.includes(otherUserId)
                    );
                    if (existingChat) return existingChat.id;

                    const chatId = [telegramId, otherUserId].sort().join("_");
                    const chatRef = doc(dbfs, `chats/${chatId}`);
                    await setDoc(chatRef, {
                        type: "direct",
                        participants: [telegramId, otherUserId],
                        participantNames: [username || "Unknown", otherUsername],
                        createdAt: serverTimestamp(),
                    });
                    chatsQuery.refetch();
                    return chatId;
                } catch (error) {
                    console.error("Error starting chat:", error);
                    return null;
                }
            },

            subscribeToChat: (chatId: string) => {
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
                    useChatStore.setState({ currentMessages: messages });
                });

                return unsubscribe;
            },
        });
    }, [telegramId, username, chatsQuery, sendMessageMutation]);
}

/**
 * Compatibility wrapper — consumers continue using `useChat()` unchanged.
 */
export const useChat = () =>
    useChatStore(
        useShallow((s) => ({
            chats: s.chats,
            loading: s.loading,
            currentMessages: s.currentMessages,
            sendMessage: s.sendMessage,
            startDirectChat: s.startDirectChat,
            subscribeToChat: s.subscribeToChat,
            refreshChats: s.refreshChats,
        }))
    );

/**
 * ChatProvider — runs the bridge hook that syncs React Query into the Zustand store.
 * Still needed in the provider tree because it calls React hooks (useChatsQuery, etc.).
 */
export function ChatProvider({ children }: { children: React.ReactNode }) {
    useChatBridge();
    return <>{children}</>;
}
