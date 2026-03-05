/**
 * QC Chat End-to-End Encryption (v6)
 *
 * Envelope encryption inspired by Signal:
 * - Each message/blob gets a random AES-256-GCM key (message key)
 * - The message key is wrapped with a dedicated wrap key (domain-separated)
 * - Content is encrypted with the message key
 * - Extended AAD binds version + chatId + senderId + epoch to prevent:
 *   · Forgery (wrong sender)
 *   · Cross-chat replay (message moved between chats)
 *   · Downgrade attacks (version included)
 *
 * Epoch-based key rotation (Signal-inspired):
 *   Each chat has an epochNonce (random 32 bytes) and epochCounter.
 *   Epoch conv key  → HKDF(material:epochNonce, salt=v6-epoch, info="epoch:chatId:counter")
 *   Epoch wrap key  → HKDF(material:epochNonce, salt=v6-wrap,  info="epoch-wrap:chatId:counter")
 *   On member removal the admin rotates the epoch: new random nonce +
 *   incremented counter. Removed members lose Firestore access and cannot
 *   read the new nonce, achieving post-removal forward secrecy.
 *
 * Key derivation:
 *   1:1 chats  → material = sort(participants).join(":") + chatId
 *   Group chats → material = chatId (stable across membership changes)
 *
 * Wire format (text):  base64( version(1) + encMsgKey(60) + iv(12) + ciphertext )
 * Wire format (blob):  version(1) + encMsgKey(60) + iv(12) + ciphertext
 *
 * v6 = epoch-rotated keys + extended AAD (with epoch counter)
 * v1–v5 deprecated and removed
 */

const SALT_V6_WRAP = new TextEncoder().encode("qc-chat-v6-wrap");
const IV_LENGTH = 12;
const VERSION_V6 = 6;
const WRAPPED_KEY_LENGTH = 48; // AES-256 key (32) + GCM auth tag (16)
const ENC_MSG_KEY_LENGTH = IV_LENGTH + WRAPPED_KEY_LENGTH; // 60 bytes
const MIN_CIPHERTEXT_LENGTH = 1 + ENC_MSG_KEY_LENGTH + IV_LENGTH + 16; // version + encMsgKey + iv + min GCM tag

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

// --- Key derivation ---

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

function buildMaterial(participantIds: string[], chatId: string, isGroup?: boolean): string {
  if (isGroup) return chatId;
  const sorted = [...participantIds].sort();
  return `${sorted.join(":")}:${chatId}`;
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
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch {
    throw new Error("Invalid base64 input");
  }
}

// --- Encryption helpers ---

function buildAAD(chatId: string, senderId: string, epochCounter: number): Uint8Array {
  return new TextEncoder().encode(`v${VERSION_V6}:${chatId}:${senderId}:${epochCounter}`);
}

async function doEncryptEnvelope(
  data: ArrayBuffer,
  aad: Uint8Array,
  wrapKey: CryptoKey,
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
  const wrappedKey = await crypto.subtle.wrapKey("raw", msgKey, wrapKey, {
    name: "AES-GCM",
    iv: wrapIv,
  });

  const encMsgKey = new Uint8Array(IV_LENGTH + wrappedKey.byteLength);
  encMsgKey.set(wrapIv, 0);
  encMsgKey.set(new Uint8Array(wrappedKey), IV_LENGTH);

  const result = new Uint8Array(1 + ENC_MSG_KEY_LENGTH + IV_LENGTH + ciphertext.byteLength);
  result[0] = VERSION_V6;
  result.set(encMsgKey, 1);
  result.set(iv, 1 + ENC_MSG_KEY_LENGTH);
  result.set(new Uint8Array(ciphertext), 1 + ENC_MSG_KEY_LENGTH + IV_LENGTH);

  return result;
}

