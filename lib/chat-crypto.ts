/**
 * QC Chat End-to-End Encryption (v6)
 *
 * Envelope encryption inspired by Signal:
 * - Each message/blob gets a random AES-256-GCM key (message key)
 * - The message key is wrapped with a dedicated wrap key (domain-separated)
 * - Content is encrypted with the message key
 * - Extended AAD binds version + chatId + senderId (+ epoch) to prevent:
 *   · Forgery (wrong sender)
 *   · Cross-chat replay (message moved between chats)
 *   · Downgrade attacks (version included)
 *
 * Epoch-based key rotation (v6 — Signal-inspired):
 *   Each chat has an epochNonce (random 32 bytes) and epochCounter.
 *   Epoch conv key  → HKDF(material:epochNonce, salt=v6-epoch, info="epoch:chatId:counter")
 *   Epoch wrap key  → HKDF(material:epochNonce, salt=v6-wrap,  info="epoch-wrap:chatId:counter")
 *   On member removal the admin rotates the epoch: new random nonce +
 *   incremented counter. Removed members lose Firestore access and cannot
 *   read the new nonce, achieving post-removal forward secrecy.
 *
 * Domain separation (v5):
 *   Conversation root key → HKDF(material, salt=v2, info="aes-256-gcm")
 *   Wrap sub-key          → HKDF(material, salt=v5-wrap, info="key-wrap")
 *
 * Key derivation:
 *   1:1 chats  → material = sort(participants).join(":") + chatId
 *   Group chats → material = chatId (stable across membership changes)
 *
 * Wire format (text):  base64( version(1) + encMsgKey(60) + iv(12) + ciphertext )
 * Wire format (blob):  version(1) + encMsgKey(60) + iv(12) + ciphertext
 *
 * v6 = epoch-rotated keys + extended AAD (with epoch counter)
 * v5 = envelope + extended AAD + domain-separated wrap key
 * v4 = envelope + extended AAD (version:chatId:senderId)
 * v3 = envelope + sender AAD only
 * v2 = HKDF conversation key (no envelope)
 * v1 = PBKDF2 conversation key (legacy)
 */

const SALT_V1 = new TextEncoder().encode("qc-chat-e2e-v1");
const SALT_V2 = new TextEncoder().encode("qc-chat-e2e-v2");
const HKDF_INFO = new TextEncoder().encode("aes-256-gcm");
const SALT_V5_WRAP = new TextEncoder().encode("qc-chat-v5-wrap");
const HKDF_WRAP_INFO = new TextEncoder().encode("key-wrap");
const SALT_V6_EPOCH = new TextEncoder().encode("qc-chat-v6-epoch");
const SALT_V6_WRAP = new TextEncoder().encode("qc-chat-v6-wrap");
const IV_LENGTH = 12;
const VERSION_V6 = 6;
const VERSION_V5 = 5;
const VERSION_V4 = 4;
const VERSION_V3 = 3;
const WRAPPED_KEY_LENGTH = 48; // AES-256 key (32) + GCM auth tag (16)
// encrypted message key = wrapIv(12) + wrappedKey(48) = 60 bytes
const ENC_MSG_KEY_LENGTH = IV_LENGTH + WRAPPED_KEY_LENGTH;

const keyCache = new Map<string, CryptoKey>();

/** Clear all cached keys — call on tab hide or session end for forward secrecy. */
export function clearKeyCache(): void {
  keyCache.clear();
}

// Auto-evict keys when the tab becomes hidden (Signal-inspired key erasure)
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      clearKeyCache();
    }
  });
}

// --- v6 epoch key derivation ---

async function deriveEpochKey(
  material: string,
  epochNonce: string,
  chatId: string,
  epochCounter: number,
): Promise<CryptoKey> {
  const epochMaterial = `${material}:${epochNonce}`;
  const info = new TextEncoder().encode(`epoch:${chatId}:${epochCounter}`);
  const cacheKey = `v6epoch:${epochMaterial}:${epochCounter}`;
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;

  const rawKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(epochMaterial), "HKDF", false, ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "HKDF", salt: SALT_V6_EPOCH, info, hash: "SHA-256" },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  keyCache.set(cacheKey, key);
  return key;
}

