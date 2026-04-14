"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  type Timestamp,
} from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";
import type { GroupCategory } from "@/lib/validations";

export interface PublicGroup {
  id: string;
  groupName: string;
  description: string;
  category: GroupCategory | null;
  memberCount: number;
  lastMessageAt: Timestamp | null;
  participants: string[];
  joinCode: string | null;
  linkedTokenSymbol: string | null;
  bannedUsers: string[];
}

const PUBLIC_GROUPS_LIMIT = 50;

/**
 * Real-time subscription for public/discoverable groups.
 * Filtered server-side to `isPublic == true` and ordered by recent activity.
 * Optionally narrowed to a single category.
 */
export function usePublicGroupsQuery(
  category: GroupCategory | "All",
  enabled = true,
) {
  const queryClient = useQueryClient();
  const queryKey = ["public-groups", category];

  useEffect(() => {
    if (!enabled) return;

    const chatsRef = collection(dbfs, "qc-chats");
    const baseClauses = [where("isPublic", "==", true)] as const;
    const fsQuery = category === "All"
      ? query(
          chatsRef,
          ...baseClauses,
          orderBy("lastMessageAt", "desc"),
          limit(PUBLIC_GROUPS_LIMIT),
        )
      : query(
          chatsRef,
          ...baseClauses,
          where("category", "==", category),
          orderBy("lastMessageAt", "desc"),
          limit(PUBLIC_GROUPS_LIMIT),
        );

    const unsub = onSnapshot(
      fsQuery,
      (snapshot) => {
        const groups: PublicGroup[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Defensive: only surface real groups, never DMs that somehow have isPublic
          if (!data.isGroup) return;
          groups.push({
            id: docSnap.id,
            groupName: data.groupName || "Untitled Group",
            description: data.description || "",
            category: (data.category as GroupCategory) || null,
            memberCount:
              typeof data.memberCount === "number"
                ? data.memberCount
                : data.participants?.length || 0,
            lastMessageAt: data.lastMessageAt || null,
            participants: data.participants || [],
            joinCode: data.joinCode || null,
            linkedTokenSymbol: data.linkedTokenSymbol || null,
            bannedUsers: data.bannedUsers || [],
          });
        });
        queryClient.setQueryData(queryKey, groups);
      },
      (error) => {
        console.error("Public groups listener error:", error);
        queryClient.setQueryData<PublicGroup[]>(queryKey, (prev) => prev ?? []);
      },
    );

    return () => unsub();
  }, [category, enabled, queryClient]);

  return useQuery<PublicGroup[]>({
    queryKey,
    queryFn: () => [],
    enabled,
    staleTime: Infinity,
  });
}
