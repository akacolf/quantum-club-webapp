import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import type { Chat } from "@/app/(contexts)/ChatContext";

export function useChatsQuery(telegramId: string | null) {
    return useQuery<Chat[]>({
        queryKey: ["chats", telegramId],
        queryFn: async () => {
            if (!telegramId) return [];
            const chatsRef = collection(dbfs, "chats");
            const q = query(
                chatsRef,
                where("participants", "array-contains", telegramId),
                orderBy("lastMessage.timestamp", "desc"),
                limit(50)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    type: data.type || "direct",
                    participants: data.participants || [],
                    participantNames: data.participantNames || [],
                    groupId: data.groupId,
                    groupName: data.groupName,
                    lastMessage: data.lastMessage
                        ? {
                              text: data.lastMessage.text,
                              senderId: data.lastMessage.senderId,
                              timestamp:
                                  data.lastMessage.timestamp instanceof Timestamp
                                      ? data.lastMessage.timestamp.toDate()
                                      : new Date(),
                          }
                        : undefined,
                } as Chat;
            });
        },
        enabled: !!telegramId,
        staleTime: 30_000,
    });
}

export function useSendMessage(telegramId: string | null, username: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ chatId, text }: { chatId: string; text: string }) => {
            if (!telegramId || !username || !text.trim()) {
                throw new Error("Missing required fields");
            }

            const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const messageRef = doc(dbfs, `chats/${chatId}/messages/${messageId}`);

            await setDoc(messageRef, {
                senderId: telegramId,
                senderName: username || "Unknown",
                text: text.trim(),
                timestamp: serverTimestamp(),
            });

            const chatRef = doc(dbfs, `chats/${chatId}`);
            await setDoc(
                chatRef,
                {
                    lastMessage: {
                        text: text.trim(),
                        senderId: telegramId,
                        timestamp: serverTimestamp(),
                    },
                },
                { merge: true }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chats", telegramId] });
        },
    });
}
