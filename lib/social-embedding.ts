/**
 * Phase-3 semantic ranking — server-side embedding pipeline. Posts get a
 * Gemini embedding stamped on the doc at publish time; positive engagement
 * (like/reply/unlock) mixes the post's embedding into the reader's taste
 * vector at `user/{qcId}/socialMeta/taste`. The for-you ranker then layers
 * cosine similarity over the existing engagement + recency + affinity score.
 */

import "server-only";

import { embed } from "ai";
import { google } from "@ai-sdk/google";
import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "@/app/(firebase)/server";
import { EMBEDDING_DIMS, mixRunningAverage } from "@/lib/social-similarity";
import { env } from "@/env";

/** Cap embed input — Gemini accepts up to ~2k tokens but post bodies are
 * short. Trimming protects us from runaway repost-comment payloads. */
const MAX_EMBED_CHARS = 4000;

/**
 * Embed a post body with Gemini's `gemini-embedding-001` at 768 dims and
 * `SEMANTIC_SIMILARITY` task type. Returns null on any failure — callers
 * should treat embedding as best-effort, never block the user-visible path.
 */
export async function embedPostText(text: string): Promise<number[] | null> {
  const trimmed = text.trim().slice(0, MAX_EMBED_CHARS);
  if (!trimmed) return null;
  // No key configured = no embeddings, but everything else still works.
  if (!env.GEMINI_API_KEY && !env.GOOGLE_GENERATIVE_AI_API_KEY) return null;

  try {
    const { embedding } = await embed({
      model: google.embedding("gemini-embedding-001"),
      value: trimmed,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMS,
          taskType: "SEMANTIC_SIMILARITY",
        },
      },
    });
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMS) {
      return null;
    }
    return embedding;
  } catch (err) {
    console.error("[social-embedding] embed failed:", err);
    return null;
  }
}

/**
 * Embed + write a post's embedding back onto its doc. Designed to run inside
 * `after()` so it doesn't block the publish response. Idempotent — if the
 * field is already present this is a no-op. Failures are swallowed; the post
 * will simply lack an embedding and rank by the heuristic-only path.
 */
export async function embedAndStorePost(
  authorQcId: string,
  postId: string,
  text: string,
): Promise<void> {
  try {
    const ref = firestore.doc(
      `socialProfiles/${authorQcId}/posts/${postId}`,
    );
    const snap = await ref.get();
    if (!snap.exists) return;
    if (snap.get("embedding")) return; // already done

    const vector = await embedPostText(text);
    if (!vector) return;

    await ref.update({
      embedding: vector,
      embeddedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error(
      `[social-embedding] embedAndStorePost ${authorQcId}/${postId}:`,
      err,
    );
  }
}

/**
 * Mix a post's embedding into the reader's taste vector. Call after a
 * positive interaction (like, reply, unlock). Self-engagement is a no-op so
 * a creator liking their own posts doesn't drift their own taste model.
 *
 * The taste doc lives at `user/{qcId}/socialMeta/taste` — covered by the
 * existing `user/{userId}/{document=**}` wildcard rule (owner-only read).
 *
 * Best-effort: any failure is swallowed and logged. The ranker degrades
 * gracefully (falls back to heuristic) when the taste doc is absent.
 */
export async function mixIntoTaste(
  readerQcId: string,
  authorQcId: string,
  postId: string,
): Promise<void> {
  if (!readerQcId || !authorQcId || readerQcId === authorQcId) return;

  try {
    const postRef = firestore.doc(
      `socialProfiles/${authorQcId}/posts/${postId}`,
    );
    const postSnap = await postRef.get();
    if (!postSnap.exists) return;

    let embedding = postSnap.get("embedding") as number[] | undefined;
    // Embedding might still be in flight — try a single inline pass so the
    // first interactions on a brand-new post still feed the taste model.
    if (!embedding) {
      const content = (postSnap.get("content") as string) ?? "";
      const computed = await embedPostText(content);
      if (!computed) return;
      embedding = computed;
      // Stash so future readers don't re-embed.
      await postRef
        .update({
          embedding: computed,
          embeddedAt: FieldValue.serverTimestamp(),
        })
        .catch(() => {});
    }

    const tasteRef = firestore.doc(
      `user/${readerQcId}/socialMeta/taste`,
    );

    await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(tasteRef);
      const prev = snap.exists ? (snap.get("vector") as number[] | null) : null;
      const prevCount = snap.exists
        ? ((snap.get("interactionCount") as number) ?? 0)
        : 0;

      const next = mixRunningAverage(prev, embedding!, prevCount);
      tx.set(
        tasteRef,
        {
          vector: next,
          interactionCount: prevCount + 1,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
  } catch (err) {
    console.error(
      `[social-embedding] mixIntoTaste ${readerQcId}←${authorQcId}/${postId}:`,
      err,
    );
  }
}
