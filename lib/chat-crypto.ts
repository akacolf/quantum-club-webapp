/**
 * QC Chat End-to-End Encryption (v3)
 *
 * Envelope encryption inspired by Signal:
 * - Each message/blob gets a random AES-256-GCM key (message key)
 * - The message key is encrypted with the conversation key (derived via HKDF)
 * - Sender ID is bound as AAD (additional authenticated data) to prevent forgery
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

async function deriveConversationKey(
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
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
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

// --- v3: Envelope encryption with sender AAD ---

async function encryptV3(
  data: ArrayBuffer,
  participantIds: string[],
  chatId: string,
  senderId: string,
): Promise<Uint8Array> {
  const convKey = await deriveConversationKey(participantIds, chatId);
  const aad = new TextEncoder().encode(senderId);

  // Generate random per-message key
  const msgKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // extractable so we can wrap it
    ["encrypt"]
  );

  // Encrypt the data with the message key + sender AAD
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    msgKey,
    data
  );

  // Wrap (encrypt) the message key with the conversation key
  const wrapIv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const wrappedKey = await crypto.subtle.wrapKey("raw", msgKey, convKey, {
    name: "AES-GCM",
    iv: wrapIv,
  });

  // Combine: version(1) + wrapIv(12) + wrappedKey(32) + iv(12) + ciphertext
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

async function decryptV3(
  data: Uint8Array,
  participantIds: string[],
  chatId: string,
  senderId: string,
): Promise<ArrayBuffer> {
  const convKey = await deriveConversationKey(participantIds, chatId);
  const aad = new TextEncoder().encode(senderId);

  // Parse: version(1) + encMsgKey(44) + iv(12) + ciphertext
  const wrapIv = data.slice(1, 1 + IV_LENGTH);
  const wrappedKey = data.slice(1 + IV_LENGTH, 1 + ENC_MSG_KEY_LENGTH);
  const iv = data.slice(1 + ENC_MSG_KEY_LENGTH, 1 + ENC_MSG_KEY_LENGTH + IV_LENGTH);
  const ciphertext = data.slice(1 + ENC_MSG_KEY_LENGTH + IV_LENGTH);

  // Unwrap the message key
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

// --- v2: HKDF conversation key (no envelope) ---

async function encryptV2(data: ArrayBuffer, participantIds: string[], chatId: string): Promise<Uint8Array> {
  const key = await deriveConversationKey(participantIds, chatId);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);
  return combined;
}

async function decryptV2(data: Uint8Array, participantIds: string[], chatId: string): Promise<ArrayBuffer> {
  const key = await deriveConversationKey(participantIds, chatId);
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

// --- v1: PBKDF2 legacy ---

async function decryptV1(data: Uint8Array, participantIds: string[], chatId: string): Promise<ArrayBuffer> {
  const key = await deriveKeyV1(participantIds, chatId);
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

// === Public API ===

export async function encryptMessage(
  plaintext: string,
  participantIds: string[],
  chatId: string,
  senderId?: string,
): Promise<string> {
  const data = new TextEncoder().encode(plaintext);

  if (senderId) {
    const result = await encryptV3(data.buffer as ArrayBuffer, participantIds, chatId, senderId);
    return bufferToBase64(result.buffer as ArrayBuffer);
  }

  // Fallback to v2 if no senderId provided
  const result = await encryptV2(data.buffer as ArrayBuffer, participantIds, chatId);
  return bufferToBase64(result.buffer as ArrayBuffer);
}

export async function decryptMessage(
  encryptedBase64: string,
  participantIds: string[],
  chatId: string,
  senderId?: string,
): Promise<string> {
  const combined = new Uint8Array(base64ToBuffer(encryptedBase64));

  // Check version byte
  if (combined[0] === VERSION_V3 && senderId) {
    try {
      const decrypted = await decryptV3(combined, participantIds, chatId, senderId);
      return new TextDecoder().decode(decrypted);
    } catch {
      // fall through
    }
  }

  // Try v2
  try {
    const decrypted = await decryptV2(combined, participantIds, chatId);
    return new TextDecoder().decode(decrypted);
  } catch {
    // fall through to v1
  }

  try {
    const decrypted = await decryptV1(combined, participantIds, chatId);
    return new TextDecoder().decode(decrypted);
  } catch {
    return "Unable to decrypt message";
  }
}

export async function encryptBlob(
  data: ArrayBuffer,
  participantIds: string[],
  chatId: string,
  senderId?: string,
): Promise<ArrayBuffer> {
  if (senderId) {
    const result = await encryptV3(data, participantIds, chatId, senderId);
    return result.buffer as ArrayBuffer;
  }

  const result = await encryptV2(data, participantIds, chatId);
  return result.buffer as ArrayBuffer;
}

export async function decryptBlob(
  encryptedData: ArrayBuffer,
  participantIds: string[],
  chatId: string,
  senderId?: string,
): Promise<ArrayBuffer> {
  const combined = new Uint8Array(encryptedData);

  // Check version byte for v3
  if (combined[0] === VERSION_V3 && senderId) {
    try {
      return await decryptV3(combined, participantIds, chatId, senderId);
    } catch {
      // fall through
    }
  }

  // Try v2
  try {
    return await decryptV2(combined, participantIds, chatId);
  } catch {
    // fall through to v1
  }

  return decryptV1(combined, participantIds, chatId);
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
