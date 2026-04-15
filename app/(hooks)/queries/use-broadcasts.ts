"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";
import type {
  Broadcast,
  BroadcastPost,
  UserReaction,
} from "@/lib/broadcasts-types";

const DISCOVERY_PAGE_SIZE = 50;
const POSTS_PAGE_SIZE = 25;

function docToBroadcast(
  id: string,
  data: Record<string, unknown>,
): Broadcast {
  return {
    id,
    handle: (data.handle as string) ?? id,
    name: (data.name as string) ?? "Untitled",
    bio: (data.bio as string) ?? "",
    avatar: (data.avatar as string) ?? null,
    coverImage: (data.coverImage as string) ?? null,
    verified: (data.verified as boolean) ?? false,
    createdAt: (data.createdAt as Broadcast["createdAt"]) ?? null,
    subscriberCount: (data.subscriberCount as number) ?? 0,
    postCount: (data.postCount as number) ?? 0,
  };
}

function docToPost(
  id: string,
  broadcastId: string,
  data: Record<string, unknown>,
): BroadcastPost {
  return {
    id,
    broadcastId,
    content: (data.content as string) ?? "",
    media: (data.media as string[]) ?? [],
    createdAt: (data.createdAt as BroadcastPost["createdAt"]) ?? null,
    editedAt: (data.editedAt as BroadcastPost["editedAt"]) ?? null,
    parentPostId: (data.parentPostId as string | null) ?? null,
    reactions:
      (data.reactions as BroadcastPost["reactions"]) ?? {},
    viewCount: (data.viewCount as number) ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Discovery — verified broadcasts, live-subscribed
// ---------------------------------------------------------------------------

export function useBroadcastsDiscovery(enabled = true) {
  const queryClient = useQueryClient();
  const queryKey = ["broadcasts", "discovery", "verified"];

  useEffect(() => {
    if (!enabled) return;
    const q = query(
      collection(dbfs, "broadcasts"),
      where("verified", "==", true),
      orderBy("subscriberCount", "desc"),
      limit(DISCOVERY_PAGE_SIZE),
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const broadcasts = snapshot.docs.map((d) =>
          docToBroadcast(d.id, d.data()),
        );
        queryClient.setQueryData(queryKey, broadcasts);
      },
      (err) => {
        console.error("[useBroadcastsDiscovery] listener error:", err);
        queryClient.setQueryData<Broadcast[]>(
          queryKey,
          (prev) => prev ?? [],
        );
      },
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return useQuery<Broadcast[]>({
    queryKey,
    queryFn: () => [],
    enabled,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// My subscriptions — the list of broadcasts the current user follows
// ---------------------------------------------------------------------------

export function useMyBroadcastSubscriptions(
  qcId: string | null,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const queryKey = ["broadcasts", "subscriptions", qcId];

  useEffect(() => {
    if (!enabled || !qcId) return;
    // Read the user's reverse index (written by subscribeToBroadcast), then
    // hydrate each subscription with its broadcast doc.
    const q = query(
      collection(dbfs, "user", qcId, "broadcastSubscriptions"),
      orderBy("subscribedAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        const broadcasts = await Promise.all(
          snapshot.docs.map(async (subDoc) => {
            const broadcastId =
              (subDoc.data().broadcastId as string) ?? subDoc.id;
            const snap = await getDoc(doc(dbfs, "broadcasts", broadcastId));
            if (!snap.exists()) return null;
            return docToBroadcast(snap.id, snap.data());
          }),
        );
        queryClient.setQueryData(
          queryKey,
          broadcasts.filter((b): b is Broadcast => b !== null),
        );
      },
      (err) => {
        console.error("[useMyBroadcastSubscriptions] listener error:", err);
      },
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, qcId]);

  return useQuery<Broadcast[]>({
    queryKey,
    queryFn: () => [],
    enabled: enabled && !!qcId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// Resolve handle → broadcast, with live updates
// ---------------------------------------------------------------------------

export function useBroadcastByHandle(handle: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["broadcasts", "byHandle", handle];

  useEffect(() => {
    if (!handle) return;
    const normalized = handle.toLowerCase();
    let unsubBroadcast: (() => void) | null = null;

    (async () => {
      const handleSnap = await getDoc(
        doc(dbfs, "broadcastHandles", normalized),
      );
      if (!handleSnap.exists()) {
        queryClient.setQueryData(queryKey, null);
        return;
      }
      const broadcastId = handleSnap.data().broadcastId as string;
      unsubBroadcast = onSnapshot(
        doc(dbfs, "broadcasts", broadcastId),
        (snap) => {
          if (!snap.exists()) {
            queryClient.setQueryData(queryKey, null);
            return;
          }
          queryClient.setQueryData(
            queryKey,
            docToBroadcast(snap.id, snap.data()),
          );
        },
        (err) => console.error("[useBroadcastByHandle] listener error:", err),
      );
    })();

    return () => {
      if (unsubBroadcast) unsubBroadcast();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  return useQuery<Broadcast | null>({
    queryKey,
    queryFn: () => null,
    enabled: !!handle,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// Posts feed for a broadcast — live-subscribed (latest N)
// ---------------------------------------------------------------------------

export function useBroadcastPosts(broadcastId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["broadcasts", "posts", broadcastId];

  useEffect(() => {
    if (!broadcastId) return;
    const q = query(
      collection(dbfs, "broadcasts", broadcastId, "posts"),
      orderBy("createdAt", "desc"),
      limit(POSTS_PAGE_SIZE),
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const posts = snapshot.docs.map((d) =>
          docToPost(d.id, broadcastId, d.data()),
        );
        queryClient.setQueryData(queryKey, posts);
      },
      (err) => console.error("[useBroadcastPosts] listener error:", err),
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId]);

  return useQuery<BroadcastPost[]>({
    queryKey,
    queryFn: () => [],
    enabled: !!broadcastId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// Single post (for deep-linked detail page)
// ---------------------------------------------------------------------------

export function useBroadcastPost(
  broadcastId: string | null,
  postId: string | null,
) {
  const queryClient = useQueryClient();
  const queryKey = ["broadcasts", "post", broadcastId, postId];

  useEffect(() => {
    if (!broadcastId || !postId) return;
    const ref = doc(dbfs, "broadcasts", broadcastId, "posts", postId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          queryClient.setQueryData(queryKey, null);
          return;
        }
        queryClient.setQueryData(
          queryKey,
          docToPost(snap.id, broadcastId, snap.data()),
        );
      },
      (err) => console.error("[useBroadcastPost] listener error:", err),
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId, postId]);

  return useQuery<BroadcastPost | null>({
    queryKey,
    queryFn: () => null,
    enabled: !!broadcastId && !!postId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// Subscription status for current user
// ---------------------------------------------------------------------------

export function useIsSubscribed(
  broadcastId: string | null,
  qcId: string | null,
) {
  return useQuery<boolean>({
    queryKey: ["broadcasts", "isSubscribed", broadcastId, qcId],
    queryFn: async () => {
      if (!broadcastId || !qcId) return false;
      const snap = await getDoc(
        doc(dbfs, "broadcasts", broadcastId, "subscribers", qcId),
      );
      return snap.exists();
    },
    enabled: !!broadcastId && !!qcId,
  });
}

// ---------------------------------------------------------------------------
// Live subscription status — { subscribed, muted } for the current user.
// Reads the subscriber doc directly so changes (mute toggle, subscribe,
// unsubscribe) reflect instantly without a manual invalidate.
// ---------------------------------------------------------------------------

export interface BroadcastSubscriptionStatus {
  subscribed: boolean;
  muted: boolean;
}

export function useBroadcastSubscriptionStatus(
  broadcastId: string | null,
  qcId: string | null,
) {
  const queryClient = useQueryClient();
  const queryKey = [
    "broadcasts",
    "subscriptionStatus",
    broadcastId,
    qcId,
  ];

  useEffect(() => {
    if (!broadcastId || !qcId) return;
    const ref = doc(
      dbfs,
      "broadcasts",
      broadcastId,
      "subscribers",
      qcId,
    );
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          queryClient.setQueryData<BroadcastSubscriptionStatus>(queryKey, {
            subscribed: false,
            muted: false,
          });
          return;
        }
        const data = snap.data();
        queryClient.setQueryData<BroadcastSubscriptionStatus>(queryKey, {
          subscribed: true,
          muted: (data.muted as boolean) ?? false,
        });
      },
      (err) =>
        console.error("[useBroadcastSubscriptionStatus] listener error:", err),
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId, qcId]);

  return useQuery<BroadcastSubscriptionStatus>({
    queryKey,
    queryFn: () =>
      ({ subscribed: false, muted: false }) satisfies BroadcastSubscriptionStatus,
    enabled: !!broadcastId && !!qcId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// Current user's reaction on a given post
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Is the current user an admin of this broadcast?
// ---------------------------------------------------------------------------

export function useIsBroadcastAdmin(
  broadcastId: string | null,
  qcId: string | null,
) {
  const queryClient = useQueryClient();
  const queryKey = ["broadcasts", "isAdmin", broadcastId, qcId];

  useEffect(() => {
    if (!broadcastId || !qcId) return;
    const ref = doc(dbfs, "broadcasts", broadcastId, "admins", qcId);
    const unsub = onSnapshot(
      ref,
      (snap) => queryClient.setQueryData(queryKey, snap.exists()),
      (err) => console.error("[useIsBroadcastAdmin] listener error:", err),
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId, qcId]);

  return useQuery<boolean>({
    queryKey,
    queryFn: () => false,
    enabled: !!broadcastId && !!qcId,
    staleTime: Infinity,
  });
}

export function useUserReaction(
  broadcastId: string | null,
  postId: string | null,
  qcId: string | null,
) {
  const queryClient = useQueryClient();
  const queryKey = ["broadcasts", "userReaction", broadcastId, postId, qcId];

  useEffect(() => {
    if (!broadcastId || !postId || !qcId) return;
    const ref = doc(
      dbfs,
      "broadcasts",
      broadcastId,
      "posts",
      postId,
      "userReactions",
      qcId,
    );
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          queryClient.setQueryData(queryKey, null);
          return;
        }
        const data = snap.data();
        queryClient.setQueryData<UserReaction>(queryKey, {
          emoji: data.emoji,
          reactedAt: data.reactedAt ?? null,
        });
      },
      (err) => console.error("[useUserReaction] listener error:", err),
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId, postId, qcId]);

  return useQuery<UserReaction | null>({
    queryKey,
    queryFn: () => null,
    enabled: !!broadcastId && !!postId && !!qcId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// Subscribers list (admin-only view). Returns the most recent 100
// subscribers with their resolved QC username + profile photo when available.
// Rules already gate the subcollection to the subscriber or admins of the
// broadcast, so a non-admin call will return an empty list.
// ---------------------------------------------------------------------------

export interface BroadcastSubscriberRow {
  qcId: string;
  subscribedAt: Broadcast["createdAt"];
  muted: boolean;
  username: string | null;
  profilePhotoUrl: string | null;
}

const SUBSCRIBERS_PAGE_SIZE = 100;
const USERNAMES_BATCH_SIZE = 30; // Firestore 'in' operator cap

async function resolveUsernamesForQcIds(
  qcIds: string[],
): Promise<Map<string, { displayUsername: string; profilePhotoUrl: string | null }>> {
  const map = new Map<
    string,
    { displayUsername: string; profilePhotoUrl: string | null }
  >();
  for (let i = 0; i < qcIds.length; i += USERNAMES_BATCH_SIZE) {
    const chunk = qcIds.slice(i, i + USERNAMES_BATCH_SIZE);
    if (chunk.length === 0) continue;
    const snap = await getDocs(
      query(collection(dbfs, "qcUsernames"), where("qcId", "in", chunk)),
    );
    snap.forEach((d) => {
      const data = d.data();
      map.set(data.qcId as string, {
        displayUsername: (data.displayUsername as string) ?? d.id,
        profilePhotoUrl: (data.profilePhotoUrl as string) ?? null,
      });
    });
  }
  return map;
}

export function useBroadcastSubscribers(broadcastId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["broadcasts", "subscribers", broadcastId];

  useEffect(() => {
    if (!broadcastId) return;
    const q = query(
      collection(dbfs, "broadcasts", broadcastId, "subscribers"),
      orderBy("subscribedAt", "desc"),
      limit(SUBSCRIBERS_PAGE_SIZE),
    );
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const rows: Omit<BroadcastSubscriberRow, "username" | "profilePhotoUrl">[] =
          snap.docs.map((d) => ({
            qcId: d.id,
            subscribedAt: (d.data().subscribedAt as Broadcast["createdAt"]) ?? null,
            muted: (d.data().muted as boolean) ?? false,
          }));

        // Paint the raw list immediately so the page renders fast, then
        // hydrate usernames async.
        queryClient.setQueryData<BroadcastSubscriberRow[]>(
          queryKey,
          rows.map((r) => ({ ...r, username: null, profilePhotoUrl: null })),
        );

        try {
          const usernameMap = await resolveUsernamesForQcIds(
            rows.map((r) => r.qcId),
          );
          queryClient.setQueryData<BroadcastSubscriberRow[]>(
            queryKey,
            rows.map((r) => ({
              ...r,
              username: usernameMap.get(r.qcId)?.displayUsername ?? null,
              profilePhotoUrl:
                usernameMap.get(r.qcId)?.profilePhotoUrl ?? null,
            })),
          );
        } catch (err) {
          console.error("[useBroadcastSubscribers] username resolve failed:", err);
        }
      },
      (err) =>
        console.error("[useBroadcastSubscribers] listener error:", err),
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastId]);

  return useQuery<BroadcastSubscriberRow[]>({
    queryKey,
    queryFn: () => [],
    enabled: !!broadcastId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// Prefetch helper — one-shot fetch used for initial page loads
// ---------------------------------------------------------------------------

export async function fetchVerifiedBroadcastsOnce(): Promise<Broadcast[]> {
  const q = query(
    collection(dbfs, "broadcasts"),
    where("verified", "==", true),
    orderBy("subscriberCount", "desc"),
    limit(DISCOVERY_PAGE_SIZE),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToBroadcast(d.id, d.data()));
}
