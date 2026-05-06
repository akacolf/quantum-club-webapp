"use client";

import { useEffect } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  collectionGroup,
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
  SocialFollowing,
  SocialPost,
  SocialProfile,
} from "@/lib/social-types";
import type { SocialReaction } from "@/lib/validations";
import { rankFeed } from "@/lib/social-rank";
import type { AffinityCounts } from "@/lib/social-affinity";

const FEED_PAGE_SIZE = 50;
const POSTS_PAGE_SIZE = 30;
const REPLIES_PAGE_SIZE = 50;
const FOLLOWS_PAGE_SIZE = 200;

// ---------------------------------------------------------------------------
// Doc → typed-record mappers. Defensive defaulting — Firestore docs can be
// partially populated during writes, and old records may predate later
// schema additions.
// ---------------------------------------------------------------------------

function docToProfile(
  id: string,
  data: Record<string, unknown>,
): SocialProfile {
  return {
    id,
    handle: (data.handle as string) ?? id,
    displayName: (data.displayName as string) ?? "",
    bio: (data.bio as string) ?? "",
    avatar: (data.avatar as string | null) ?? null,
    banner: (data.banner as string | null) ?? null,
    website: (data.website as string | null) ?? null,
    linkedBroadcastHandle:
      (data.linkedBroadcastHandle as string | null) ?? null,
    createdAt: (data.createdAt as SocialProfile["createdAt"]) ?? null,
    followerCount: (data.followerCount as number) ?? 0,
    followingCount: (data.followingCount as number) ?? 0,
    postCount: (data.postCount as number) ?? 0,
    subscriptionEnabled: (data.subscriptionEnabled as boolean) ?? false,
    proExpiresAt:
      (data.proExpiresAt as SocialProfile["proExpiresAt"]) ?? null,
  };
}