async function doDecryptEnvelope(
  data: Uint8Array,
  aad: Uint8Array,
  wrapKey: CryptoKey,
): Promise<ArrayBuffer> {
  if (data.length < MIN_CIPHERTEXT_LENGTH) {
    throw new Error("Ciphertext too short");
  }
  if (data[0] !== VERSION_V6) {
    throw new Error("Unsupported encryption version");
  }

  const aadBuf = aad.buffer as ArrayBuffer;

  const wrapIv = data.slice(1, 1 + IV_LENGTH);
  const wrappedKey = data.slice(1 + IV_LENGTH, 1 + ENC_MSG_KEY_LENGTH);
  const iv = data.slice(1 + ENC_MSG_KEY_LENGTH, 1 + ENC_MSG_KEY_LENGTH + IV_LENGTH);
  const ciphertext = data.slice(1 + ENC_MSG_KEY_LENGTH + IV_LENGTH);

  const msgKey = await crypto.subtle.unwrapKey(
    "raw",
    wrappedKey,
    wrapKey,
    { name: "AES-GCM", iv: wrapIv },
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  return crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: aadBuf }, msgKey, ciphertext);
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
  senderId: string,
  isGroup?: boolean,
  epochNonce?: string,
  epochCounter?: number,
): Promise<string> {
  if (!epochNonce || epochCounter === undefined) {
    throw new Error("Epoch parameters required for encryption");
  }
  const material = buildMaterial(participantIds, chatId, isGroup);
  const data = new TextEncoder().encode(plaintext);
  const epochWrapKey = await deriveEpochWrapKey(material, epochNonce, chatId, epochCounter);
  const aad = buildAAD(chatId, senderId, epochCounter);
  const result = await doEncryptEnvelope(data.buffer as ArrayBuffer, aad, epochWrapKey);
  return bufferToBase64(result.buffer as ArrayBuffer);
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

  if (combined.length < MIN_CIPHERTEXT_LENGTH) {
    return "Old encrypted message";
  }
  if (combined[0] !== VERSION_V6) {
    return "Old encrypted message";
  }
  if (!senderId || !epochNonce || epochCounter === undefined) {
    return "Old encrypted message";
  }

  const materials: string[] = [buildMaterial(participantIds, chatId, isGroup)];
  if (isGroup) materials.push(buildMaterial(participantIds, chatId, false));

  for (const material of materials) {
    try {
      const epochWrapKey = await deriveEpochWrapKey(material, epochNonce, chatId, epochCounter);
      const aad = buildAAD(chatId, senderId, epochCounter);
      return new TextDecoder().decode(await doDecryptEnvelope(combined, aad, epochWrapKey));
    } catch { /* try next material */ }
  }

  return "Old encrypted message";
}

export async function encryptBlob(
  data: ArrayBuffer,
  participantIds: string[],
  chatId: string,
  senderId: string,
  isGroup?: boolean,
  epochNonce?: string,
  epochCounter?: number,
): Promise<ArrayBuffer> {
  if (!epochNonce || epochCounter === undefined) {
    throw new Error("Epoch parameters required for encryption");
  }
  const material = buildMaterial(participantIds, chatId, isGroup);
  const epochWrapKey = await deriveEpochWrapKey(material, epochNonce, chatId, epochCounter);
  const aad = buildAAD(chatId, senderId, epochCounter);
  const result = await doEncryptEnvelope(data, aad, epochWrapKey);
  return result.buffer as ArrayBuffer;
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

  if (combined.length < MIN_CIPHERTEXT_LENGTH || combined[0] !== VERSION_V6) {
    throw new Error("Unable to decrypt — unsupported encryption version");
  }
  if (!senderId || !epochNonce || epochCounter === undefined) {
    throw new Error("Unable to decrypt — missing epoch parameters");
  }

  const materials: string[] = [buildMaterial(participantIds, chatId, isGroup)];
  if (isGroup) materials.push(buildMaterial(participantIds, chatId, false));

  for (const material of materials) {
    try {
      const epochWrapKey = await deriveEpochWrapKey(material, epochNonce, chatId, epochCounter);
      const aad = buildAAD(chatId, senderId, epochCounter);
      return await doDecryptEnvelope(combined, aad, epochWrapKey);
    } catch { /* try next material */ }
  }

  throw new Error("Unable to decrypt — decryption failed");
}

export function isEncryptedMessage(text: string): boolean {
  if (!text || text.length < 40) return false;
  if (/\s/.test(text)) return false;
  if (!/^[A-Za-z0-9+/]+=*$/.test(text)) return false;
  try {
    return atob(text).length >= MIN_CIPHERTEXT_LENGTH;
  } catch {
    return false;
  }
}

