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

export interface Group {
    id: string;
    name: string;
    description: string;
    createdBy: string;
    createdAt: Date;
    memberCount: number;
    linkedTokenId?: string; // Optional link to a trading token
    linkedTokenSymbol?: string; // Token symbol for display
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
    createGroup: (name: string, description: string, tokenId?: string, tokenSymbol?: string) => Promise<string | null>;
    joinGroup: (groupId: string) => Promise<boolean>;
    leaveGroup: (groupId: string) => Promise<boolean>;
    getGroupMembers: (groupId: string) => Promise<GroupMember[]>;
    getGroupByToken: (tokenId: string) => Group | undefined;
    isGroupMember: (groupId: string) => boolean;
    refreshGroups: () => Promise<void>;
}

const GroupsContext = createContext<GroupsContextType | undefined>(undefined);

export function GroupsProvider({ children }: { children: React.ReactNode }) {
    const { telegramId, username } = useUserContext();
    const [groups, setGroups] = useState<Group[]>([]);
    const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // Fetch user's groups
    const refreshGroups = useCallback(async () => {
        if (!telegramId) return;

        setLoading(true);
        try {
            // Get all groups where user is a member
            const userGroupsRef = collection(dbfs, `user/${telegramId}/groups`);
            const userGroupsSnapshot = await getDocs(userGroupsRef);

            const groupIds = new Set<string>();
            const groupPromises: Promise<Group | null>[] = [];

            userGroupsSnapshot.forEach((docSnapshot) => {
                const groupId = docSnapshot.id;
                groupIds.add(groupId);
                groupPromises.push(
                    (async () => {
                        const groupRef = doc(dbfs, `groups/${groupId}`);
                        const groupSnap = await getDoc(groupRef);
                        if (groupSnap.exists()) {
                            const data = groupSnap.data();
                            // Get member count
                            const membersRef = collection(dbfs, `groups/${groupId}/members`);
                            const membersSnap = await getDocs(membersRef);

                            return {
                                id: groupSnap.id,
                                name: data.name,
                                description: data.description || "",
                                createdBy: data.createdBy,
                                createdAt: data.createdAt?.toDate() || new Date(),
                                memberCount: membersSnap.size,
                                linkedTokenId: data.linkedTokenId,
                                linkedTokenSymbol: data.linkedTokenSymbol,
                            } as Group;
                        }
                        return null;
                    })()
                );
            });

            const groupResults = await Promise.all(groupPromises);
            const validGroups = groupResults.filter((g): g is Group => g !== null);

            setMyGroupIds(groupIds);
            setGroups(validGroups);
        } catch (error) {
            console.error("Error fetching groups:", error);
        } finally {
            setLoading(false);
        }
    }, [telegramId]);

    // Create a new group (optionally linked to a token)
    const createGroup = useCallback(async (
        name: string,
        description: string,
        tokenId?: string,
        tokenSymbol?: string
    ): Promise<string | null> => {
        if (!telegramId || !username) return null;

        try {
            const groupId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const groupRef = doc(dbfs, `groups/${groupId}`);

            await setDoc(groupRef, {
                name,
                description,
                createdBy: telegramId,
                createdAt: serverTimestamp(),
                maxMembers: tokenId ? 1000 : 5, // Token groups can have up to 1000 members
                ...(tokenId && { linkedTokenId: tokenId }),
                ...(tokenSymbol && { linkedTokenSymbol: tokenSymbol }),
            });

            // Add creator as admin member
            const memberRef = doc(dbfs, `groups/${groupId}/members/${telegramId}`);
            await setDoc(memberRef, {
                username: username || "Unknown",
                role: "admin",
                joinedAt: serverTimestamp(),
            });

            // Add group to user's groups
            const userGroupRef = doc(dbfs, `user/${telegramId}/groups/${groupId}`);
            await setDoc(userGroupRef, {
                joinedAt: serverTimestamp(),
            });

            await refreshGroups();
            return groupId;
        } catch (error) {
            console.error("Error creating group:", error);
            return null;
        }
    }, [telegramId, username, refreshGroups]);

    // Join a group
    const joinGroup = useCallback(async (groupId: string): Promise<boolean> => {
        if (!telegramId || !username) return false;

        try {
            // Check if group exists and has space
            const groupRef = doc(dbfs, `groups/${groupId}`);
            const groupSnap = await getDoc(groupRef);

            if (!groupSnap.exists()) return false;

            const groupData = groupSnap.data();
            const membersRef = collection(dbfs, `groups/${groupId}/members`);
            const membersSnap = await getDocs(membersRef);

            if (membersSnap.size >= (groupData.maxMembers || 5)) {
                return false; // Group is full
            }

            // Add as member
            const memberRef = doc(dbfs, `groups/${groupId}/members/${telegramId}`);
            await setDoc(memberRef, {
                username: username || "Unknown",
                role: "member",
                joinedAt: serverTimestamp(),
            });

            // Add to user's groups
            const userGroupRef = doc(dbfs, `user/${telegramId}/groups/${groupId}`);
            await setDoc(userGroupRef, {
                joinedAt: serverTimestamp(),
            });

            await refreshGroups();
            return true;
        } catch (error) {
            console.error("Error joining group:", error);
            return false;
        }
    }, [telegramId, username, refreshGroups]);

    // Leave a group
    const leaveGroup = useCallback(async (groupId: string): Promise<boolean> => {
        if (!telegramId) return false;

        try {
            // Remove from group members
            const memberRef = doc(dbfs, `groups/${groupId}/members/${telegramId}`);
            await deleteDoc(memberRef);

            // Remove from user's groups
            const userGroupRef = doc(dbfs, `user/${telegramId}/groups/${groupId}`);
            await deleteDoc(userGroupRef);

            await refreshGroups();
            return true;
        } catch (error) {
            console.error("Error leaving group:", error);
            return false;
        }
    }, [telegramId, refreshGroups]);

    // Get group members
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

    // Check if user is member of group
    const isGroupMember = useCallback((groupId: string): boolean => {
        return myGroupIds.has(groupId);
    }, [myGroupIds]);

    // Get group linked to a specific token
    const getGroupByToken = useCallback((tokenId: string): Group | undefined => {
        return groups.find(g => g.linkedTokenId === tokenId);
    }, [groups]);

    // Initial fetch
    useEffect(() => {
        if (telegramId) {
            refreshGroups();
        }
    }, [telegramId, refreshGroups]);

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
