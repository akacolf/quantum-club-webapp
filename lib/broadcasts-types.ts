import type { Timestamp } from "firebase/firestore";
import type { BroadcastReaction } from "@/lib/validations";

export interface Broadcast {
  id: string;
  handle: string;
  name: string;
  bio: string;
  avatar: string | null;
  coverImage: string | null;
  verified: boolean;
  createdAt: Timestamp | null;
  subscriberCount: number;
  postCount: number;
}

export interface BroadcastPost {
  id: string;
  broadcastId: string;
  content: string;
  media: string[];
  createdAt: Timestamp | null;
  editedAt: Timestamp | null;
  parentPostId: string | null;
  reactions: Partial<Record<BroadcastReaction, number>>;
  viewCount: number;
}

export interface BroadcastSubscription {
  broadcastId: string;
  subscribedAt: Timestamp | null;
  muted: boolean;
}

export interface UserReaction {
  emoji: BroadcastReaction;
  reactedAt: Timestamp | null;
}
