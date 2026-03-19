"use client";

import { useQuery } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";

interface TokenCommunityChatData {
  chatId: string;
  groupName: string;
  participantCount: number;
  joinCode: string;
  participants: string[];
}

/**
 * Looks up the QC Chat group linked to a specific token.
 * Fast path: uses communityChatId from the token doc for a direct lookup.
 * Fallback: queries qc-chats by linkedTokenId.
 */
export function useTokenCommunityChat(
  tokenId: string | null,
  communityChatId?: string | null,
) {
  return useQuery<TokenCommunityChatData | null>({
    queryKey: ["tokenCommunityChat", tokenId],
    queryFn: async () => {
      if (!tokenId) return null;

      // Fast path: direct doc read if communityChatId is known
      if (communityChatId) {
        const chatSnap = await getDoc(doc(dbfs, "qc-chats", communityChatId));
        if (chatSnap.exists()) {
          const data = chatSnap.data();
          return {
            chatId: chatSnap.id,
            groupName: data.groupName || "",
            participantCount: data.participants?.length || 0,
            joinCode: data.joinCode || "",
            participants: data.participants || [],
          };
        }
      }

      // Fallback: query by linkedTokenId
      const chatsRef = collection(dbfs, "qc-chats");
      const q = query(
        chatsRef,
        where("linkedTokenId", "==", tokenId),
        where("isGroup", "==", true),
        limit(1),
      );
      const snap = await getDocs(q);

      if (snap.empty) return null;

      const chatDoc = snap.docs[0];
      const data = chatDoc.data();
      return {
        chatId: chatDoc.id,
        groupName: data.groupName || "",
        participantCount: data.participants?.length || 0,
        joinCode: data.joinCode || "",
        participants: data.participants || [],
      };
    },
    enabled: !!tokenId,
    staleTime: 60_000,
  });
}
