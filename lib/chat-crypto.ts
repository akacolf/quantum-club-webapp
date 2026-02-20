/**
 * QC Chat End-to-End Encryption (v3)
 *
 * Envelope encryption inspired by Signal:
 * - Each message/blob gets a random AES-256-GCM key (message key)
 * - The message key is encrypted with the conversation key (derived via HKDF)
 * - Sender ID is bound as AAD (additional authenticated data) to prevent forgery
 *
 * Key derivation:
 *   1:1 chats  → material = sort(participants).join(":") + chatId
 *   Group chats → material = chatId (stable across membership changes)
 *
 * Wire format (text):  base64( version(1) + encMsgKey(60) + iv(12) + ciphertext )
 * Wire format (blob):  version(1) + encMsgKey(60) + iv(12) + ciphertext
 *
 * v3 = envelope + sender AAD
 * v2 = HKDF conversation key (no envelope)
 * v1 = PBKDF2 conversation key (legacy)
 */

const SALT_V1 = new TextEncoder().encode("qc-chat-e2e-v1");
const SALT_V2 = new TextEncoder().encode("qc-chat-e2e-v2");
const HKDF_INFO = new TextEncoder().encode("aes-256-gcm");
const IV_LENGTH = 12;
const VERSION_V3 = 3;
const WRAPPED_KEY_LENGTH = 48; // AES-256 key (32) + GCM auth tag (16)
// encrypted message key = wrapIv(12) + wrappedKey(48) = 60 bytes
const ENC_MSG_KEY_LENGTH = IV_LENGTH + WRAPPED_KEY_LENGTH;

const keyCache = new Map<string, CryptoKey>();

function buildMaterial(participantIds: string[], chatId: string, isGroup?: boolean): string {
  if (isGroup) return chatId;
  const sorted = [...participantIds].sort();
  return `${sorted.join(":")}:${chatId}`;
}

async function deriveHKDF(material: string, cachePrefix: string): Promise<CryptoKey> {
  const cacheKey = `${cachePrefix}:${material}`;
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
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );

  keyCache.set(cacheKey, key);
  return key;
}

async function derivePBKDF2(material: string): Promise<CryptoKey> {
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

// --- Encryption helpers ---

async function doEncryptV3(
  data: ArrayBuffer,
  convKey: CryptoKey,
  senderId: string,
): Promise<Uint8Array> {
  const aad = new TextEncoder().encode(senderId);

  const msgKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    msgKey,
    data
  );

  const wrapIv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const wrappedKey = await crypto.subtle.wrapKey("raw", msgKey, convKey, {
    name: "AES-GCM",
    iv: wrapIv,
  });

  const encMsgKey = new Uint8Array(IV_LENGTH + wrappedKey.byteLength);
  encMsgKey.set(wrapIv, 0);
  encMsgKey.set(new Uint8Array(wrappedKey), IV_LENGTH);

  const result = new Uint8Array(1 + ENC_MSG_KEY_LENGTH + IV_LENGTH + ciphertext.byteLength);
  result[0] = VERSION_V3;
  result.set(encMsgKey, 1);
  result.set(iv, 1 + ENC_MSG_KEY_LENGTH);
  result.set(new Uint8Array(ciphertext), 1 + ENC_MSG_KEY_LENGTH + IV_LENGTH);

  return result;
}

async function doDecryptV3(
  data: Uint8Array,
  convKey: CryptoKey,
  senderId: string,
): Promise<ArrayBuffer> {
  const aad = new TextEncoder().encode(senderId);

  const wrapIv = data.slice(1, 1 + IV_LENGTH);
  const wrappedKey = data.slice(1 + IV_LENGTH, 1 + ENC_MSG_KEY_LENGTH);
  const iv = data.slice(1 + ENC_MSG_KEY_LENGTH, 1 + ENC_MSG_KEY_LENGTH + IV_LENGTH);
  const ciphertext = data.slice(1 + ENC_MSG_KEY_LENGTH + IV_LENGTH);

  const msgKey = await crypto.subtle.unwrapKey(
    "raw",
    wrappedKey,
    convKey,
    { name: "AES-GCM", iv: wrapIv },
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  return crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad }, msgKey, ciphertext);
}

