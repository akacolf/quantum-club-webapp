"use client";

/**
 * TON Encrypted Comment Utility
 * 
 * Implements TON's encrypted comment feature compatible with Tonkeeper.
 * The encrypted comment uses op_code 0x2167da4b.
 * 
 * This implementation follows the TON standard using:
 * - X25519 ECDH key exchange (Ed25519 keys converted to X25519)
 * - AES-256-CBC encryption with HMAC-SHA512 key derivation
 * - Sender address as salt for encryption
 * 
 * Format:
 * - 32 bits: op_code (0x2167da4b)
 * - 256 bits: XOR of sender's and recipient's public keys
 * - 128 bits: message key (first 16 bytes of HMAC)
 * - Variable: AES-CBC encrypted data with random prefix
 */

import { beginCell, Cell, Address } from "@ton/core";
import { getSecureRandomBytes, keyPairFromSeed, sha512 } from "@ton/crypto";
import { x25519, edwardsToMontgomeryPub, edwardsToMontgomeryPriv } from "@noble/curves/ed25519";
import aesjs from "aes-js";

/**
 * HMAC-SHA512 implementation
 */
async function hmacSha512(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    const blockSize = 128;
    
    // Pad or hash the key to blockSize
    const keyBlock = new Uint8Array(blockSize);
    if (key.length > blockSize) {
        const hashedKey = await sha512(Buffer.from(key));
        keyBlock.set(new Uint8Array(hashedKey));
    } else {
        keyBlock.set(key);
    }
    
    // Create inner and outer padded keys
    const ipad = new Uint8Array(blockSize);
    const opad = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
        ipad[i] = keyBlock[i] ^ 0x36;
        opad[i] = keyBlock[i] ^ 0x5c;
    }
    
    // Inner hash
    const innerData = new Uint8Array(ipad.length + data.length);
    innerData.set(ipad);
    innerData.set(data, ipad.length);
    const innerHash = await sha512(Buffer.from(innerData));
    
    // Outer hash
    const outerData = new Uint8Array(opad.length + innerHash.length);
    outerData.set(opad);
    outerData.set(new Uint8Array(innerHash), opad.length);
    const result = await sha512(Buffer.from(outerData));
    
    return new Uint8Array(result);
}

/**
 * AES-CBC encryption (no padding - data must be multiple of 16)
 */
function aesCbcEncrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
    const aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
    return aesCbc.encrypt(data);
}

/**
 * Get random prefix for padding data to multiple of 16 bytes
 */
function getRandomPrefix(dataLength: number, minPadding: number): Uint8Array {
    const prefixLength = ((minPadding + 15 + dataLength) & -16) - dataLength;
    const prefix = new Uint8Array(prefixLength);
    crypto.getRandomValues(prefix);
    prefix[0] = prefixLength;
    return prefix;
}

/**
 * Store data in snake cells (for large payloads)
 */
function storeDeepRef(bytes: Uint8Array): Cell {
    const CELL_BYTE_LENGTH = 127;
    if (bytes.length <= CELL_BYTE_LENGTH) {
        return beginCell()
            .storeBuffer(Buffer.from(bytes.slice(0, CELL_BYTE_LENGTH)))
            .endCell();
    } else {
        return beginCell()
            .storeBuffer(Buffer.from(bytes.slice(0, Math.min(bytes.length, CELL_BYTE_LENGTH))))
            .storeRef(storeDeepRef(bytes.slice(CELL_BYTE_LENGTH)))
            .endCell();
    }
}

/**
 * Create snake cells for the encrypted payload
 */
function makeSnakeCells(bytes: Uint8Array): Cell {
    const ROOT_CELL_BYTE_LENGTH = 35 + 4; // 4 bytes for opcode, 35 for initial data
    const CELL_BYTE_LENGTH = 127;
    
    if (bytes.length <= ROOT_CELL_BYTE_LENGTH) {
        return beginCell()
            .storeBuffer(Buffer.from(bytes))
            .endCell();
    }
    
    const rootCellBuilder = beginCell()
        .storeBuffer(Buffer.from(bytes.slice(0, Math.min(bytes.length, ROOT_CELL_BYTE_LENGTH))));

    const cellCount = Math.ceil((bytes.length - ROOT_CELL_BYTE_LENGTH) / CELL_BYTE_LENGTH);
    if (cellCount > 16) {
        throw new Error("Text too long");
    }

    rootCellBuilder.storeRef(
        storeDeepRef(bytes.slice(ROOT_CELL_BYTE_LENGTH))
    );

    return rootCellBuilder.endCell();
}

