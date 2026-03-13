import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbfs } from "@/app/(firebase)/client";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    serverTimestamp,
    writeBatch,
} from "firebase/firestore";
import type { Group, GroupMember } from "@/app/(contexts)/GroupsContext";
import { getAccountNfts } from "@/lib/nft-marketplace";

export function useGroupsQuery(telegramId: string | null) {
    return useQuery<{ groups: Group[]; memberIds: Set<string> }>({
        queryKey: ["groups", telegramId],
        queryFn: async () => {
            if (!telegramId) return { groups: [], memberIds: new Set<string>() };

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
                                nftGated: data.nftGated || false,
                                requiredNftCollection: data.requiredNftCollection,
                                requiredNftCollectionName: data.requiredNftCollectionName,
                            } as Group;
                        }
                        return null;
                    })()
                );
            });

            const groupResults = await Promise.all(groupPromises);
            return {
                groups: groupResults.filter((g): g is Group => g !== null),
                memberIds: groupIds,
            };
        },
        enabled: !!telegramId,
        staleTime: 30_000,
    });
}

export function useGroupMembers(groupId: string, enabled = true) {
    return useQuery<GroupMember[]>({
        queryKey: ["groupMembers", groupId],
        queryFn: async () => {
            const membersRef = collection(dbfs, `groups/${groupId}/members`);
            const membersSnap = await getDocs(membersRef);
            return membersSnap.docs.map((doc) => ({
                telegramId: doc.id,
                username: doc.data().username || "Unknown",
                role: doc.data().role || "member",
                joinedAt: doc.data().joinedAt?.toDate() || new Date(),
            }));
        },
        enabled: enabled && !!groupId,
        staleTime: 30_000,
    });
}

export function useCreateGroup(telegramId: string | null, username: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            name,
            description,
            tokenId,
            tokenSymbol,
            nftGated,
            requiredNftCollection,
            requiredNftCollectionName,
        }: {
            name: string;
            description: string;
            tokenId?: string;
            tokenSymbol?: string;
            nftGated?: boolean;
            requiredNftCollection?: string;
            requiredNftCollectionName?: string;
        }) => {
            if (!telegramId || !username) throw new Error("Not authenticated");

            const groupId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const groupRef = doc(dbfs, `groups/${groupId}`);
            const memberRef = doc(dbfs, `groups/${groupId}/members/${telegramId}`);
            const userGroupRef = doc(dbfs, `user/${telegramId}/groups/${groupId}`);

            // Atomic batch write — all three docs succeed or all fail
            const batch = writeBatch(dbfs);
            batch.set(groupRef, {
                name,
                description,
                createdBy: telegramId,
                createdAt: serverTimestamp(),
                maxMembers: tokenId ? 1000 : 5,
                ...(tokenId && { linkedTokenId: tokenId }),
                ...(tokenSymbol && { linkedTokenSymbol: tokenSymbol }),
                ...(nftGated && { nftGated: true }),
                ...(requiredNftCollection && { requiredNftCollection }),
                ...(requiredNftCollectionName && { requiredNftCollectionName }),
            });
            batch.set(memberRef, {
                username: username || "Unknown",
                role: "admin",
                joinedAt: serverTimestamp(),
            });
            batch.set(userGroupRef, { joinedAt: serverTimestamp() });
            await batch.commit();

            return groupId;
        },
        onSuccess: (_data, _vars) => {
            queryClient.invalidateQueries({ queryKey: ["groups", telegramId] });
            queryClient.invalidateQueries({ queryKey: ["groupMembers"] });
        },
    });
}

export function useJoinGroup(telegramId: string | null, username: string | null, walletAddress?: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (groupId: string) => {
            if (!telegramId || !username) throw new Error("Not authenticated");

            const groupRef = doc(dbfs, `groups/${groupId}`);
            const groupSnap = await getDoc(groupRef);
            if (!groupSnap.exists()) throw new Error("Group not found");

            const groupData = groupSnap.data();

            // NFT gate check
            if (groupData.nftGated && groupData.requiredNftCollection) {
                if (!walletAddress) {
                    throw new Error("Wallet required to join NFT-gated groups");
                }
                const userNfts = await getAccountNfts(walletAddress);
                const hasRequired = userNfts.some(
                    (nft) => nft.collectionAddress === groupData.requiredNftCollection
                );
                if (!hasRequired) {
                    throw new Error(
                        `You need a ${groupData.requiredNftCollectionName || "required"} NFT to join this group`
                    );
                }
            }

            const membersRef = collection(dbfs, `groups/${groupId}/members`);
            const membersSnap = await getDocs(membersRef);

            if (membersSnap.size >= (groupData.maxMembers || 5)) {
                throw new Error("Group is full");
            }

            const memberRef = doc(dbfs, `groups/${groupId}/members/${telegramId}`);
            await setDoc(memberRef, {
                username: username || "Unknown",
                role: "member",
                joinedAt: serverTimestamp(),
            });

            const userGroupRef = doc(dbfs, `user/${telegramId}/groups/${groupId}`);
            await setDoc(userGroupRef, { joinedAt: serverTimestamp() });
        },
        onSuccess: (_data, groupId) => {
            queryClient.invalidateQueries({ queryKey: ["groups", telegramId] });
            queryClient.invalidateQueries({ queryKey: ["groupMembers", groupId] });
        },
    });
}

export function useLeaveGroup(telegramId: string | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (groupId: string) => {
            if (!telegramId) throw new Error("Not authenticated");

            const memberRef = doc(dbfs, `groups/${groupId}/members/${telegramId}`);
            await deleteDoc(memberRef);

            const userGroupRef = doc(dbfs, `user/${telegramId}/groups/${groupId}`);
            await deleteDoc(userGroupRef);
        },
        onSuccess: (_data, groupId) => {
            queryClient.invalidateQueries({ queryKey: ["groups", telegramId] });
            queryClient.invalidateQueries({ queryKey: ["groupMembers", groupId] });
        },
    });
}
