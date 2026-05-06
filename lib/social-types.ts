import type { Timestamp } from "firebase/firestore";
import type { SocialReaction } from "@/lib/validations";

/**
 * QC Social profile — one per user. Stored at `socialProfiles/{qcId}`.
 * The `qcId` is the encrypted Telegram ID (same identifier used everywhere
 * else in the app: chat, broadcasts, wallet linking).
 */
export interface SocialProfile {
  /** qcId of the owner */
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  avatar: string | null;
  banner: string | null;
  website: string | null;
  /** Optional broadcast handle this user owns — for cross-linking in the UI */
  linkedBroadcastHandle: string | null;
  createdAt: Timestamp | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  /**
   * Subscription readiness flag. Phase-2 monetization will flip this to true
   * for creators that opt into paid subs. Kept here so phase-2 doesn't
   * require a schema migration.
   */
  subscriptionEnabled: boolean;
  /**
   * QC Pro membership expiry. When `> now`, the user has the verified badge
   * and can publish gated posts. Null means never subscribed.
   */
  proExpiresAt: Timestamp | null;
}

/**
 * A post by a profile owner. Lives at
 * `socialProfiles/{authorQcId}/posts/{postId}`. Replies share this shape but
 * carry a non-null `parentAuthorQcId` + `parentPostId`.
 */
export interface SocialPost {
  id: string;
  authorQcId: string;
  /** Denormalized for cheap rendering in feed lists */
  authorHandle: string;
  authorDisplayName: string;
  authorAvatar: string | null;
  /** Snapshotted at write time — author had QC Pro when this post was published */
  authorIsPro: boolean;
  content: string;
  media: string[];
  parentAuthorQcId: string | null;
  parentPostId: string | null;
  /** Quote-repost target (if this post is a repost with optional commentary) */
  repostOfAuthorQcId: string | null;
  repostOfPostId: string | null;
  attachedTokenId: string | null;
  reactions: Partial<Record<SocialReaction, number>>;
  replyCount: number;
  repostCount: number;
  viewCount: number;
  createdAt: Timestamp | null;
  editedAt: Timestamp | null;
  /**
   * When true, the post body is locked behind a per-post unlock fee paid in
   * TON. Only QC Pro members can publish gated posts.
   */
  gated: boolean;
  /** Unlock price in TON (full units, not nanoTON). Null when not gated. */
  unlockPriceTon: number | null;
}

/**
 * Receipt that a reader has paid to unlock a gated post. Lives at
 * `socialProfiles/{authorQcId}/posts/{postId}/unlocks/{readerQcId}`.
 */
export interface SocialPostUnlock {
  readerQcId: string;
  amountTon: number;
  txHash: string;
  unlockedAt: Timestamp | null;
}

/**
 * Payment ledger for both Pro subscriptions and gated post unlocks.
 * Lives at `subscriptionPayments/{paymentId}`.
 */
export interface SubscriptionPayment {
  id: string;
  payerQcId: string;
  kind: "pro" | "unlock";
  amountTon: number;
  amountUsd: number;
  /** For unlock payments: target post coords */
  targetAuthorQcId: string | null;
  targetPostId: string | null;
  /** Memo string the user must include so we can match the tx */
  memo: string;
  status: "pending" | "verified" | "expired";
  txHash: string | null;
  createdAt: Timestamp | null;
  verifiedAt: Timestamp | null;
}

export interface SocialFollowing {
  targetQcId: string;
  followedAt: Timestamp | null;
}

export interface SocialLike {
  emoji: SocialReaction;
  reactedAt: Timestamp | null;
}
