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
   * Phase-2 monetization placeholder. When true the body is hidden for
   * non-subscribers. Always false in v1.
   */
  gated: boolean;
}

export interface SocialFollowing {
  targetQcId: string;
  followedAt: Timestamp | null;
}

export interface SocialLike {
  emoji: SocialReaction;
  reactedAt: Timestamp | null;
}
