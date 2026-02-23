"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { dbfs } from "@/app/(firebase)/client";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    serverTimestamp,
} from "firebase/firestore";
import { useUserContext } from "./UserContext";
import {
    useGroupsQuery,
    useCreateGroup as useCreateGroupMutation,
    useJoinGroup as useJoinGroupMutation,
    useLeaveGroup as useLeaveGroupMutation,
} from "@/app/(hooks)/queries/use-groups";

export interface Group {
    id: string;
    name: string;
    description: string;
    createdBy: string;
    createdAt: Date;
    memberCount: number;
    linkedTokenId?: string;
    linkedTokenSymbol?: string;
    nftGated?: boolean;
    requiredNftCollection?: string;
    requiredNftCollectionName?: string;
}

export interface GroupMember {
    telegramId: string;
    username: string;
    role: "admin" | "moderator" | "member";
    joinedAt: Date;
}

interface GroupsContextType {
    groups: Group[];
    loading: boolean;
    createGroup: (name: string, description: string, tokenId?: string, tokenSymbol?: string, nftGated?: boolean, requiredNftCollection?: string, requiredNftCollectionName?: string) => Promise<string | null>;
    joinGroup: (groupId: string) => Promise<boolean>;
    leaveGroup: (groupId: string) => Promise<boolean>;
    getGroupMembers: (groupId: string) => Promise<GroupMember[]>;
    getGroupByToken: (tokenId: string) => Group | undefined;
    isGroupMember: (groupId: string) => boolean;
    refreshGroups: () => Promise<void>;
}

const GroupsContext = createContext<GroupsContextType | undefined>(undefined);

export function GroupsProvider({ children }: { children: React.ReactNode }) {
    const { telegramId, username, walletAddress } = useUserContext();

    // TanStack Query hooks
    const groupsQuery = useGroupsQuery(telegramId);
    const createGroupMutation = useCreateGroupMutation(telegramId, username);
    const joinGroupMutation = useJoinGroupMutation(telegramId, username, walletAddress);
    const leaveGroupMutation = useLeaveGroupMutation(telegramId);

    const groups = groupsQuery.data?.groups ?? [];
    const myGroupIds = groupsQuery.data?.memberIds ?? new Set<string>();
    const loading = groupsQuery.isFetching;

    const refreshGroups = useCallback(async () => {
        groupsQuery.refetch();
    }, [groupsQuery]);

    const createGroup = useCallback(async (
        name: string,
        description: string,
        tokenId?: string,
        tokenSymbol?: string,
        nftGated?: boolean,
        requiredNftCollection?: string,
        requiredNftCollectionName?: string
    ): Promise<string | null> => {
        try {
            return await createGroupMutation.mutateAsync({ name, description, tokenId, tokenSymbol, nftGated, requiredNftCollection, requiredNftCollectionName });
        } catch (error) {
            console.error("Error creating group:", error);
            return null;
        }
    }, [createGroupMutation]);

    const joinGroup = useCallback(async (groupId: string): Promise<boolean> => {
        try {
            await joinGroupMutation.mutateAsync(groupId);
            return true;
        } catch (error) {
            console.error("Error joining group:", error);
            return false;
        }
    }, [joinGroupMutation]);

    const leaveGroup = useCallback(async (groupId: string): Promise<boolean> => {
        try {
            await leaveGroupMutation.mutateAsync(groupId);
            return true;
        } catch (error) {
            console.error("Error leaving group:", error);
            return false;
        }
    }, [leaveGroupMutation]);

    // Get group members (not cached via query since it's on-demand)
    const getGroupMembers = useCallback(async (groupId: string): Promise<GroupMember[]> => {
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
    }, []);

    const isGroupMember = useCallback((groupId: string): boolean => {
        return myGroupIds.has(groupId);
    }, [myGroupIds]);

    const getGroupByToken = useCallback((tokenId: string): Group | undefined => {
        return groups.find(g => g.linkedTokenId === tokenId);
    }, [groups]);

    return (
        <GroupsContext.Provider
            value={{
                groups,
                loading,
                createGroup,
                joinGroup,
                leaveGroup,
                getGroupMembers,
                getGroupByToken,
                isGroupMember,
                refreshGroups,
            }}
        >
            {children}
        </GroupsContext.Provider>
    );
}

export function useGroups() {
    const context = useContext(GroupsContext);
    if (!context) {
        throw new Error("useGroups must be used within a GroupsProvider");
    }
    return context;
}
