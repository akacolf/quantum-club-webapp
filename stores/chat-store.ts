"use client";

import { create } from "zustand";

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

interface ChatState {
    chats: Chat[];
    loading: boolean;
    currentMessages: Message[];
}

interface ChatActions {
    setChats: (chats: Chat[]) => void;
    setLoading: (loading: boolean) => void;
    setCurrentMessages: (messages: Message[]) => void;
    // These are set by the bridge hook and call TanStack Query / Firestore
    sendMessage: (chatId: string, text: string) => Promise<boolean>;
    startDirectChat: (otherUserId: string, otherUsername: string) => Promise<string | null>;
    subscribeToChat: (chatId: string) => () => void;
    refreshChats: () => Promise<void>;
}

export type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>()((set) => ({
    chats: [],
    loading: false,
    currentMessages: [],

    setChats: (chats) => set({ chats }),
    setLoading: (loading) => set({ loading }),
    setCurrentMessages: (messages) => set({ currentMessages: messages }),

    // Placeholder implementations — overridden by useChatBridge in ChatProvider
    sendMessage: async () => false,
    startDirectChat: async () => null,
    subscribeToChat: () => () => {},
    refreshChats: async () => {},
}));
