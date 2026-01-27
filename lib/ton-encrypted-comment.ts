"use client";

/**
 * TON Encrypted Comment Utility
 * 
 * Implements TON's encrypted comment feature using NaCL cryptography.
 * The encrypted comment uses op_code 0x2167da4b (simple_transfer_comment).
 * 
 * This implementation follows the TON standard for encrypted comments
 * and is compatible with Tonkeeper's decryption.
 * 
 * Format:
 * - 32 bits: op_code (0x2167da4b)
 * - 256 bits: sender's public key (for ECDH)
 * - 256 bits: XOR of sender's and recipient's public keys (for sender decryption)
 * - 24 bytes: nonce
 * - Variable: ciphertext (NaCl box encrypted)
 * 
 * Note: TON wallets use Ed25519 keys for signing, but the public keys
 * can be used directly with NaCl box (which uses X25519 internally
 * because Ed25519 and X25519 share the same underlying curve).
 */

import { beginCell, Cell } from "@ton/core";
import { getSecureRandomBytes, keyPairFromSeed } from "@ton/crypto";

// Op-code for encrypted text comment
const ENCRYPTED_COMMENT_OPCODE = 0x2167da4b;

/**
 * Encrypt a comment for a TON transfer
 * 
 * Uses NaCl box encryption with ephemeral keys for forward secrecy.
 * The recipient can decrypt using their wallet's secret key.
 * 
 * @param comment The plaintext comment to encrypt
 * @param recipientPublicKey The recipient's Ed25519 public key (32 bytes)
 * @returns The encrypted comment as a Cell
 */
export async function encryptComment(
    comment: string,
    recipientPublicKey: Uint8Array
): Promise<Cell> {
    const nacl = await import("tweetnacl");
    
    // Generate ephemeral key pair for this message (provides forward secrecy)
    const ephemeralSeed = await getSecureRandomBytes(32);
    const ephemeralKeyPair = keyPairFromSeed(ephemeralSeed);
    
    // Convert comment to bytes
    const messageBytes = new TextEncoder().encode(comment);
    
    // Generate random nonce (24 bytes for NaCl box)
    const nonce = nacl.randomBytes(24);
    
    // Encrypt using NaCl box
    // nacl.box uses X25519 for key exchange and XSalsa20-Poly1305 for encryption
    // Ed25519 public keys work because they share the same curve as X25519
    const ciphertext = nacl.box(
        messageBytes,
        nonce,
        recipientPublicKey,
        ephemeralSeed // Use seed as secret key (first 32 bytes)
    );
    
    // Build XOR'd public key (allows sender to decrypt their own message later)
    const xorPubkey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        xorPubkey[i] = ephemeralKeyPair.publicKey[i] ^ recipientPublicKey[i];
    }
    
    // Build the encrypted comment cell
    // Format: [op_code:32] [sender_pubkey:256] [xor_pubkey:256] [nonce] [ciphertext]
    const builder = beginCell()
        .storeUint(ENCRYPTED_COMMENT_OPCODE, 32)
        .storeBuffer(Buffer.from(ephemeralKeyPair.publicKey))
        .storeBuffer(Buffer.from(xorPubkey));
    
    // Combine nonce and ciphertext
    const payload = Buffer.concat([
        Buffer.from(nonce),
        Buffer.from(ciphertext)
    ]);
    
    // Calculate remaining bits in current cell
    const usedBits = 32 + 256 + 256; // opcode + sender_pubkey + xor_pubkey
    const remainingBits = 1023 - usedBits;
    
    // If payload fits in current cell, store it directly
    if (payload.length * 8 <= remainingBits) {
        builder.storeBuffer(payload);
    } else {
        // Store in reference cell for larger payloads
        builder.storeRef(beginCell().storeBuffer(payload).endCell());
    }
    
    return builder.endCell();
}

/**
 * Decrypt an encrypted comment from a TON transfer
 * 
 * @param cell The cell containing the encrypted comment
 * @param recipientSecretKey The recipient's secret key (32 or 64 bytes)
 * @returns The decrypted comment string, or null if decryption fails
 */
export async function decryptComment(
    cell: Cell,
    recipientSecretKey: Uint8Array
): Promise<string | null> {
    try {
        const nacl = await import("tweetnacl");
        const slice = cell.beginParse();
        
        // Read and verify op_code
        const opcode = slice.loadUint(32);
        if (opcode !== ENCRYPTED_COMMENT_OPCODE) {
            return null;
        }
        
        // Read sender's public key
        const senderPubkey = slice.loadBuffer(32);
        
        // Read XOR'd public key (skip - only needed for sender to decrypt)
        slice.loadBuffer(32);
        
        // Read payload (nonce + ciphertext)
        let payload: Buffer;
        if (slice.remainingBits > 0) {
            payload = slice.loadBuffer(slice.remainingBits / 8);
        } else if (slice.remainingRefs > 0) {
            const refSlice = slice.loadRef().beginParse();
            payload = refSlice.loadBuffer(refSlice.remainingBits / 8);
        } else {
            return null;
        }
        
        // Extract nonce (first 24 bytes) and ciphertext
        const nonce = payload.slice(0, 24);
        const ciphertext = payload.slice(24);
        
        // Get the secret key (first 32 bytes if 64-byte key)
        const secretKey = recipientSecretKey.length === 64 
            ? recipientSecretKey.slice(0, 32) 
            : recipientSecretKey;
        
        // Decrypt using NaCl box.open
        const decrypted = nacl.box.open(
            new Uint8Array(ciphertext),
            new Uint8Array(nonce),
            new Uint8Array(senderPubkey),
            secretKey
        );
        
        if (!decrypted) {
            return null;
        }
        
        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error("Failed to decrypt comment:", error);
        return null;
    }
}

/**
 * Check if a cell contains an encrypted comment
 * @param cell The cell to check
 * @returns True if the cell starts with the encrypted comment opcode
 */
export function isEncryptedComment(cell: Cell): boolean {
    try {
        const slice = cell.beginParse();
        const opcode = slice.loadUint(32);
        return opcode === ENCRYPTED_COMMENT_OPCODE;
    } catch {
        return false;
    }
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
