"use client";

import { create } from "zustand";

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

interface GroupsState {
    groups: Group[];
    myGroupIds: Set<string>;
    loading: boolean;
}

interface GroupsActions {
    setGroups: (groups: Group[]) => void;
    setMyGroupIds: (ids: Set<string>) => void;
    setLoading: (loading: boolean) => void;
    // These are set by the bridge hook and call TanStack Query / Firestore
    createGroup: (name: string, description: string, tokenId?: string, tokenSymbol?: string, nftGated?: boolean, requiredNftCollection?: string, requiredNftCollectionName?: string) => Promise<string | null>;
    joinGroup: (groupId: string) => Promise<boolean>;
    leaveGroup: (groupId: string) => Promise<boolean>;
    getGroupMembers: (groupId: string) => Promise<GroupMember[]>;
    getGroupByToken: (tokenId: string) => Group | undefined;
    isGroupMember: (groupId: string) => boolean;
    refreshGroups: () => Promise<void>;
}

export type GroupsStore = GroupsState & GroupsActions;

export const useGroupsStore = create<GroupsStore>()((set, get) => ({
    groups: [],
    myGroupIds: new Set<string>(),
    loading: false,

    setGroups: (groups) => set({ groups }),
    setMyGroupIds: (ids) => set({ myGroupIds: ids }),
    setLoading: (loading) => set({ loading }),

    // Placeholder implementations — overridden by useGroupsBridge in GroupsProvider
    createGroup: async () => null,
    joinGroup: async () => false,
    leaveGroup: async () => false,
    getGroupMembers: async () => [],
    getGroupByToken: (tokenId) => get().groups.find(g => g.linkedTokenId === tokenId),
    isGroupMember: (groupId) => get().myGroupIds.has(groupId),
    refreshGroups: async () => {},
}));
