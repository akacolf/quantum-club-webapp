/**
 * Phase-3 semantic ranking — pure math + constants for cosine similarity and
 * running-average taste vector updates. Kept client-safe (no firebase-admin
 * imports) so the for-you ranker can use it without server-only deps.
 */

/** Embedding dimensionality. Matches the `outputDimensionality` we ask Gemini
 * for in `lib/social-embedding.ts`. Gemini's MRL-trained models retain most
 * quality at 768 — small enough to ship in feed snapshots without bloating
 * payloads. If this changes, existing post embeddings need to be backfilled
 * (different dims aren't comparable). */
export const EMBEDDING_DIMS = 768;

/** Don't apply the semantic boost until the user has accumulated this many
 * positive interactions. Below this the taste vector is noisy and would
 * actively hurt the ranking (random direction × random posts). */
export const MIN_INTERACTIONS_FOR_TASTE = 5;

/**
 * Multiplier on cosine similarity. Scaled so a strong semantic match (sim
 * ≈ 0.6, which is unusually high) contributes ~1.2 — comparable to a single
 * strong affinity signal. Tuned to nudge surfacing without overwhelming the
 * follow / engagement signals.
 */
export const SEMANTIC_BOOST_SCALE = 2.0;

/**
 * Cosine similarity between two equal-length vectors. Returns a value in
 * [-1, 1] (typically [0, 1] for embeddings since they're learned in a
 * mostly-positive cone). Length mismatch returns 0 — safer than throwing
 * inside the ranker hot path.
 */
export function cosineSim(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

/**
 * Incremental running-average update — mix a fresh post embedding into an
 * existing taste vector without replaying the full history. Equivalent to
 * `(prev * n + next) / (n + 1)` element-wise.
 *
 * Returns a new array; never mutates inputs.
 */
export function mixRunningAverage(
  prev: number[] | null,
  next: number[],
  prevCount: number,
): number[] {
  if (!prev || prev.length !== next.length) {
    return next.slice();
  }
  const n = prevCount + 1;
  const out = new Array<number>(prev.length);
  for (let i = 0; i < prev.length; i++) {
    out[i] = (prev[i] * prevCount + next[i]) / n;
  }
  return out;
}
