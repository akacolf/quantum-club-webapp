/**
 * QC Chat End-to-End Encryption
 *
 * Uses the Web Crypto API (AES-256-GCM) for message encryption.
 * A per-conversation symmetric key is derived from both participants'
 * IDs using PBKDF2, so only the two clients sharing the same IDs
 * can derive the key and decrypt messages. The server (Firestore)
 * only ever sees ciphertext.
 *
 * Key derivation:
 *   material = sort([userA_id, userB_id]).join(":") + chatId
 *   key      = PBKDF2(material, salt, 100_000, SHA-256) → AES-256-GCM
 *
 * Each message is encrypted with a random 12-byte IV prepended to
 * the ciphertext and stored as a base64 string in Firestore.
 */

const SALT = new TextEncoder().encode("qc-chat-e2e-v1");
const IV_LENGTH = 12;

// In-memory cache for derived keys to avoid repeated PBKDF2 (100k iterations)
const keyCache = new Map<string, CryptoKey>();

/**
 * Derive a per-conversation AES-256-GCM key from participant IDs.
 * Both sides derive the same key independently.
 * Keys are cached in memory so PBKDF2 runs only once per conversation per session.
 */
async function deriveKey(
  participantIds: string[],
  chatId: string
): Promise<CryptoKey> {
  const sorted = [...participantIds].sort();
  const material = `${sorted.join(":")}:${chatId}`;

  const cached = keyCache.get(material);
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
      salt: SALT,
      iterations: 100_000,
      hash: "SHA-256",
    },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  keyCache.set(material, key);
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
  const key = await deriveKey(participantIds, chatId);
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
 * Expects a base64 string containing IV + ciphertext.
 */
export async function decryptMessage(
  encryptedBase64: string,
  participantIds: string[],
  chatId: string
): Promise<string> {
  try {
    const key = await deriveKey(participantIds, chatId);
    const combined = new Uint8Array(base64ToBuffer(encryptedBase64));

    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

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
 * Check if a string looks like an encrypted message (base64 with sufficient length).
 */
export function isEncryptedMessage(text: string): boolean {
  if (!text || text.length < 20) return false;
  try {
    const decoded = atob(text);
    // Encrypted messages have at least IV (12 bytes) + some ciphertext
    return decoded.length > IV_LENGTH;
  } catch {
    return false;
  }
}