function docToPost(id: string, data: Record<string, unknown>): SocialPost {
  return {
    id,
    authorQcId: (data.authorQcId as string) ?? "",
    authorHandle: (data.authorHandle as string) ?? "",
    authorDisplayName: (data.authorDisplayName as string) ?? "",
    authorAvatar: (data.authorAvatar as string | null) ?? null,
    authorIsPro: (data.authorIsPro as boolean) ?? false,
    content: (data.content as string) ?? "",
    media: (data.media as string[]) ?? [],
    parentAuthorQcId: (data.parentAuthorQcId as string | null) ?? null,
    parentPostId: (data.parentPostId as string | null) ?? null,
    repostOfAuthorQcId: (data.repostOfAuthorQcId as string | null) ?? null,
    repostOfPostId: (data.repostOfPostId as string | null) ?? null,
    attachedTokenId: (data.attachedTokenId as string | null) ?? null,
    reactions:
      (data.reactions as SocialPost["reactions"]) ?? {},
    replyCount: (data.replyCount as number) ?? 0,
    repostCount: (data.repostCount as number) ?? 0,
    viewCount: (data.viewCount as number) ?? 0,
    createdAt: (data.createdAt as SocialPost["createdAt"]) ?? null,
    editedAt: (data.editedAt as SocialPost["editedAt"]) ?? null,
    gated: (data.gated as boolean) ?? false,
    unlockPriceTon: (data.unlockPriceTon as number | null) ?? null,
    embedding: Array.isArray(data.embedding)
      ? (data.embedding as number[])
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// useSocialProfile — by qcId, live
// ---------------------------------------------------------------------------

export function useSocialProfile(qcId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "profile", "byId", qcId];

  useEffect(() => {
    if (!qcId) return;
    const unsub = onSnapshot(
      doc(dbfs, "socialProfiles", qcId),
      (snap) => {
        if (!snap.exists()) {
          queryClient.setQueryData(queryKey, null);
          return;
        }
        queryClient.setQueryData(queryKey, docToProfile(snap.id, snap.data()));
      },
      (err) => console.error("[useSocialProfile] listener error:", err),
    );
    return () => unsub();

  }, [qcId]);

  return useQuery<SocialProfile | null>({
    queryKey,
    queryFn: () => null,
    enabled: !!qcId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useSocialProfileByHandle — handle → profile, live. Resolves the handle
// index doc once, then live-subscribes to the profile.
// ---------------------------------------------------------------------------

export function useSocialProfileByHandle(handle: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "profile", "byHandle", handle];

  useEffect(() => {
    if (!handle) return;
    const normalized = handle.toLowerCase();
    let unsubProfile: (() => void) | null = null;

    (async () => {
      const handleSnap = await getDoc(
        doc(dbfs, "socialHandles", normalized),
      );
      if (!handleSnap.exists()) {
        queryClient.setQueryData(queryKey, null);
        return;
      }
      const qcId = handleSnap.data().qcId as string;
      unsubProfile = onSnapshot(
        doc(dbfs, "socialProfiles", qcId),
        (snap) => {
          if (!snap.exists()) {
            queryClient.setQueryData(queryKey, null);
            return;
          }
          queryClient.setQueryData(
            queryKey,
            docToProfile(snap.id, snap.data()),
          );
        },
        (err) =>
          console.error("[useSocialProfileByHandle] listener error:", err),
      );
    })();

    return () => {
      if (unsubProfile) unsubProfile();
    };

  }, [handle]);

  return useQuery<SocialProfile | null>({
    queryKey,
    queryFn: () => null,
    enabled: !!handle,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useHandleAvailability — onboarding helper. Quick existence check; debounce
// the input upstream before passing.
// ---------------------------------------------------------------------------

export function useHandleAvailability(handle: string | null) {
  return useQuery<"available" | "taken" | null>({
    queryKey: ["social", "handleAvailability", handle],
    queryFn: async () => {
      if (!handle) return null;
      const snap = await getDoc(
        doc(dbfs, "socialHandles", handle.toLowerCase()),
      );
      return snap.exists() ? "taken" : "available";
    },
    enabled: !!handle,
  });
}

// ---------------------------------------------------------------------------
// useUserPosts — top-level posts (excludes replies) by a single author, live
// ---------------------------------------------------------------------------

export function useUserPosts(authorQcId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "posts", "byAuthor", authorQcId];

  useEffect(() => {
    if (!authorQcId) return;
    const q = query(
      collection(dbfs, "socialProfiles", authorQcId, "posts"),
      where("parentPostId", "==", null),
      orderBy("createdAt", "desc"),
      limit(POSTS_PAGE_SIZE),
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const posts = snapshot.docs.map((d) => docToPost(d.id, d.data()));
        queryClient.setQueryData(queryKey, posts);
      },
      (err) => console.error("[useUserPosts] listener error:", err),
    );
    return () => unsub();

  }, [authorQcId]);

  return useQuery<SocialPost[]>({
    queryKey,
    queryFn: () => [],
    enabled: !!authorQcId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useUserReplies — replies authored by a user (i.e. their posts where
// parentPostId is set)
// ---------------------------------------------------------------------------

export function useUserReplies(authorQcId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "posts", "replies", "byAuthor", authorQcId];

  useEffect(() => {
    if (!authorQcId) return;
    const q = query(
      collection(dbfs, "socialProfiles", authorQcId, "posts"),
      where("parentPostId", "!=", null),
      orderBy("parentPostId"),
      orderBy("createdAt", "desc"),
      limit(POSTS_PAGE_SIZE),
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const posts = snapshot.docs.map((d) => docToPost(d.id, d.data()));
        queryClient.setQueryData(queryKey, posts);
      },
      (err) => console.error("[useUserReplies] listener error:", err),
    );
    return () => unsub();

  }, [authorQcId]);

  return useQuery<SocialPost[]>({
    queryKey,
    queryFn: () => [],
    enabled: !!authorQcId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useSocialPost — single post detail, live
// ---------------------------------------------------------------------------

export function useSocialPost(
  authorQcId: string | null,
  postId: string | null,
) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "post", authorQcId, postId];

  useEffect(() => {
    if (!authorQcId || !postId) return;
    const unsub = onSnapshot(
      doc(dbfs, "socialProfiles", authorQcId, "posts", postId),
      (snap) => {
        if (!snap.exists()) {
          queryClient.setQueryData(queryKey, null);
          return;
        }
        queryClient.setQueryData(queryKey, docToPost(snap.id, snap.data()));
      },
      (err) => console.error("[useSocialPost] listener error:", err),
    );
    return () => unsub();

  }, [authorQcId, postId]);

  return useQuery<SocialPost | null>({
    queryKey,
    queryFn: () => null,
    enabled: !!authorQcId && !!postId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// usePostReplies — direct replies to a single post, live. Replies are
// scattered across each replier's own posts subcollection, so we use a
// collection-group query filtered by (parentAuthorQcId, parentPostId).
// ---------------------------------------------------------------------------

export function usePostReplies(
  parentAuthorQcId: string | null,
  parentPostId: string | null,
) {
  const queryClient = useQueryClient();
  const queryKey = [
    "social",
    "post",
    "replies",
    parentAuthorQcId,
    parentPostId,
  ];

  useEffect(() => {
    if (!parentAuthorQcId || !parentPostId) return;
    const q = query(
      collectionGroup(dbfs, "posts"),
      where("parentAuthorQcId", "==", parentAuthorQcId),
      where("parentPostId", "==", parentPostId),
      orderBy("createdAt", "asc"),
      limit(REPLIES_PAGE_SIZE),
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const posts = snapshot.docs.map((d) => docToPost(d.id, d.data()));
        queryClient.setQueryData(queryKey, posts);
      },
      (err) => console.error("[usePostReplies] listener error:", err),
    );
    return () => unsub();

  }, [parentAuthorQcId, parentPostId]);

  return useQuery<SocialPost[]>({
    queryKey,
    queryFn: () => [],
    enabled: !!parentAuthorQcId && !!parentPostId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useDiscoverFeed — global recent top-level posts via collection-group, live.
// Filters out replies (parentPostId == null).
// ---------------------------------------------------------------------------

export function useDiscoverFeed() {
  const queryClient = useQueryClient();
  const queryKey = ["social", "feed", "discover"];

  useEffect(() => {
    const q = query(
      collectionGroup(dbfs, "posts"),
      where("parentPostId", "==", null),
      orderBy("createdAt", "desc"),
      limit(FEED_PAGE_SIZE),
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const posts = snapshot.docs.map((d) => docToPost(d.id, d.data()));
        queryClient.setQueryData(queryKey, posts);
      },
      (err) => console.error("[useDiscoverFeed] listener error:", err),
    );
    return () => unsub();
  }, [queryClient]);

  return useQuery<SocialPost[]>({
    queryKey,
    queryFn: () => [],
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useFollowingList — qcIds the current user follows. Uses the reverse index
// at user/{qcId}/socialFollowing/* so this is a single-collection scan.
// ---------------------------------------------------------------------------

export function useFollowingList(qcId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "following", qcId];

  useEffect(() => {
    if (!qcId) return;
    const q = query(
      collection(dbfs, "user", qcId, "socialFollowing"),
      orderBy("followedAt", "desc"),
      limit(FOLLOWS_PAGE_SIZE),
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const follows: SocialFollowing[] = snapshot.docs.map((d) => ({
          targetQcId: (d.data().targetQcId as string) ?? d.id,
          followedAt:
            (d.data().followedAt as SocialFollowing["followedAt"]) ?? null,
        }));
        queryClient.setQueryData(queryKey, follows);
      },
      (err) => console.error("[useFollowingList] listener error:", err),
    );
    return () => unsub();

  }, [qcId]);

  return useQuery<SocialFollowing[]>({
    queryKey,
    queryFn: () => [],
    enabled: !!qcId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useFollowingFeed — top-level posts from everyone the user follows, merged
// + sorted client-side. Firestore collection-group queries can't filter by
// authorQcId IN (large array), so we fan out one query per followed author
// and merge. For v1 this scales fine to a few hundred follows; in a later
// phase we can switch to a per-user fan-out timeline doc.
// ---------------------------------------------------------------------------

export function useFollowingFeed(qcId: string | null) {
  const { data: following = [] } = useFollowingList(qcId);
  const targetIds = following.map((f) => f.targetQcId);

  const queries = useQueries({
    queries: targetIds.map((targetId) => ({
      queryKey: ["social", "feed", "followingPosts", targetId],
      queryFn: async () => {
        const q = query(
          collection(dbfs, "socialProfiles", targetId, "posts"),
          where("parentPostId", "==", null),
          orderBy("createdAt", "desc"),
          limit(20),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => docToPost(d.id, d.data()));
      },
      staleTime: 30_000,
    })),
  });

  const merged = queries
    .flatMap((q) => q.data ?? [])
    .sort((a, b) => {
      const at = a.createdAt?.toMillis?.() ?? 0;
      const bt = b.createdAt?.toMillis?.() ?? 0;
      return bt - at;
    })
    .slice(0, FEED_PAGE_SIZE);

  const isLoading = queries.some((q) => q.isLoading);
  return { posts: merged, isLoading };
}

// ---------------------------------------------------------------------------
// useAffinityScores — phase-2 personalization signal. Live snapshot of the
// viewer's per-author engagement counters at user/{qcId}/socialAffinity/*.
// These counters are bumped server-side on likes/replies/follows/unlocks
// plus debounced view pings.
// ---------------------------------------------------------------------------

export function useAffinityScores(qcId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "affinity", qcId];

  useEffect(() => {
    if (!qcId) return;
    const q = collection(dbfs, "user", qcId, "socialAffinity");
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const map = new Map<string, Partial<AffinityCounts>>();
        snapshot.docs.forEach((d) => {
          const data = d.data();
          map.set(d.id, {
            likes: (data.likes as number) ?? 0,
            replies: (data.replies as number) ?? 0,
            unlocks: (data.unlocks as number) ?? 0,
            follows: (data.follows as number) ?? 0,
            profileViews: (data.profileViews as number) ?? 0,
            postViews: (data.postViews as number) ?? 0,
          });
        });
        queryClient.setQueryData(queryKey, map);
      },
      (err) => console.error("[useAffinityScores] listener error:", err),
    );
    return () => unsub();
  }, [qcId]);

  return useQuery<Map<string, Partial<AffinityCounts>>>({
    queryKey,
    queryFn: () => new Map(),
    enabled: !!qcId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useSocialTaste — phase-3 personalization signal. Live snapshot of the
// viewer's running-average taste embedding at user/{qcId}/socialMeta/taste,
// updated server-side when the user likes / replies to / unlocks a post.
// Returns null until the user has any positive engagement.
// ---------------------------------------------------------------------------

export interface SocialTaste {
  vector: number[];
  interactionCount: number;
}

export function useSocialTaste(qcId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "taste", qcId];

  useEffect(() => {
    if (!qcId) return;
    const unsub = onSnapshot(
      doc(dbfs, "user", qcId, "socialMeta", "taste"),
      (snap) => {
        if (!snap.exists()) {
          queryClient.setQueryData(queryKey, null);
          return;
        }
        const data = snap.data();
        const vector = Array.isArray(data.vector)
          ? (data.vector as number[])
          : null;
        if (!vector) {
          queryClient.setQueryData(queryKey, null);
          return;
        }
        queryClient.setQueryData(queryKey, {
          vector,
          interactionCount: (data.interactionCount as number) ?? 0,
        });
      },
      (err) => console.error("[useSocialTaste] listener error:", err),
    );
    return () => unsub();
  }, [qcId]);

  return useQuery<SocialTaste | null>({
    queryKey,
    queryFn: () => null,
    enabled: !!qcId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useForYouFeed — for-you ranker. Pools discover + following posts, scores
// by engagement + recency + follow-affinity + per-author affinity (phase 2)
// + semantic similarity to the viewer's taste vector (phase 3), then runs a
// diversity pass. All signals fold in live; the feed re-ranks automatically
// as new engagement events post.
// ---------------------------------------------------------------------------

export function useForYouFeed(qcId: string | null) {
  const { data: discover = [] } = useDiscoverFeed();
  const { posts: followingPosts, isLoading: followingLoading } =
    useFollowingFeed(qcId);
  const { data: following = [] } = useFollowingList(qcId);
  const { data: affinityByAuthor } = useAffinityScores(qcId);
  const { data: taste } = useSocialTaste(qcId);

  const followedQcIds = new Set(following.map((f) => f.targetQcId));
  const pool = [...discover, ...followingPosts];
  const ranked = rankFeed(pool, {
    followedQcIds,
    selfQcId: qcId,
    affinityByAuthor,
    tasteVector: taste?.vector ?? null,
    tasteInteractionCount: taste?.interactionCount ?? 0,
  });

  return {
    posts: ranked.slice(0, FEED_PAGE_SIZE),
    isLoading: followingLoading && discover.length === 0,
  };
}

// ---------------------------------------------------------------------------
// useIsFollowing — does the current user follow targetQcId? Live so the
// follow button updates instantly without manual invalidation.
// ---------------------------------------------------------------------------

export function useIsFollowing(
  qcId: string | null,
  targetQcId: string | null,
) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "isFollowing", qcId, targetQcId];

  useEffect(() => {
    if (!qcId || !targetQcId || qcId === targetQcId) return;
    const unsub = onSnapshot(
      doc(dbfs, "user", qcId, "socialFollowing", targetQcId),
      (snap) => {
        queryClient.setQueryData(queryKey, snap.exists());
      },
      (err) => console.error("[useIsFollowing] listener error:", err),
    );
    return () => unsub();

  }, [qcId, targetQcId]);

  return useQuery<boolean>({
    queryKey,
    queryFn: () => false,
    enabled: !!qcId && !!targetQcId && qcId !== targetQcId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useMyLike — what (if any) reaction the current user has placed on a post.
// Returns the emoji or null. Live so the like button sticks immediately on
// any device.
// ---------------------------------------------------------------------------

export function useMyLike(
  qcId: string | null,
  authorQcId: string | null,
  postId: string | null,
) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "myLike", qcId, authorQcId, postId];

  useEffect(() => {
    if (!qcId || !authorQcId || !postId) return;
    const unsub = onSnapshot(
      doc(
        dbfs,
        "socialProfiles",
        authorQcId,
        "posts",
        postId,
        "likes",
        qcId,
      ),
      (snap) => {
        if (!snap.exists()) {
          queryClient.setQueryData(queryKey, null);
          return;
        }
        queryClient.setQueryData(
          queryKey,
          (snap.data().emoji as SocialReaction) ?? null,
        );
      },
      (err) => console.error("[useMyLike] listener error:", err),
    );
    return () => unsub();

  }, [qcId, authorQcId, postId]);

  return useQuery<SocialReaction | null>({
    queryKey,
    queryFn: () => null,
    enabled: !!qcId && !!authorQcId && !!postId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useFollowers — list followers of a profile (display only; not used by feed
// queries which use the reverse index).
// ---------------------------------------------------------------------------

export function useFollowers(qcId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "followers", qcId];

  useEffect(() => {
    if (!qcId) return;
    const q = query(
      collection(dbfs, "socialProfiles", qcId, "followers"),
      orderBy("followedAt", "desc"),
      limit(FOLLOWS_PAGE_SIZE),
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const ids = snapshot.docs.map((d) => d.id);
        queryClient.setQueryData(queryKey, ids);
      },
      (err) => console.error("[useFollowers] listener error:", err),
    );
    return () => unsub();

  }, [qcId]);

  return useQuery<string[]>({
    queryKey,
    queryFn: () => [],
    enabled: !!qcId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useCreatorEarnings — live snapshot of the creator's accrued unlock revenue
// at creatorEarnings/{qcId}. Returns null when nothing has been earned yet.
// ---------------------------------------------------------------------------

export interface CreatorEarnings {
  totalEarnedTon: number;
  pendingTon: number;
  paidOutTon: number;
  lastEarnedAtMs: number | null;
}

export function useCreatorEarnings(qcId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "creatorEarnings", qcId];

  useEffect(() => {
    if (!qcId) return;
    const unsub = onSnapshot(
      doc(dbfs, "creatorEarnings", qcId),
      (snap) => {
        if (!snap.exists()) {
          queryClient.setQueryData(queryKey, null);
          return;
        }
        const data = snap.data();
        const last = data.lastEarnedAt as
          | { toMillis(): number }
          | null
          | undefined;
        queryClient.setQueryData(queryKey, {
          totalEarnedTon: (data.totalEarnedTon as number) ?? 0,
          pendingTon: (data.pendingTon as number) ?? 0,
          paidOutTon: (data.paidOutTon as number) ?? 0,
          lastEarnedAtMs: last?.toMillis?.() ?? null,
        });
      },
      (err) => console.error("[useCreatorEarnings] listener error:", err),
    );
    return () => unsub();
  }, [qcId]);

  return useQuery<CreatorEarnings | null>({
    queryKey,
    queryFn: () => null,
    enabled: !!qcId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// useProAutoRenew — live snapshot of the user's auto-renew preference and
// last attempt timestamp from the private user/{qcId} doc. Other Pro fields
// (proExpiresAt, proTelegramId) live here too but are only read server-side
// by the cron — the client uses socialProfile.proExpiresAt instead.
// ---------------------------------------------------------------------------

export function useProAutoRenew(qcId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "proAutoRenew", qcId];

  useEffect(() => {
    if (!qcId) return;
    const unsub = onSnapshot(
      doc(dbfs, "user", qcId),
      (snap) => {
        if (!snap.exists()) {
          queryClient.setQueryData(queryKey, {
            autoRenew: false,
            lastAttemptMs: null,
          });
          return;
        }
        const data = snap.data();
        const last = data.lastAutoRenewAttemptAt as
          | { toMillis(): number }
          | null
          | undefined;
        queryClient.setQueryData(queryKey, {
          autoRenew: (data.autoRenew as boolean) ?? false,
          lastAttemptMs: last?.toMillis?.() ?? null,
        });
      },
      (err) => console.error("[useProAutoRenew] listener error:", err),
    );
    return () => unsub();
  }, [qcId]);

  return useQuery<{ autoRenew: boolean; lastAttemptMs: number | null }>({
    queryKey,
    queryFn: () => ({ autoRenew: false, lastAttemptMs: null }),
    enabled: !!qcId,
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// usePostUnlock — live presence check on the unlock receipt for the current
// reader against a single gated post. Returns true once the unlock doc lands.
// ---------------------------------------------------------------------------

export function usePostUnlock(
  authorQcId: string | null,
  postId: string | null,
  readerQcId: string | null,
) {
  const queryClient = useQueryClient();
  const queryKey = ["social", "postUnlock", authorQcId, postId, readerQcId];

  useEffect(() => {
    if (!authorQcId || !postId || !readerQcId) return;
    const unsub = onSnapshot(
      doc(
        dbfs,
        `socialProfiles/${authorQcId}/posts/${postId}/unlocks/${readerQcId}`,
      ),
      (snap) => {
        queryClient.setQueryData(queryKey, snap.exists());
      },
      (err) => console.error("[usePostUnlock] listener error:", err),
    );
    return () => unsub();
  }, [authorQcId, postId, readerQcId]);

  return useQuery<boolean>({
    queryKey,
    queryFn: () => false,
    enabled: !!authorQcId && !!postId && !!readerQcId,
    staleTime: Infinity,
  });
}