async function doDecryptGCM(data: Uint8Array, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

// === Public API ===

interface CryptoOpts {
  participantIds: string[];
  chatId: string;
  senderId?: string;
  isGroup?: boolean;
}

export async function encryptMessage(
  plaintext: string,
  participantIds: string[],
  chatId: string,
  senderId?: string,
  isGroup?: boolean,
): Promise<string> {
  const material = buildMaterial(participantIds, chatId, isGroup);
  const data = new TextEncoder().encode(plaintext);

  if (senderId) {
    const convKey = await deriveHKDF(material, "v2");
    const result = await doEncryptV3(data.buffer as ArrayBuffer, convKey, senderId);
    return bufferToBase64(result.buffer as ArrayBuffer);
  }

  const key = await deriveHKDF(material, "v2");
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return bufferToBase64(combined.buffer as ArrayBuffer);
}

export async function decryptMessage(
  encryptedBase64: string,
  participantIds: string[],
  chatId: string,
  senderId?: string,
  isGroup?: boolean,
): Promise<string> {
  const combined = new Uint8Array(base64ToBuffer(encryptedBase64));

  // Build material variants to try
  const materials: string[] = [buildMaterial(participantIds, chatId, isGroup)];
  // For groups, also try participant-based key (old messages before this fix)
  if (isGroup) materials.push(buildMaterial(participantIds, chatId, false));

  for (const material of materials) {
    // Try v3 envelope
    if (combined[0] === VERSION_V3 && senderId) {
      try {
        const convKey = await deriveHKDF(material, "v2");
        const decrypted = await doDecryptV3(combined, convKey, senderId);
        return new TextDecoder().decode(decrypted);
      } catch { /* next */ }
    }

    // Try v2 HKDF
    try {
      const key = await deriveHKDF(material, "v2");
      const decrypted = await doDecryptGCM(combined, key);
      return new TextDecoder().decode(decrypted);
    } catch { /* next */ }

    // Try v1 PBKDF2
    try {
      const key = await derivePBKDF2(material);
      const decrypted = await doDecryptGCM(combined, key);
      return new TextDecoder().decode(decrypted);
    } catch { /* next */ }
  }

  return "Unable to decrypt message";
}

export async function encryptBlob(
  data: ArrayBuffer,
  participantIds: string[],
  chatId: string,
  senderId?: string,
  isGroup?: boolean,
): Promise<ArrayBuffer> {
  const material = buildMaterial(participantIds, chatId, isGroup);

  if (senderId) {
    const convKey = await deriveHKDF(material, "v2");
    const result = await doEncryptV3(data, convKey, senderId);
    return result.buffer as ArrayBuffer;
  }

  const key = await deriveHKDF(material, "v2");
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return combined.buffer as ArrayBuffer;
}

export async function decryptBlob(
  encryptedData: ArrayBuffer,
  participantIds: string[],
  chatId: string,
  senderId?: string,
  isGroup?: boolean,
): Promise<ArrayBuffer> {
  const combined = new Uint8Array(encryptedData);

  const materials: string[] = [buildMaterial(participantIds, chatId, isGroup)];
  if (isGroup) materials.push(buildMaterial(participantIds, chatId, false));

  for (const material of materials) {
    if (combined[0] === VERSION_V3 && senderId) {
      try {
        const convKey = await deriveHKDF(material, "v2");
        return await doDecryptV3(combined, convKey, senderId);
      } catch { /* next */ }
    }

    try {
      const key = await deriveHKDF(material, "v2");
      return await doDecryptGCM(combined, key);
    } catch { /* next */ }

    try {
      const key = await derivePBKDF2(material);
      return await doDecryptGCM(combined, key);
    } catch { /* next */ }
  }

  throw new Error("Unable to decrypt blob");
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
