"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import {
    collection,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    type Timestamp,
} from "firebase/firestore";

const GLOBAL_CHAT_ID = "qc-global";

export interface ChatConversation {
    id: string;
    participants: string[];
    participantNames: Record<string, string>;
    lastMessage: string;
    lastMessageBy: string;
    lastMessageAt: Timestamp | null;
    lastMessageEpoch?: number;
    isGroup: boolean;
    isGlobal?: boolean;
    groupName?: string;
    joinCode?: string;
    memberCount?: number;
    unreadCount?: number;
    epochNonce?: string;
    epochCounter?: number;
    epochNonces?: Record<number, string>;
}

/**
 * Real-time subscription for the global QC Chat conversation.
 * Uses onSnapshot to push updates into TanStack Query cache.
 */
export function useGlobalChat(telegramId: string | null, isAuthenticated: boolean) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isAuthenticated || !telegramId) return;

        const globalRef = doc(dbfs, "qc-chats", GLOBAL_CHAT_ID);
        const unsubscribe = onSnapshot(
            globalRef,
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    const globalChat: ChatConversation = {
                        id: snap.id,
                        participants: data.participants || [],
                        participantNames: data.participantNames || {},
                        lastMessage: data.lastMessage || "",
                        lastMessageBy: data.lastMessageBy || "",
                        lastMessageAt: data.lastMessageAt,
                        lastMessageEpoch: data.lastMessageEpoch,
                        isGroup: true,
                        isGlobal: true,
                        groupName: "QC Global",
                        memberCount: data.participants?.length || 0,
                        unreadCount: data.unreadCounts?.[telegramId] || 0,
                        epochNonce: data.epochNonce,
                        epochCounter: data.epochCounter,
                        epochNonces: data.epochNonces,
                    };
                    queryClient.setQueryData(
                        ["chat-global", telegramId],
                        globalChat,
                    );
                } else {
                    queryClient.setQueryData(
                        ["chat-global", telegramId],
                        null,
                    );
                }
            },
            (error) => {
                console.error("Global chat listener error:", error);
            },
        );

        return () => unsubscribe();
    }, [isAuthenticated, telegramId, queryClient]);

    return useQuery<ChatConversation | null>({
        queryKey: ["chat-global", telegramId],
        queryFn: () => null,
        enabled: !!telegramId && isAuthenticated,
        staleTime: Infinity,
    });
}

/**
 * Real-time subscription for the user's chat conversations (DMs + groups).
 * Excludes the global chat (shown separately via useGlobalChat).
 * Uses onSnapshot to push updates into TanStack Query cache.
 */
export function useChatConversations(telegramId: string | null, isAuthenticated: boolean) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isAuthenticated || !telegramId) {
            // When not authenticated, seed the cache with an empty array
            // so the query resolves immediately (mirrors the old setIsLoading(false))
            if (telegramId === null) {
                queryClient.setQueryData(["chat-conversations", telegramId], []);
            }
            return;
        }

        const chatsRef = collection(dbfs, "qc-chats");
        const q = query(
            chatsRef,
            where("participants", "array-contains", telegramId),
            orderBy("lastMessageAt", "desc"),
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const chats: ChatConversation[] = [];
                snapshot.forEach((docSnap) => {
                    // Skip global chat — it's shown separately
                    if (docSnap.id === GLOBAL_CHAT_ID) return;
                    const data = docSnap.data();
                    chats.push({
                        id: docSnap.id,
                        participants: data.participants || [],
                        participantNames: data.participantNames || {},
                        lastMessage: data.lastMessage || "",
                        lastMessageBy: data.lastMessageBy || "",
                        lastMessageAt: data.lastMessageAt,
                        lastMessageEpoch: data.lastMessageEpoch,
                        isGroup: data.isGroup || false,
                        isGlobal: false,
                        groupName: data.groupName,
                        joinCode: data.joinCode,
                        memberCount: data.isGroup ? data.participants?.length : undefined,
                        unreadCount: data.unreadCounts?.[telegramId] || 0,
                        epochNonce: data.epochNonce,
                        epochCounter: data.epochCounter,
                        epochNonces: data.epochNonces,
                    });
                });
                queryClient.setQueryData(
                    ["chat-conversations", telegramId],
                    chats,
                );
            },
            (error) => {
                console.error("Chat list error:", error);
                // On error, ensure we have data so the UI doesn't stay loading forever
                queryClient.setQueryData(
                    ["chat-conversations", telegramId],
                    (prev: ChatConversation[] | undefined) => prev ?? [],
                );
            },
        );

        return () => unsubscribe();
    }, [isAuthenticated, telegramId, queryClient]);

    return useQuery<ChatConversation[]>({
        queryKey: ["chat-conversations", telegramId],
        queryFn: () => [],
        enabled: !!telegramId && isAuthenticated,
        staleTime: Infinity,
    });
}
