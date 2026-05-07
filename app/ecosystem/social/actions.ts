"use server";

import { after } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { authWithQcIdClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";
import { bumpAffinity } from "@/lib/social-affinity";
import { embedAndStorePost, mixIntoTaste } from "@/lib/social-embedding";
import { isQcTeamHandle } from "@/lib/qc-team";
import {
  claimSocialHandleSchema,
  deleteSocialPostSchema,
  editSocialPostSchema,
  followSocialUserSchema,
  likeSocialPostSchema,
  publishSocialPostSchema,
  repostSocialPostSchema,
  unlikeSocialPostSchema,
  updateSocialProfileSchema,
} from "@/lib/validations";

// ---------------------------------------------------------------------------
// Helpers — fetch the caller's profile snapshot for denormalization onto
// posts, follow records, etc. We snapshot author data at write time so feeds
// render cheaply without a join. Callers without a profile cannot post,
// follow, or like — they must claim a handle first.
// ---------------------------------------------------------------------------

interface ProfileSnapshot {
  qcId: string;
  handle: string;
  displayName: string;
  avatar: string | null;
  isPro: boolean;
}

async function loadProfileSnapshot(qcId: string): Promise<ProfileSnapshot> {
  const snap = await firestore.doc(`socialProfiles/${qcId}`).get();
  if (!snap.exists) {
    throw new Error("Set up your social profile first");
  }
  const data = snap.data() ?? {};
  const handle = (data.handle as string) ?? "";
  const proExpiresAt = data.proExpiresAt as
    | { toMillis(): number }
    | null
    | undefined;
  const hasPaidPro =
    proExpiresAt != null && proExpiresAt.toMillis() > Date.now();
  return {
    qcId,
    handle,
    displayName: (data.displayName as string) ?? "",
    avatar: (data.avatar as string | null) ?? null,
    isPro: hasPaidPro || isQcTeamHandle(handle),
  };
}

// ---------------------------------------------------------------------------
// ensureSocialProfile — idempotent auto-onboard. Mints a social profile from
// the user's existing QC username + profile photo so they don't have to claim
// a handle separately. Sanitizes the QC username to the social handle
// alphabet (a-z0-9_), and on collision appends a numeric suffix until a free
// handle is found. If the user has no QC username yet, returns
// `{ created: false, missingQcUsername: true }` so the client can prompt for
// one.
// ---------------------------------------------------------------------------

const SOCIAL_HANDLE_ALPHABET = /[^a-z0-9_]/g;

function sanitizeQcUsernameToHandle(qcUsername: string): string {
  return qcUsername
    .toLowerCase()
    .replace(SOCIAL_HANDLE_ALPHABET, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
}

export const ensureSocialProfile = authWithQcIdClient
  .schema(z.object({}))
  .action(async ({ ctx: { qcId } }) => {
    const profileRef = firestore.doc(`socialProfiles/${qcId}`);
    const existing = await profileRef.get();
    if (existing.exists) {
      return {
        created: false,
        handle: (existing.data()?.handle as string | undefined) ?? null,
      };
    }

    const userSnap = await firestore.doc(`user/${qcId}`).get();
    const qcUsername = (userSnap.data()?.qcUsername as string | undefined) ?? "";
    if (!qcUsername.trim()) {
      return { created: false, missingQcUsername: true as const };
    }

    let base = sanitizeQcUsernameToHandle(qcUsername);
    if (base.length < 3) base = `${base}_${qcId.slice(0, 4)}`.slice(0, 20);

    // Pull the profile photo from the QC username index — that's where the
    // upload lives (see updateProfilePhotoUrl in chat/actions.ts).
    let avatar: string | null = null;
    const usernameIdx = await firestore
      .collection("qcUsernames")
      .where("qcId", "==", qcId)
      .limit(1)
      .get();
    if (!usernameIdx.empty) {
      avatar =
        (usernameIdx.docs[0].data().profilePhotoUrl as string | null) ?? null;
    }

    const displayName = qcUsername.replace(/^@+/, "").trim() || base;

    let candidate = base;
    let suffix = 0;
    let claimedHandle: string | null = null;
    while (suffix < 25) {
      const handleRef = firestore.doc(`socialHandles/${candidate}`);
      try {
        await firestore.runTransaction(async (tx) => {
          const [handleSnap, profileSnap] = await Promise.all([
            tx.get(handleRef),
            tx.get(profileRef),
          ]);
          if (profileSnap.exists) {
            claimedHandle =
              (profileSnap.data()?.handle as string | undefined) ?? candidate;
            return;
          }
          if (handleSnap.exists) {
            throw new Error("handle-taken");
          }
          const now = FieldValue.serverTimestamp();
          tx.set(handleRef, { qcId, claimedAt: now });
          tx.set(profileRef, {
            handle: candidate,
            displayName,
            bio: "",
            avatar,
            banner: null,
            website: null,
            linkedBroadcastHandle: null,
            createdAt: now,
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            subscriptionEnabled: false,
            proExpiresAt: null,
          });
          claimedHandle = candidate;
        });
        if (claimedHandle) break;
      } catch (err) {
        if (err instanceof Error && err.message === "handle-taken") {
          suffix += 1;
          const tail = String(suffix);
          candidate = `${base.slice(0, Math.max(1, 20 - tail.length))}${tail}`;
          continue;
        }
        throw err;
      }
    }

    if (!claimedHandle) {
      throw new Error("Couldn't claim a social handle automatically");
    }
    return { created: true, handle: claimedHandle };
  });

// ---------------------------------------------------------------------------
// claimSocialHandle — first-time onboarding. Creates the profile doc and
// claims the handle in the unique-index collection in a single transaction.
// Idempotent if the caller already owns the handle.
// ---------------------------------------------------------------------------

export const claimSocialHandle = authWithQcIdClient
  .schema(claimSocialHandleSchema)
  .action(
    async ({
      parsedInput: { handle, displayName, bio },
      ctx: { qcId },
    }) => {
      const normalizedHandle = handle.toLowerCase();
      const handleRef = firestore.doc(`socialHandles/${normalizedHandle}`);
      const profileRef = firestore.doc(`socialProfiles/${qcId}`);

      await firestore.runTransaction(async (tx) => {
        const [handleSnap, profileSnap] = await Promise.all([
          tx.get(handleRef),
          tx.get(profileRef),
        ]);

        if (handleSnap.exists && handleSnap.data()?.qcId !== qcId) {
          throw new Error("This handle is already taken");
        }
        if (profileSnap.exists) {
          throw new Error("You already have a profile — edit it instead");
        }

        const now = FieldValue.serverTimestamp();
        tx.set(handleRef, { qcId, claimedAt: now });
        tx.set(profileRef, {
          handle: normalizedHandle,
          displayName: displayName.trim(),
          bio: bio.trim(),
          avatar: null,
          banner: null,
          website: null,
          linkedBroadcastHandle: null,
          createdAt: now,
          followerCount: 0,
          followingCount: 0,
          postCount: 0,
          subscriptionEnabled: false,
          proExpiresAt: null,
        });
      });

      return { success: true, handle: normalizedHandle };
    },
  );

// ---------------------------------------------------------------------------
// updateSocialProfile — profile owner edits their own profile. Handle is
// immutable; everything else is patchable. We do not propagate displayName /
// avatar changes to historical posts (snapshot semantics).
// ---------------------------------------------------------------------------

export const updateSocialProfile = authWithQcIdClient
  .schema(updateSocialProfileSchema)
  .action(async ({ parsedInput, ctx: { qcId } }) => {
    const profileRef = firestore.doc(`socialProfiles/${qcId}`);
    const snap = await profileRef.get();
    if (!snap.exists) {
      throw new Error("Set up your social profile first");
    }

    const patch: Record<string, unknown> = {};
    if (parsedInput.displayName !== undefined) {
      patch.displayName = parsedInput.displayName.trim();
    }
    if (parsedInput.bio !== undefined) patch.bio = parsedInput.bio.trim();
    if (parsedInput.avatar !== undefined) patch.avatar = parsedInput.avatar;
    if (parsedInput.banner !== undefined) patch.banner = parsedInput.banner;
    if (parsedInput.website !== undefined) {
      patch.website = parsedInput.website
        ? parsedInput.website.trim()
        : null;
    }

    await profileRef.update(patch);
    return { success: true };
  });

// ---------------------------------------------------------------------------
// publishSocialPost — create a top-level post or a reply. When this is a
// reply, the parent's replyCount is incremented atomically. Author identity
// (handle, displayName, avatar) is denormalized onto the post for cheap feed
// rendering.
// ---------------------------------------------------------------------------

export const publishSocialPost = authWithQcIdClient
  .schema(publishSocialPostSchema)
  .action(
    async ({
      parsedInput: {
        content,
        media,
        parentAuthorQcId,
        parentPostId,
        attachedTokenId,
        gated,
        unlockPriceTon,
      },
      ctx: { qcId },
    }) => {
      const author = await loadProfileSnapshot(qcId);

      // Creator-license check: only QC Pro members can publish gated posts.
      // Team handles are treated as Pro permanently.
      if (gated && !author.isPro) {
        throw new Error("QC Pro is required to publish gated posts");
      }

      const profileRef = firestore.doc(`socialProfiles/${qcId}`);
      const postRef = profileRef.collection("posts").doc();

      const isReply = parentAuthorQcId !== null && parentPostId !== null;
      const parentPostRef = isReply
        ? firestore.doc(
            `socialProfiles/${parentAuthorQcId}/posts/${parentPostId}`,
          )
        : null;

      const now = FieldValue.serverTimestamp();
      let parentAuthorForAffinity: string | null = null;
      await firestore.runTransaction(async (tx) => {
        if (parentPostRef) {
          const parentSnap = await tx.get(parentPostRef);
          if (!parentSnap.exists) {
            throw new Error("Parent post no longer exists");
          }
          parentAuthorForAffinity =
            (parentSnap.get("authorQcId") as string | undefined) ??
            parentAuthorQcId;
          tx.update(parentPostRef, {
            replyCount: FieldValue.increment(1),
          });
        }

        tx.set(postRef, {
          authorQcId: qcId,
          authorHandle: author.handle,
          authorDisplayName: author.displayName,
          authorAvatar: author.avatar,
          authorIsPro: author.isPro,
          content: content.trim(),
          media,
          parentAuthorQcId,
          parentPostId,
          repostOfAuthorQcId: null,
          repostOfPostId: null,
          attachedTokenId,
          reactions: {},
          replyCount: 0,
          repostCount: 0,
          viewCount: 0,
          createdAt: now,
          editedAt: null,
          gated: gated && unlockPriceTon !== null && unlockPriceTon > 0,
          unlockPriceTon: gated ? unlockPriceTon : null,
        });
        tx.update(profileRef, { postCount: FieldValue.increment(1) });
      });

      if (parentAuthorForAffinity) {
        await bumpAffinity(qcId, parentAuthorForAffinity, "reply");
      }

      // Fire-and-forget post-response work: embed the new post for ranking,
      // and on replies fold the parent's embedding into the replier's taste
      // vector. Both run after the response so the user-visible publish path
      // stays fast; failures are swallowed inside the helpers.
      const trimmedContent = content.trim();
      const replyParentAuthor = parentAuthorForAffinity;
      const replyParentPostId = parentPostId;
      after(async () => {
        await embedAndStorePost(qcId, postRef.id, trimmedContent);
        if (replyParentAuthor && replyParentPostId) {
          await mixIntoTaste(qcId, replyParentAuthor, replyParentPostId);
        }
      });

      return { success: true, postId: postRef.id };
    },
  );

// ---------------------------------------------------------------------------
// editSocialPost — author-only. Updates content + stamps editedAt. Media is
// immutable post-publish for now (matches broadcasts behavior).
// ---------------------------------------------------------------------------

export const editSocialPost = authWithQcIdClient
  .schema(editSocialPostSchema)
  .action(
    async ({
      parsedInput: { authorQcId, postId, content },
      ctx: { qcId },
    }) => {
      if (authorQcId !== qcId) {
        throw new Error("You can only edit your own posts");
      }
      const postRef = firestore.doc(
        `socialProfiles/${authorQcId}/posts/${postId}`,
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
// deleteSocialPost — author-only. Decrements the author's postCount and the
// parent's replyCount if applicable. Likes and replies subcollections are
// abandoned (unreachable, no PII).
// ---------------------------------------------------------------------------

export const deleteSocialPost = authWithQcIdClient
  .schema(deleteSocialPostSchema)
  .action(
    async ({ parsedInput: { authorQcId, postId }, ctx: { qcId } }) => {
      if (authorQcId !== qcId) {
        throw new Error("You can only delete your own posts");
      }
      const profileRef = firestore.doc(`socialProfiles/${authorQcId}`);
      const postRef = profileRef.collection("posts").doc(postId);

      await firestore.runTransaction(async (tx) => {
        const snap = await tx.get(postRef);
        if (!snap.exists) return; // idempotent

        const data = snap.data() ?? {};
        const parentAuthorQcId =
          (data.parentAuthorQcId as string | null) ?? null;
        const parentPostId = (data.parentPostId as string | null) ?? null;

        if (parentAuthorQcId && parentPostId) {
          const parentRef = firestore.doc(
            `socialProfiles/${parentAuthorQcId}/posts/${parentPostId}`,
          );
          tx.update(parentRef, { replyCount: FieldValue.increment(-1) });
        }

        tx.delete(postRef);
        tx.update(profileRef, { postCount: FieldValue.increment(-1) });
      });

      return { success: true };
    },
  );

// ---------------------------------------------------------------------------
// followSocialUser / unfollowSocialUser — symmetric pair. We write three
// docs per follow: the target's followers/{me}, my socialFollowing/{target}
// reverse index, and counter increments on both profiles. The reverse index
// lets the home feed enumerate "who I follow" without a collection-group
// query.
// ---------------------------------------------------------------------------

export const followSocialUser = authWithQcIdClient
  .schema(followSocialUserSchema)
  .action(async ({ parsedInput: { targetQcId }, ctx: { qcId } }) => {
    if (targetQcId === qcId) {
      throw new Error("You cannot follow yourself");
    }
    const targetRef = firestore.doc(`socialProfiles/${targetQcId}`);
    const meRef = firestore.doc(`socialProfiles/${qcId}`);
    const followerRef = targetRef.collection("followers").doc(qcId);
    const followingRef = firestore.doc(
      `user/${qcId}/socialFollowing/${targetQcId}`,
    );

    await firestore.runTransaction(async (tx) => {
      const [targetSnap, meSnap, followerSnap] = await Promise.all([
        tx.get(targetRef),
        tx.get(meRef),
        tx.get(followerRef),
      ]);
      if (!targetSnap.exists) throw new Error("User not found");
      if (!meSnap.exists) {
        throw new Error("Set up your social profile first");
      }
      if (followerSnap.exists) return; // idempotent

      const now = FieldValue.serverTimestamp();
      tx.set(followerRef, { followedAt: now });
      tx.set(followingRef, { targetQcId, followedAt: now });
      tx.update(targetRef, { followerCount: FieldValue.increment(1) });
      tx.update(meRef, { followingCount: FieldValue.increment(1) });
    });

    await bumpAffinity(qcId, targetQcId, "follow");
    return { success: true };
  });

export const unfollowSocialUser = authWithQcIdClient
  .schema(followSocialUserSchema)
  .action(async ({ parsedInput: { targetQcId }, ctx: { qcId } }) => {
    const targetRef = firestore.doc(`socialProfiles/${targetQcId}`);
    const meRef = firestore.doc(`socialProfiles/${qcId}`);
    const followerRef = targetRef.collection("followers").doc(qcId);
    const followingRef = firestore.doc(
      `user/${qcId}/socialFollowing/${targetQcId}`,
    );

    await firestore.runTransaction(async (tx) => {
      const followerSnap = await tx.get(followerRef);
      if (!followerSnap.exists) return; // idempotent

      tx.delete(followerRef);
      tx.delete(followingRef);
      tx.update(targetRef, { followerCount: FieldValue.increment(-1) });
      tx.update(meRef, { followingCount: FieldValue.increment(-1) });
    });

    await bumpAffinity(qcId, targetQcId, "unfollow");
    return { success: true };
  });

// ---------------------------------------------------------------------------
// likeSocialPost / unlikeSocialPost — each user holds at most one reaction
// emoji per post. Selecting a different emoji swaps it. The per-user like
// doc lives at `.../posts/{postId}/likes/{likerQcId}` and is used both for
// "did I like this" reads and dedup on the aggregate counter.
// ---------------------------------------------------------------------------

export const likeSocialPost = authWithQcIdClient
  .schema(likeSocialPostSchema)
  .action(
    async ({
      parsedInput: { authorQcId, postId, emoji },
      ctx: { qcId },
    }) => {
      const postRef = firestore.doc(
        `socialProfiles/${authorQcId}/posts/${postId}`,
      );
      const likeRef = postRef.collection("likes").doc(qcId);

      const result = await firestore.runTransaction(async (tx) => {
        const [postSnap, existingSnap] = await Promise.all([
          tx.get(postRef),
          tx.get(likeRef),
        ]);
        if (!postSnap.exists) throw new Error("Post not found");

        const existing = existingSnap.exists
          ? (existingSnap.data()?.emoji as string | undefined)
          : undefined;

        if (existing === emoji) {
          // Same emoji — clear it
          tx.delete(likeRef);
          tx.update(postRef, {
            [`reactions.${emoji}`]: FieldValue.increment(-1),
          });
          return { liked: false as const, emoji: null };
        }

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
        tx.set(likeRef, {
          emoji,
          reactedAt: FieldValue.serverTimestamp(),
        });
        return { liked: true as const, emoji };
      });

      if (result.liked && authorQcId !== qcId) {
        await bumpAffinity(qcId, authorQcId, "like");
        after(async () => {
          await mixIntoTaste(qcId, authorQcId, postId);
        });
      }

      return { success: true, ...result };
    },
  );

export const unlikeSocialPost = authWithQcIdClient
  .schema(unlikeSocialPostSchema)
  .action(
    async ({ parsedInput: { authorQcId, postId }, ctx: { qcId } }) => {
      const postRef = firestore.doc(
        `socialProfiles/${authorQcId}/posts/${postId}`,
      );
      const likeRef = postRef.collection("likes").doc(qcId);

      await firestore.runTransaction(async (tx) => {
        const existingSnap = await tx.get(likeRef);
        if (!existingSnap.exists) return;
        const emoji = existingSnap.data()?.emoji as string | undefined;
        tx.delete(likeRef);
        if (emoji) {
          tx.update(postRef, {
            [`reactions.${emoji}`]: FieldValue.increment(-1),
          });
        }
      });

      return { success: true };
    },
  );

// ---------------------------------------------------------------------------
// repostSocialPost — repost or quote-repost. A user can repost any given
// post at most once (either plain or as a quote). The sentinel doc at
// `.../posts/{postId}/reposts/{reposterQcId}` enforces this and stores a
// pointer back to the new post so we can undo cleanly. Reposting a second
// time returns the existing repost id so the UI can no-op idempotently.
// ---------------------------------------------------------------------------

export const repostSocialPost = authWithQcIdClient
  .schema(repostSocialPostSchema)
  .action(
    async ({
      parsedInput: { authorQcId, postId, comment },
      ctx: { qcId },
    }) => {
      const author = await loadProfileSnapshot(qcId);

      const originalRef = firestore.doc(
        `socialProfiles/${authorQcId}/posts/${postId}`,
      );
      const repostMarkerRef = originalRef.collection("reposts").doc(qcId);
      const meRef = firestore.doc(`socialProfiles/${qcId}`);
      const newPostRef = meRef.collection("posts").doc();

      const now = FieldValue.serverTimestamp();
      const result = await firestore.runTransaction(async (tx) => {
        const [originalSnap, markerSnap] = await Promise.all([
          tx.get(originalRef),
          tx.get(repostMarkerRef),
        ]);
        if (!originalSnap.exists) throw new Error("Post not found");

        if (markerSnap.exists) {
          // Already reposted — return the existing repost id so the UI can
          // navigate / show the existing repost rather than creating a new one.
          return {
            existing: true as const,
            postId: (markerSnap.data()?.repostPostId as string) ?? null,
          };
        }

        tx.set(newPostRef, {
          authorQcId: qcId,
          authorHandle: author.handle,
          authorDisplayName: author.displayName,
          authorAvatar: author.avatar,
          authorIsPro: author.isPro,
          content: comment.trim(),
          media: [],
          parentAuthorQcId: null,
          parentPostId: null,
          repostOfAuthorQcId: authorQcId,
          repostOfPostId: postId,
          attachedTokenId: null,
          reactions: {},
          replyCount: 0,
          repostCount: 0,
          viewCount: 0,
          createdAt: now,
          editedAt: null,
          gated: false,
          unlockPriceTon: null,
        });
        tx.set(repostMarkerRef, {
          repostPostId: newPostRef.id,
          repostedAt: now,
        });
        tx.update(originalRef, { repostCount: FieldValue.increment(1) });
        tx.update(meRef, { postCount: FieldValue.increment(1) });
        return { existing: false as const, postId: newPostRef.id };
      });

      return { success: true, ...result };
    },
  );

// ---------------------------------------------------------------------------
// undoSocialRepost — removes the caller's existing repost of a target post.
// Mirror of repostSocialPost: deletes the repost post from the caller's
// timeline, removes the sentinel marker, decrements counters. Idempotent.
// ---------------------------------------------------------------------------

export const undoSocialRepost = authWithQcIdClient
  .schema(repostSocialPostSchema.pick({ authorQcId: true, postId: true }))
  .action(
    async ({ parsedInput: { authorQcId, postId }, ctx: { qcId } }) => {
      const originalRef = firestore.doc(
        `socialProfiles/${authorQcId}/posts/${postId}`,
      );
      const repostMarkerRef = originalRef.collection("reposts").doc(qcId);
      const meRef = firestore.doc(`socialProfiles/${qcId}`);

      await firestore.runTransaction(async (tx) => {
        const markerSnap = await tx.get(repostMarkerRef);
        if (!markerSnap.exists) return; // idempotent

        const repostPostId = markerSnap.data()?.repostPostId as
          | string
          | undefined;
        if (repostPostId) {
          const repostPostRef = meRef.collection("posts").doc(repostPostId);
          tx.delete(repostPostRef);
          tx.update(meRef, { postCount: FieldValue.increment(-1) });
        }
        tx.delete(repostMarkerRef);
        tx.update(originalRef, { repostCount: FieldValue.increment(-1) });
      });

      return { success: true };
    },
  );