/**
 * Encrypt a comment for a TON transfer (Tonkeeper compatible)
 * 
 * @param comment The plaintext comment to encrypt
 * @param recipientPublicKey The recipient's Ed25519 public key (32 bytes)
 * @param senderPublicKey The sender's Ed25519 public key (32 bytes) 
 * @param senderPrivateKey The sender's Ed25519 private key (32 or 64 bytes)
 * @param senderAddress The sender's wallet address (used as salt)
 * @returns The encrypted comment as a Cell
 */
export async function encryptComment(
    comment: string,
    recipientPublicKey: Uint8Array,
    senderPublicKey?: Uint8Array,
    senderPrivateKey?: Uint8Array,
    senderAddress?: string | Address
): Promise<Cell> {
    // If sender keys not provided, generate ephemeral keys
    let myPublicKey: Uint8Array;
    let myPrivateKey: Uint8Array;
    
    if (senderPublicKey && senderPrivateKey) {
        myPublicKey = senderPublicKey;
        myPrivateKey = senderPrivateKey.length === 64 ? senderPrivateKey.slice(0, 32) : senderPrivateKey;
    } else {
        // Generate ephemeral key pair
        const ephemeralSeed = await getSecureRandomBytes(32);
        const ephemeralKeyPair = keyPairFromSeed(Buffer.from(ephemeralSeed));
        myPublicKey = ephemeralKeyPair.publicKey;
        myPrivateKey = ephemeralSeed;
    }
    
    if (!comment || !comment.length) {
        throw new Error("Empty comment");
    }
    
    const commentBytes = new TextEncoder().encode(comment);
    
    // Create salt from sender address
    let salt: Uint8Array;
    if (senderAddress) {
        const address = senderAddress instanceof Address ? senderAddress : Address.parse(senderAddress);
        salt = new TextEncoder().encode(
            address.toString({ bounceable: true, urlSafe: true, testOnly: false })
        );
    } else {
        // Use a default salt if no address provided
        salt = new TextEncoder().encode("ton-encrypted");
    }
    
    // Convert Ed25519 keys to X25519 for ECDH key exchange
    const myX25519Private = edwardsToMontgomeryPriv(myPrivateKey);
    const theirX25519Public = edwardsToMontgomeryPub(recipientPublicKey);
    
    // Get shared secret using X25519
    const sharedSecret = x25519.getSharedSecret(myX25519Private, theirX25519Public);
    
    // Add random prefix for padding
    const prefix = getRandomPrefix(commentBytes.length, 16);
    const combined = new Uint8Array(prefix.length + commentBytes.length);
    combined.set(prefix);
    combined.set(commentBytes, prefix.length);
    
    // Derive message key and encryption key
    const dataHash = await hmacSha512(salt, combined);
    const msgKey = dataHash.slice(0, 16);
    const cbcStateSecret = await hmacSha512(sharedSecret, msgKey);
    const aesKey = cbcStateSecret.slice(0, 32);
    const aesIv = cbcStateSecret.slice(32, 48);
    
    // Encrypt with AES-CBC
    const encrypted = aesCbcEncrypt(combined, aesKey, aesIv);
    
    // Build XOR'd public key (allows sender to decrypt their own message)
    const xorPubkey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        xorPubkey[i] = recipientPublicKey[i] ^ myPublicKey[i];
    }
    
    // Combine: [xor_pubkey:32] [msgKey:16] [encrypted]
    const encryptedPayload = new Uint8Array(32 + 16 + encrypted.length);
    encryptedPayload.set(xorPubkey, 0);
    encryptedPayload.set(msgKey, 32);
    encryptedPayload.set(encrypted, 48);
    
    // Build final payload with opcode
    const payload = new Uint8Array(4 + encryptedPayload.length);
    payload[0] = 0x21;
    payload[1] = 0x67;
    payload[2] = 0xda;
    payload[3] = 0x4b;
    payload.set(encryptedPayload, 4);
    
    return makeSnakeCells(payload);
}

/**
 * Create a simple text comment cell (non-encrypted)
 * @param comment The comment text
 * @returns The comment as a Cell
 */
export function createTextComment(comment: string): Cell {
    return beginCell()
        .storeUint(0, 32) // 0 opcode for simple text comment
        .storeStringTail(comment)
        .endCell();
}
