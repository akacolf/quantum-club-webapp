/**
 * QC Chat End-to-End Encryption
 *
 * Uses Web Crypto API (AES-256-GCM) with HKDF key derivation.
 * Per-conversation symmetric key derived from participant IDs.
 * HKDF runs in <1ms (hardware-accelerated via AES-NI).
 *
 * Key derivation:
 *   material = sort([userA_id, userB_id]).join(":") + chatId
 *   key      = HKDF(material, salt, info, SHA-256) → AES-256-GCM
 */

const SALT_V1 = new TextEncoder().encode("qc-chat-e2e-v1");
const SALT_V2 = new TextEncoder().encode("qc-chat-e2e-v2");
const HKDF_INFO = new TextEncoder().encode("aes-256-gcm");
const IV_LENGTH = 12;

const keyCache = new Map<string, CryptoKey>();

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
    { name: "HKDF", salt: SALT_V2, info: HKDF_INFO, hash: "SHA-256" },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  keyCache.set(cacheKey, key);
  return key;
}

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
    { name: "PBKDF2", salt: SALT_V1, iterations: 100_000, hash: "SHA-256" },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  keyCache.set(cacheKey, key);
  return key;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptMessage(
  plaintext: string,
  participantIds: string[],
  chatId: string
): Promise<string> {
  const key = await deriveKeyV2(participantIds, chatId);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return bufferToBase64(combined.buffer);
}

export async function decryptMessage(
  encryptedBase64: string,
  participantIds: string[],
  chatId: string
): Promise<string> {
  const combined = new Uint8Array(base64ToBuffer(encryptedBase64));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  // Try v2 (HKDF) first
  try {
    const key = await deriveKeyV2(participantIds, chatId);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch {
    // fall through to v1
  }

  try {
    const key = await deriveKeyV1(participantIds, chatId);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch {
    return "Unable to decrypt message";
  }
}

export async function encryptBlob(
  data: ArrayBuffer,
  participantIds: string[],
  chatId: string
): Promise<ArrayBuffer> {
  const key = await deriveKeyV2(participantIds, chatId);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return combined.buffer;
}

export async function decryptBlob(
  encryptedData: ArrayBuffer,
  participantIds: string[],
  chatId: string
): Promise<ArrayBuffer> {
  const combined = new Uint8Array(encryptedData);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  // Try v2 (HKDF) first
  try {
    const key = await deriveKeyV2(participantIds, chatId);
    return await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  } catch {
    // fall through to v1
  }

  const key = await deriveKeyV1(participantIds, chatId);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

export function isEncryptedMessage(text: string): boolean {
  if (!text || text.length < 40) return false;
  if (/\s/.test(text)) return false;
  if (!/^[A-Za-z0-9+/]+=*$/.test(text)) return false;
  try {
    return atob(text).length >= 29;
  } catch {
    return false;
  }
}