async function deriveEpochWrapKey(
  material: string,
  epochNonce: string,
  chatId: string,
  epochCounter: number,
): Promise<CryptoKey> {
  const epochMaterial = `${material}:${epochNonce}`;
  const info = new TextEncoder().encode(`epoch-wrap:${chatId}:${epochCounter}`);
  const cacheKey = `v6wrap:${epochMaterial}:${epochCounter}`;
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;

  const rawKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(epochMaterial), "HKDF", false, ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "HKDF", salt: SALT_V6_WRAP, info, hash: "SHA-256" },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
  keyCache.set(cacheKey, key);
  return key;
}

// --- v5 wrap key derivation ---

async function deriveWrapKey(material: string): Promise<CryptoKey> {
  const cacheKey = `v5wrap:${material}`;
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
    { name: "HKDF", salt: SALT_V5_WRAP, info: HKDF_WRAP_INFO, hash: "SHA-256" },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );

  keyCache.set(cacheKey, key);
  return key;
}

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

function buildAAD(version: number, chatId: string, senderId: string, epochCounter?: number): Uint8Array {
  if (epochCounter !== undefined) {
    return new TextEncoder().encode(`v${version}:${chatId}:${senderId}:${epochCounter}`);
  }
  return new TextEncoder().encode(`v${version}:${chatId}:${senderId}`);
}

async function doEncryptEnvelope(
  data: ArrayBuffer,
  convKey: CryptoKey,
  aad: Uint8Array,
  version: number,
  wrapKey?: CryptoKey,
): Promise<Uint8Array> {
  const aadBuf = aad.buffer as ArrayBuffer;

  const msgKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aadBuf },
    msgKey,
    data
  );

  const wrapIv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const wrappedKey = await crypto.subtle.wrapKey("raw", msgKey, wrapKey || convKey, {
    name: "AES-GCM",
    iv: wrapIv,
  });

  const encMsgKey = new Uint8Array(IV_LENGTH + wrappedKey.byteLength);
  encMsgKey.set(wrapIv, 0);
  encMsgKey.set(new Uint8Array(wrappedKey), IV_LENGTH);

  const result = new Uint8Array(1 + ENC_MSG_KEY_LENGTH + IV_LENGTH + ciphertext.byteLength);
  result[0] = version;
  result.set(encMsgKey, 1);
  result.set(iv, 1 + ENC_MSG_KEY_LENGTH);
  result.set(new Uint8Array(ciphertext), 1 + ENC_MSG_KEY_LENGTH + IV_LENGTH);

  return result;
}

async function doDecryptEnvelope(
  data: Uint8Array,
  convKey: CryptoKey,
  aad: Uint8Array,
  wrapKey?: CryptoKey,
): Promise<ArrayBuffer> {
  const aadBuf = aad.buffer as ArrayBuffer;

  const wrapIv = data.slice(1, 1 + IV_LENGTH);
  const wrappedKey = data.slice(1 + IV_LENGTH, 1 + ENC_MSG_KEY_LENGTH);
  const iv = data.slice(1 + ENC_MSG_KEY_LENGTH, 1 + ENC_MSG_KEY_LENGTH + IV_LENGTH);
  const ciphertext = data.slice(1 + ENC_MSG_KEY_LENGTH + IV_LENGTH);

  const msgKey = await crypto.subtle.unwrapKey(
    "raw",
    wrappedKey,
    wrapKey || convKey,
    { name: "AES-GCM", iv: wrapIv },
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  return crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: aadBuf }, msgKey, ciphertext);
}

