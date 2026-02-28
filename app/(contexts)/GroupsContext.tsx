"use client";

import React, { useEffect } from "react";
import { dbfs } from "@/app/(firebase)/client";
import { collection, getDocs } from "firebase/firestore";
import { useUserContext } from "./UserContext";
import {
    useGroupsQuery,
    useCreateGroup as useCreateGroupMutation,
    useJoinGroup as useJoinGroupMutation,
    useLeaveGroup as useLeaveGroupMutation,
} from "@/app/(hooks)/queries/use-groups";
import { useGroupsStore, type GroupMember } from "@/stores/groups-store";
import { useShallow } from "zustand/shallow";

// Re-export types from the store
export type { Group, GroupMember } from "@/stores/groups-store";

/**
 * Bridge hook — syncs TanStack Query data and mutations into the Zustand store.
 * Called once inside GroupsProvider.
 */
function useGroupsBridge() {
    const { telegramId, username, walletAddress } = useUserContext();

    const groupsQuery = useGroupsQuery(telegramId);
    const createGroupMutation = useCreateGroupMutation(telegramId, username);
    const joinGroupMutation = useJoinGroupMutation(telegramId, username, walletAddress);
    const leaveGroupMutation = useLeaveGroupMutation(telegramId);

    // Sync query data into the store
    useEffect(() => {
        useGroupsStore.setState({
            groups: groupsQuery.data?.groups ?? [],
            myGroupIds: groupsQuery.data?.memberIds ?? new Set<string>(),
            loading: groupsQuery.isFetching,
        });
    }, [groupsQuery.data, groupsQuery.isFetching]);

    // Wire up action implementations that depend on React hooks
    useEffect(() => {
        useGroupsStore.setState({
            refreshGroups: async () => { groupsQuery.refetch(); },

            createGroup: async (
                name: string,
                description: string,
                tokenId?: string,
                tokenSymbol?: string,
                nftGated?: boolean,
                requiredNftCollection?: string,
                requiredNftCollectionName?: string
            ): Promise<string | null> => {
                try {
                    return await createGroupMutation.mutateAsync({
                        name, description, tokenId, tokenSymbol,
                        nftGated, requiredNftCollection, requiredNftCollectionName,
                    });
                } catch (error) {
                    console.error("Error creating group:", error);
                    return null;
                }
            },

            joinGroup: async (groupId: string): Promise<boolean> => {
                try {
                    await joinGroupMutation.mutateAsync(groupId);
                    return true;
                } catch (error) {
                    console.error("Error joining group:", error);
                    return false;
                }
            },

            leaveGroup: async (groupId: string): Promise<boolean> => {
                try {
                    await leaveGroupMutation.mutateAsync(groupId);
                    return true;
                } catch (error) {
                    console.error("Error leaving group:", error);
                    return false;
                }
            },

            getGroupMembers: async (groupId: string): Promise<GroupMember[]> => {
                try {
                    const membersRef = collection(dbfs, `groups/${groupId}/members`);
                    const membersSnap = await getDocs(membersRef);
                    return membersSnap.docs.map((doc) => ({
                        telegramId: doc.id,
                        username: doc.data().username || "Unknown",
                        role: doc.data().role || "member",
                        joinedAt: doc.data().joinedAt?.toDate() || new Date(),
                    }));
                } catch (error) {
                    console.error("Error fetching members:", error);
                    return [];
                }
            },

            getGroupByToken: (tokenId: string) =>
                useGroupsStore.getState().groups.find(g => g.linkedTokenId === tokenId),

            isGroupMember: (groupId: string) =>
                useGroupsStore.getState().myGroupIds.has(groupId),
        });
    }, [groupsQuery, createGroupMutation, joinGroupMutation, leaveGroupMutation]);
}

/**
 * Compatibility wrapper — consumers continue using `useGroups()` unchanged.
 */
export const useGroups = () =>
    useGroupsStore(
        useShallow((s) => ({
            groups: s.groups,
            loading: s.loading,
            createGroup: s.createGroup,
            joinGroup: s.joinGroup,
            leaveGroup: s.leaveGroup,
            getGroupMembers: s.getGroupMembers,
            getGroupByToken: s.getGroupByToken,
            isGroupMember: s.isGroupMember,
            refreshGroups: s.refreshGroups,
        }))
    );

/**
 * GroupsProvider — runs the bridge hook that syncs React Query into the Zustand store.
 * Still needed in the provider tree because it calls React hooks (useGroupsQuery, etc.).
 */
export function GroupsProvider({ children }: { children: React.ReactNode }) {
    useGroupsBridge();
    return <>{children}</>;
}
