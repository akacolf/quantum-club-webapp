/**
 * Secure Mnemonic Storage
 *
 * Encrypts wallet mnemonics using AES-256-GCM with a non-extractable
 * CryptoKey stored in IndexedDB. This prevents direct exfiltration via
 * localStorage enumeration — an attacker must call the decrypt function
 * (which requires the CryptoKey from IndexedDB).
 *
 * The key is marked `extractable: false`, so even with IndexedDB access
 * the raw key bytes cannot be exported to a remote server.
 */

const DB_NAME = "qc_wallet_keystore";
const LEGACY_DB_NAME = "quantum_wallet_keystore";
const STORE_NAME = "keys";
const KEY_ID = "mnemonic_encryption_key";
const ENCRYPTED_PREFIX = "enc:";
const LEGACY_MNEMONIC_PREFIX = "quantum_wallet_mnemonic_";
const MNEMONIC_PREFIX = "qc_wallet_mnemonic_";

// In-memory cache to avoid repeated IndexedDB + decrypt round-trips
const memoryCache = new Map<string, string>();

function openDB(name: string): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(name, 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function openKeyStore(): Promise<IDBDatabase> {
    return openDB(DB_NAME);
}

function idbGet(db: IDBDatabase, key: string): Promise<CryptoKey | undefined> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function idbPut(db: IDBDatabase, key: string, value: CryptoKey): Promise<void> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const req = tx.objectStore(STORE_NAME).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

let cachedKey: CryptoKey | null = null;
let dbMigrated = false;

async function migrateKeyStoreIfNeeded(): Promise<void> {
    if (dbMigrated) return;
    dbMigrated = true;

    try {
        const newDb = await openDB(DB_NAME);
        const existingNew = await idbGet(newDb, KEY_ID);
        newDb.close();
        if (existingNew) return; // Already migrated

        const legacyDb = await openDB(LEGACY_DB_NAME);
        const legacyKey = await idbGet(legacyDb, KEY_ID);
        legacyDb.close();
        if (!legacyKey) return; // No legacy data

        // Copy key to new DB
        const destDb = await openDB(DB_NAME);
        await idbPut(destDb, KEY_ID, legacyKey);
        destDb.close();

        // Delete legacy DB
        indexedDB.deleteDatabase(LEGACY_DB_NAME);
    } catch {
        // Migration failed — will create fresh key if needed
    }
}

async function getOrCreateKey(): Promise<CryptoKey> {
    if (cachedKey) return cachedKey;

    await migrateKeyStoreIfNeeded();

    const db = await openKeyStore();
    try {
        const existing = await idbGet(db, KEY_ID);
        if (existing) {
            cachedKey = existing;
            return existing;
        }

        const key = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            false, // non-extractable — key material cannot be exported
            ["encrypt", "decrypt"],
        );

        await idbPut(db, KEY_ID, key);
        cachedKey = key;
        return key;
    } finally {
        db.close();
    }
}

function migrateMnemonicKey(telegramId: string): void {
    const legacyKey = `${LEGACY_MNEMONIC_PREFIX}${telegramId}`;
    const newKey = `${MNEMONIC_PREFIX}${telegramId}`;
    if (localStorage.getItem(newKey)) return;
    const legacy = localStorage.getItem(legacyKey);
    if (legacy) {
        localStorage.setItem(newKey, legacy);
        localStorage.removeItem(legacyKey);
    }
}

/**
 * Store an encrypted mnemonic in localStorage.
 * Format: `enc:<base64(iv[12] + ciphertext)>`
 */
export async function setSecureMnemonic(telegramId: string | null, mnemonic: string): Promise<void> {
    if (!telegramId) return;
    const storageKey = `${MNEMONIC_PREFIX}${telegramId}`;

    try {
        const key = await getOrCreateKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(mnemonic);

        const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
        const ctBytes = new Uint8Array(ciphertext);

        const combined = new Uint8Array(iv.length + ctBytes.length);
        combined.set(iv);
        combined.set(ctBytes, iv.length);

        localStorage.setItem(storageKey, ENCRYPTED_PREFIX + btoa(String.fromCharCode(...combined)));
        memoryCache.set(storageKey, mnemonic);
    } catch (error) {
        // Never silently downgrade to plaintext — a plaintext seed in localStorage
        // is worse than a failed save. Surface the failure so the caller can retry.
        console.error("Secure mnemonic storage failed:", error);
        throw new Error("Unable to securely store your recovery phrase on this device.");
    }
}

/**
 * Read and decrypt a mnemonic from localStorage.
 * Auto-migrates plaintext values to encrypted on first access.
 */
export async function getSecureMnemonic(telegramId: string | null): Promise<string | null> {
    if (!telegramId) return null;
    migrateMnemonicKey(telegramId);
    const storageKey = `${MNEMONIC_PREFIX}${telegramId}`;

    // Check memory cache first
    const cached = memoryCache.get(storageKey);
    if (cached) return cached;

    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    // Auto-migrate plaintext → encrypted
    if (!stored.startsWith(ENCRYPTED_PREFIX)) {
        await setSecureMnemonic(telegramId, stored);
        return stored;
    }

    try {
        const key = await getOrCreateKey();
        const raw = stored.slice(ENCRYPTED_PREFIX.length);
        const combined = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));

        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);

        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
        const mnemonic = new TextDecoder().decode(decrypted);
        memoryCache.set(storageKey, mnemonic);
        return mnemonic;
    } catch {
        // Decryption failed (key rotated, corrupted data, etc.)
        return null;
    }
}

/**
 * Remove mnemonic from localStorage and memory cache.
 */
export function removeSecureMnemonic(telegramId: string | null): void {
    if (!telegramId) return;
    const storageKey = `${MNEMONIC_PREFIX}${telegramId}`;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${LEGACY_MNEMONIC_PREFIX}${telegramId}`);
    memoryCache.delete(storageKey);
}

/**
 * Clear the in-memory mnemonic cache (call on logout to prevent leaking to next user).
 */
export function clearMnemonicCache(): void {
    memoryCache.clear();
}

/**
 * Check if a mnemonic exists (without decrypting). Sync for quick checks.
 */
export function hasMnemonic(telegramId: string | null): boolean {
    if (!telegramId) return false;
    return (
        localStorage.getItem(`${MNEMONIC_PREFIX}${telegramId}`) !== null ||
        localStorage.getItem(`${LEGACY_MNEMONIC_PREFIX}${telegramId}`) !== null
    );
}