async function doDecryptGCM(data: Uint8Array, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

// === Public API ===

/** Generate a random 32-byte epoch nonce (base64-encoded). */
export function generateEpochNonce(): string {
  return bufferToBase64(crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer);
}

export async function encryptMessage(
  plaintext: string,
  participantIds: string[],
  chatId: string,
  senderId?: string,
  isGroup?: boolean,
  epochNonce?: string,
  epochCounter?: number,
): Promise<string> {
  const material = buildMaterial(participantIds, chatId, isGroup);
  const data = new TextEncoder().encode(plaintext);

  // v6: epoch-rotated keys (best — post-removal forward secrecy)
  if (senderId && epochNonce !== undefined && epochCounter !== undefined) {
    const epochConvKey = await deriveEpochKey(material, epochNonce, chatId, epochCounter);
    const epochWrapKey = await deriveEpochWrapKey(material, epochNonce, chatId, epochCounter);
    const aad = buildAAD(VERSION_V6, chatId, senderId, epochCounter);
    const result = await doEncryptEnvelope(data.buffer as ArrayBuffer, epochConvKey, aad, VERSION_V6, epochWrapKey);
    return bufferToBase64(result.buffer as ArrayBuffer);
  }

  // v5: domain-separated wrap key
  if (senderId) {
    const convKey = await deriveHKDF(material, "v2");
    const wrapKey = await deriveWrapKey(material);
    const aad = buildAAD(VERSION_V5, chatId, senderId);
    const result = await doEncryptEnvelope(data.buffer as ArrayBuffer, convKey, aad, VERSION_V5, wrapKey);
    return bufferToBase64(result.buffer as ArrayBuffer);
  }

  // v2: legacy HKDF (no envelope)
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
  epochNonce?: string,
  epochCounter?: number,
): Promise<string> {
  const combined = new Uint8Array(base64ToBuffer(encryptedBase64));

  // Build material variants to try
  const materials: string[] = [buildMaterial(participantIds, chatId, isGroup)];
  // For groups, also try participant-based key (old messages before group fix)
  if (isGroup) materials.push(buildMaterial(participantIds, chatId, false));

  for (const material of materials) {
    // Try v6 epoch envelope
    if (combined[0] === VERSION_V6 && senderId && epochNonce !== undefined && epochCounter !== undefined) {
      try {
        const epochConvKey = await deriveEpochKey(material, epochNonce, chatId, epochCounter);
        const epochWrapKey = await deriveEpochWrapKey(material, epochNonce, chatId, epochCounter);
        const aad = buildAAD(VERSION_V6, chatId, senderId, epochCounter);
        return new TextDecoder().decode(await doDecryptEnvelope(combined, epochConvKey, aad, epochWrapKey));
      } catch { /* next */ }
    }

    const convKey = await deriveHKDF(material, "v2");

    // Try v5 envelope (domain-separated wrap key + extended AAD)
    if (combined[0] === VERSION_V5 && senderId) {
      try {
        const wrapKey = await deriveWrapKey(material);
        const aad = buildAAD(VERSION_V5, chatId, senderId);
        return new TextDecoder().decode(await doDecryptEnvelope(combined, convKey, aad, wrapKey));
      } catch { /* next */ }
    }

    // Try v4 envelope (extended AAD: version:chatId:senderId)
    if (combined[0] === VERSION_V4 && senderId) {
      try {
        const aad = buildAAD(VERSION_V4, chatId, senderId);
        return new TextDecoder().decode(await doDecryptEnvelope(combined, convKey, aad));
      } catch { /* next */ }
    }

    // Try v3 envelope (sender-only AAD)
    if (combined[0] === VERSION_V3 && senderId) {
      try {
        const aad = new TextEncoder().encode(senderId);
        return new TextDecoder().decode(await doDecryptEnvelope(combined, convKey, aad));
      } catch { /* next */ }
    }

    // Try v2 HKDF (no envelope)
    try {
      return new TextDecoder().decode(await doDecryptGCM(combined, convKey));
    } catch { /* next */ }

    // Try v1 PBKDF2
    try {
      const key = await derivePBKDF2(material);
      return new TextDecoder().decode(await doDecryptGCM(combined, key));
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
  epochNonce?: string,
  epochCounter?: number,
): Promise<ArrayBuffer> {
  const material = buildMaterial(participantIds, chatId, isGroup);

  // v6: epoch-rotated keys
  if (senderId && epochNonce !== undefined && epochCounter !== undefined) {
    const epochConvKey = await deriveEpochKey(material, epochNonce, chatId, epochCounter);
    const epochWrapKey = await deriveEpochWrapKey(material, epochNonce, chatId, epochCounter);
    const aad = buildAAD(VERSION_V6, chatId, senderId, epochCounter);
    const result = await doEncryptEnvelope(data, epochConvKey, aad, VERSION_V6, epochWrapKey);
    return result.buffer as ArrayBuffer;
  }

  // v5: domain-separated wrap key
  if (senderId) {
    const convKey = await deriveHKDF(material, "v2");
    const wrapKey = await deriveWrapKey(material);
    const aad = buildAAD(VERSION_V5, chatId, senderId);
    const result = await doEncryptEnvelope(data, convKey, aad, VERSION_V5, wrapKey);
    return result.buffer as ArrayBuffer;
  }

  // v2: legacy HKDF
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
  epochNonce?: string,
  epochCounter?: number,
): Promise<ArrayBuffer> {
  const combined = new Uint8Array(encryptedData);

  const materials: string[] = [buildMaterial(participantIds, chatId, isGroup)];
  if (isGroup) materials.push(buildMaterial(participantIds, chatId, false));

  for (const material of materials) {
    // v6 epoch envelope
    if (combined[0] === VERSION_V6 && senderId && epochNonce !== undefined && epochCounter !== undefined) {
      try {
        const epochConvKey = await deriveEpochKey(material, epochNonce, chatId, epochCounter);
        const epochWrapKey = await deriveEpochWrapKey(material, epochNonce, chatId, epochCounter);
        const aad = buildAAD(VERSION_V6, chatId, senderId, epochCounter);
        return await doDecryptEnvelope(combined, epochConvKey, aad, epochWrapKey);
      } catch { /* next */ }
    }

    const convKey = await deriveHKDF(material, "v2");

    // v5 envelope (domain-separated wrap key + extended AAD)
    if (combined[0] === VERSION_V5 && senderId) {
      try {
        const wrapKey = await deriveWrapKey(material);
        const aad = buildAAD(VERSION_V5, chatId, senderId);
        return await doDecryptEnvelope(combined, convKey, aad, wrapKey);
      } catch { /* next */ }
    }

    // v4 envelope (extended AAD)
    if (combined[0] === VERSION_V4 && senderId) {
      try {
        const aad = buildAAD(VERSION_V4, chatId, senderId);
        return await doDecryptEnvelope(combined, convKey, aad);
      } catch { /* next */ }
    }

    // v3 envelope (sender-only AAD)
    if (combined[0] === VERSION_V3 && senderId) {
      try {
        const aad = new TextEncoder().encode(senderId);
        return await doDecryptEnvelope(combined, convKey, aad);
      } catch { /* next */ }
    }

    // v2 HKDF (no envelope)
    try {
      return await doDecryptGCM(combined, convKey);
    } catch { /* next */ }

    // v1 PBKDF2
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

/**
 * Derive a conversation safety number (Signal-style key fingerprint).
 * Both sides derive the same 40-hex string that can be compared out-of-band.
 */
export async function deriveConversationFingerprint(
  participantIds: string[],
  chatId: string,
  isGroup?: boolean,
): Promise<string> {
  const material = buildMaterial(participantIds, chatId, isGroup);
  const rawKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(material), "HKDF", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      salt: new TextEncoder().encode("safety-number"),
      info: new TextEncoder().encode(chatId),
      hash: "SHA-256",
    },
    rawKey,
    160, // 20 bytes = 40 hex chars
  );
  const hex = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Format as 5 groups of 8 hex chars
  return hex.match(/.{8}/g)!.join(" ").toUpperCase();
}
