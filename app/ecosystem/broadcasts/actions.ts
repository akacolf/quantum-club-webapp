"use server";

import { FieldValue } from "firebase-admin/firestore";
import { authWithQcIdClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";
import {
  broadcastMuteSchema,
  broadcastReactionSchema,
  broadcastSubscribeSchema,
  broadcastViewSchema,
  deleteBroadcastPostSchema,
  editBroadcastPostSchema,
  publishBroadcastPostSchema,
  updateBroadcastSchema,
  verificationRequestSchema,
} from "@/lib/validations";

// ---------------------------------------------------------------------------
// Admin membership helper — throws if the qcId is not in this broadcast's
// admins subcollection. All admin-gated actions call this first.
// ---------------------------------------------------------------------------

async function assertBroadcastAdmin(qcId: string, broadcastId: string) {
  const snap = await firestore
    .doc(`broadcasts/${broadcastId}/admins/${qcId}`)
    .get();
  if (!snap.exists) {
    throw new Error("You are not an admin of this broadcast");
  }
}

// ---------------------------------------------------------------------------
// submitVerificationRequest — any authed user can request a verified broadcast
// ---------------------------------------------------------------------------

export const submitVerificationRequest = authWithQcIdClient
  .schema(verificationRequestSchema)
  .action(async ({ parsedInput, ctx: { qcId } }) => {
    const normalizedHandle = parsedInput.proposedHandle.toLowerCase();

    // Reject if the handle is already claimed by an existing broadcast
    const handleSnap = await firestore
      .doc(`broadcastHandles/${normalizedHandle}`)
      .get();
    if (handleSnap.exists) {
      throw new Error("This handle is already taken");
    }

    // Reject if the user has a pending request for the same handle
    const pendingSnap = await firestore
      .collection("verificationRequests")
      .where("requesterQcId", "==", qcId)
      .where("proposedHandle", "==", normalizedHandle)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    if (!pendingSnap.empty) {
      throw new Error("You already have a pending request for this handle");
    }

    const docRef = await firestore.collection("verificationRequests").add({
      requesterQcId: qcId,
      proposedHandle: normalizedHandle,
      proposedName: parsedInput.proposedName,
      bio: parsedInput.bio,
      contactTelegram: parsedInput.contactTelegram,
      socials: parsedInput.socials,
      reason: parsedInput.reason,
      status: "pending",
      submittedAt: FieldValue.serverTimestamp(),
    });

    return { success: true, requestId: docRef.id };
  });

// ---------------------------------------------------------------------------
// subscribeToBroadcast / unsubscribeFromBroadcast
// ---------------------------------------------------------------------------

export const subscribeToBroadcast = authWithQcIdClient
  .schema(broadcastSubscribeSchema)
  .action(async ({ parsedInput: { broadcastId }, ctx: { qcId } }) => {
    const broadcastRef = firestore.doc(`broadcasts/${broadcastId}`);
    const subscriberRef = broadcastRef.collection("subscribers").doc(qcId);
    // Reverse index so the user can list their subscriptions without a
    // cross-broadcast collection-group scan.
    const userSubRef = firestore.doc(
      `user/${qcId}/broadcastSubscriptions/${broadcastId}`,
    );

    await firestore.runTransaction(async (tx) => {
      const [broadcastSnap, subSnap] = await Promise.all([
        tx.get(broadcastRef),
        tx.get(subscriberRef),
      ]);
      if (!broadcastSnap.exists) {
        throw new Error("Broadcast not found");
      }
      if (subSnap.exists) {
        return; // Idempotent — already subscribed
      }
      const now = FieldValue.serverTimestamp();
      tx.set(subscriberRef, { subscribedAt: now, muted: false });
      tx.set(userSubRef, {
        broadcastId,
        subscribedAt: now,
        muted: false,
      });
      tx.update(broadcastRef, {
        subscriberCount: FieldValue.increment(1),
      });
    });

    return { success: true };
  });

// Toggle mute on a broadcast subscription. Only subscribed users can mute;
// attempting to mute without a subscription is a no-op error. Writes both the
// canonical subscriber doc (read by the Cloud Function fan-out) and the
// user's reverse index so the two stay in sync.
export const setBroadcastMute = authWithQcIdClient
  .schema(broadcastMuteSchema)
  .action(async ({ parsedInput: { broadcastId, muted }, ctx: { qcId } }) => {
    const subscriberRef = firestore.doc(
      `broadcasts/${broadcastId}/subscribers/${qcId}`,
    );
    const userSubRef = firestore.doc(
      `user/${qcId}/broadcastSubscriptions/${broadcastId}`,
    );

    await firestore.runTransaction(async (tx) => {
      const subSnap = await tx.get(subscriberRef);
      if (!subSnap.exists) {
        throw new Error("Subscribe first to change notification settings");
      }
      tx.update(subscriberRef, { muted });
      tx.set(userSubRef, { muted }, { merge: true });
    });

    return { success: true, muted };
  });

export const unsubscribeFromBroadcast = authWithQcIdClient
  .schema(broadcastSubscribeSchema)
  .action(async ({ parsedInput: { broadcastId }, ctx: { qcId } }) => {
    const broadcastRef = firestore.doc(`broadcasts/${broadcastId}`);
    const subscriberRef = broadcastRef.collection("subscribers").doc(qcId);
    const userSubRef = firestore.doc(
      `user/${qcId}/broadcastSubscriptions/${broadcastId}`,
    );

    await firestore.runTransaction(async (tx) => {
      const subSnap = await tx.get(subscriberRef);
      if (!subSnap.exists) {
        return; // Idempotent — already unsubscribed
      }
      tx.delete(subscriberRef);
      tx.delete(userSubRef);
      tx.update(broadcastRef, {
        subscriberCount: FieldValue.increment(-1),
      });
    });

    return { success: true };
  });

// ---------------------------------------------------------------------------
// togglePostReaction — toggle a single emoji on a broadcast post.
// Each user can hold at most one reaction per post; selecting a new emoji
// replaces the previous one.
// ---------------------------------------------------------------------------

export const togglePostReaction = authWithQcIdClient
  .schema(broadcastReactionSchema)
  .action(
    async ({
      parsedInput: { broadcastId, postId, emoji },
      ctx: { qcId },
    }) => {
      const postRef = firestore.doc(
        `broadcasts/${broadcastId}/posts/${postId}`,
      );
      const userReactionRef = postRef.collection("userReactions").doc(qcId);

      const nextState = await firestore.runTransaction(async (tx) => {
        const [postSnap, existingSnap] = await Promise.all([
          tx.get(postRef),
          tx.get(userReactionRef),
        ]);

        if (!postSnap.exists) {
          throw new Error("Post not found");
        }

        const existing = existingSnap.exists
          ? (existingSnap.data()?.emoji as string | undefined)
          : undefined;

        // Same emoji → remove the reaction
        if (existing === emoji) {
          tx.delete(userReactionRef);
          tx.update(postRef, {
            [`reactions.${emoji}`]: FieldValue.increment(-1),
          });
          return { reacted: false as const, emoji: null };
        }

        // Different emoji → swap: decrement old, increment new
        if (existing) {
          tx.update(postRef, {
            [`reactions.${existing}`]: FieldValue.increment(-1),
            [`reactions.${emoji}`]: FieldValue.increment(1),
          });
        } else {
          tx.update(postRef, {
            [`reactions.${emoji}`]: FieldValue.increment(1),
          });
        }

        tx.set(userReactionRef, {
          emoji,
          reactedAt: FieldValue.serverTimestamp(),
        });

        return { reacted: true as const, emoji };
      });

      return { success: true, ...nextState };
    },
  );

// ---------------------------------------------------------------------------
// recordPostView — idempotent per-user view counter. Each user increments the
// post's aggregate viewCount at most once. The per-user viewer doc is private
// (self-only read) and is used only for dedup — admins never see individual
// view identities, only the aggregate count.
// ---------------------------------------------------------------------------

export const recordPostView = authWithQcIdClient
  .schema(broadcastViewSchema)
  .action(
    async ({ parsedInput: { broadcastId, postId }, ctx: { qcId } }) => {
      const postRef = firestore.doc(
        `broadcasts/${broadcastId}/posts/${postId}`,
      );
      const viewerRef = postRef.collection("viewers").doc(qcId);

      const counted = await firestore.runTransaction(async (tx) => {
        const [postSnap, viewerSnap] = await Promise.all([
          tx.get(postRef),
          tx.get(viewerRef),
        ]);
        if (!postSnap.exists) {
          throw new Error("Post not found");
        }
        if (viewerSnap.exists) return false; // already counted
        tx.set(viewerRef, { viewedAt: FieldValue.serverTimestamp() });
        tx.update(postRef, { viewCount: FieldValue.increment(1) });
        return true;
      });

      return { success: true, counted };
    },
  );

// ===========================================================================
// Admin actions (Phase 2) — post publishing and broadcast management
// ===========================================================================

// ---------------------------------------------------------------------------
// publishPost — admin-only. Creates a post doc, increments postCount.
// ---------------------------------------------------------------------------

export const publishPost = authWithQcIdClient
  .schema(publishBroadcastPostSchema)
  .action(
    async ({
      parsedInput: { broadcastId, content, media },
      ctx: { qcId },
    }) => {
      await assertBroadcastAdmin(qcId, broadcastId);

      const broadcastRef = firestore.doc(`broadcasts/${broadcastId}`);
      const postRef = broadcastRef.collection("posts").doc();

      const now = FieldValue.serverTimestamp();
      await firestore.runTransaction(async (tx) => {
        tx.set(postRef, {
          broadcastId,
          content: content.trim(),
          media,
          createdAt: now,
          editedAt: null,
          parentPostId: null,
          reactions: {},
          viewCount: 0,
        });
        tx.update(broadcastRef, {
          postCount: FieldValue.increment(1),
        });
      });

      return { success: true, postId: postRef.id };
    },
  );

// ---------------------------------------------------------------------------
// editPost — admin-only. Updates content (not media) and stamps editedAt.
// ---------------------------------------------------------------------------

export const editPost = authWithQcIdClient
  .schema(editBroadcastPostSchema)
  .action(
    async ({
      parsedInput: { broadcastId, postId, content },
      ctx: { qcId },
    }) => {
      await assertBroadcastAdmin(qcId, broadcastId);

      const postRef = firestore.doc(
        `broadcasts/${broadcastId}/posts/${postId}`,
      );
      const snap = await postRef.get();
      if (!snap.exists) throw new Error("Post not found");

      await postRef.update({
        content: content.trim(),
        editedAt: FieldValue.serverTimestamp(),
      });

      return { success: true };
    },
  );

// ---------------------------------------------------------------------------
// deletePost — admin-only. Removes the post and decrements postCount. Note:
// the private viewers/userReactions subcollections are abandoned (they become
// unreachable once the parent is deleted); they only consumed storage space
// and contain no personally identifiable content beyond the owning user.
// ---------------------------------------------------------------------------

export const deletePost = authWithQcIdClient
  .schema(deleteBroadcastPostSchema)
  .action(
    async ({ parsedInput: { broadcastId, postId }, ctx: { qcId } }) => {
      await assertBroadcastAdmin(qcId, broadcastId);

      const broadcastRef = firestore.doc(`broadcasts/${broadcastId}`);
      const postRef = broadcastRef.collection("posts").doc(postId);

      await firestore.runTransaction(async (tx) => {
        const snap = await tx.get(postRef);
        if (!snap.exists) return; // idempotent
        tx.delete(postRef);
        tx.update(broadcastRef, {
          postCount: FieldValue.increment(-1),
        });
      });

      return { success: true };
    },
  );

// ---------------------------------------------------------------------------
// updateBroadcast — admin-only. Patches name, bio, avatar, and/or coverImage.
// Handle is immutable (would require migrating broadcastHandles + all deep
// links; deliberately not supported in v1).
// ---------------------------------------------------------------------------

export const updateBroadcast = authWithQcIdClient
  .schema(updateBroadcastSchema)
  .action(
    async ({
      parsedInput: { broadcastId, name, bio, avatar, coverImage },
      ctx: { qcId },
    }) => {
      await assertBroadcastAdmin(qcId, broadcastId);

      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = name.trim();
      if (bio !== undefined) patch.bio = bio;
      if (avatar !== undefined) patch.avatar = avatar;
      if (coverImage !== undefined) patch.coverImage = coverImage;

      await firestore.doc(`broadcasts/${broadcastId}`).update(patch);

      return { success: true };
    },
  );
