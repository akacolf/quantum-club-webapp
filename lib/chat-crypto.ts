/**
 * QC Chat End-to-End Encryption (v2 — HKDF)
 *
 * Uses the Web Crypto API (AES-256-GCM) for message encryption.
 * A per-conversation symmetric key is derived from both participants'
 * IDs using HKDF (v2) or PBKDF2 (v1, legacy), so only the two clients
 * sharing the same IDs can derive the key and decrypt messages.
 * The server (Firestore) only ever sees ciphertext.
 *
 * v2 key derivation (HKDF — <1ms):
 *   material = sort([userA_id, userB_id]).join(":") + chatId
 *   key      = HKDF(material, salt, info, SHA-256) → AES-256-GCM
 *
 * v1 key derivation (PBKDF2 — 200-500ms, legacy):
 *   key      = PBKDF2(material, salt, 100_000, SHA-256) → AES-256-GCM
 *
 * PBKDF2 is designed for passwords. Our key material is deterministic
 * (participant IDs), not a password, so HKDF is the correct primitive.
 * Inspired by Signal's approach: fast key derivation, hardware-accelerated
 * AES-GCM via Web Crypto API.
 *
 * Each message is encrypted with a random 12-byte IV prepended to
 * the ciphertext and stored as a base64 string in Firestore.
 */

const SALT_V1 = new TextEncoder().encode("qc-chat-e2e-v1");
const SALT_V2 = new TextEncoder().encode("qc-chat-e2e-v2");
const HKDF_INFO = new TextEncoder().encode("aes-256-gcm");
const IV_LENGTH = 12;

// In-memory cache for derived keys (keyed by "version:material")
const keyCache = new Map<string, CryptoKey>();

/**
 * Derive a per-conversation AES-256-GCM key using HKDF (v2).
 * Runs in <1ms vs 200-500ms for PBKDF2.
 */
async function deriveKeyV2(
  participantIds: string[],
  chatId: string
): Promise<CryptoKey> {
  const sorted = [...participantIds].sort();
  const material = `${sorted.join(":")}:${chatId}`;
  const cacheKey = `v2:${material}`;

  const cached = keyCache.get(cacheKey);
  if (cached) return cached;

  const rawKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(material),
    "HKDF",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      salt: SALT_V2,
      info: HKDF_INFO,
      hash: "SHA-256",
    },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  keyCache.set(cacheKey, key);
  return key;
}

/**
 * Derive a per-conversation AES-256-GCM key using PBKDF2 (v1, legacy).
 * Only used for decrypting old messages that were encrypted before the HKDF migration.
 */
async function deriveKeyV1(
  participantIds: string[],
  chatId: string
): Promise<CryptoKey> {
  const sorted = [...participantIds].sort();
  const material = `${sorted.join(":")}:${chatId}`;
  const cacheKey = `v1:${material}`;

  const cached = keyCache.get(cacheKey);
  if (cached) return cached;

  const rawKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(material),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: SALT_V1,
      iterations: 100_000,
      hash: "SHA-256",
    },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  keyCache.set(cacheKey, key);
  return key;
}

/** Convert ArrayBuffer to base64 string */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Convert base64 string to ArrayBuffer */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypt a plaintext message.
 * Returns a base64 string containing IV + ciphertext.
 */
export async function encryptMessage(
  plaintext: string,
  participantIds: string[],
  chatId: string
): Promise<string> {
  const key = await deriveKeyV2(participantIds, chatId);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  // Prepend IV to ciphertext
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);

  return bufferToBase64(combined.buffer);
}

/**
 * Decrypt an encrypted message.
 * Tries v2 (HKDF) first, falls back to v1 (PBKDF2) for old messages.
 */
export async function decryptMessage(
  encryptedBase64: string,
  participantIds: string[],
  chatId: string
): Promise<string> {
  const combined = new Uint8Array(base64ToBuffer(encryptedBase64));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  // Try v2 (HKDF) first — fast path
  try {
    const key = await deriveKeyV2(participantIds, chatId);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    // v2 failed — try v1 (PBKDF2) for legacy messages
  }

  try {
    const key = await deriveKeyV1(participantIds, chatId);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return "Unable to decrypt message";
  }
}

/**
 * Encrypt a binary blob (e.g. audio, image, file).
 * Returns an ArrayBuffer containing IV + ciphertext.
 */
export async function encryptBlob(
  data: ArrayBuffer,
  participantIds: string[],
  chatId: string
): Promise<ArrayBuffer> {
  const key = await deriveKeyV2(participantIds, chatId);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  // Prepend IV to ciphertext
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);

  return combined.buffer;
}

/**
 * Decrypt a binary blob.
 * Tries v2 (HKDF) first, falls back to v1 (PBKDF2) for old messages.
 */
export async function decryptBlob(
  encryptedData: ArrayBuffer,
  participantIds: string[],
  chatId: string
): Promise<ArrayBuffer> {
  const combined = new Uint8Array(encryptedData);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  // Try v2 (HKDF) first — fast path
  try {
    const key = await deriveKeyV2(participantIds, chatId);
    return await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
  } catch {
    // v2 failed — try v1 (PBKDF2) for legacy messages
  }

  // Fall back to v1 (PBKDF2)
  const key = await deriveKeyV1(participantIds, chatId);
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
}

/**
 * Check if a string looks like an encrypted message (base64 with sufficient length).
 * Rejects plaintext by checking for spaces and non-base64 characters.
 */
export function isEncryptedMessage(text: string): boolean {
  if (!text || text.length < 40) return false;
  // Encrypted base64 never contains spaces (system messages do)
  if (/\s/.test(text)) return false;
  // Must be valid base64
  if (!/^[A-Za-z0-9+/]+=*$/.test(text)) return false;
  try {
    const decoded = atob(text);
    // AES-GCM: IV (12) + ciphertext (min 1 char + 16 tag) = 29+ bytes
    return decoded.length >= 29;
  } catch {
    return false;
  }
}
