"use client";

/**
 * TON Encrypted Comment Utility
 * 
 * Implements TON's encrypted comment feature using NaCL cryptography.
 * The encrypted comment uses op_code 0x2167da4b (EncryptedTextComment).
 * 
 * Format:
 * - 32 bits: op_code (0x2167da4b)
 * - 256 bits: sender's ephemeral public key
 * - 256 bits: recipient's public key (XOR'd with sender's for privacy)
 * - Variable: encrypted message (ciphertext + nonce)
 */

import { beginCell, Cell } from "@ton/core";
import { getSecureRandomBytes, keyPairFromSeed, KeyPair } from "@ton/crypto";

// Op-code for encrypted text comment (TEP-0001)
const ENCRYPTED_COMMENT_OPCODE = 0x2167da4b;

/**
 * Encrypt a comment for a TON transfer
 * @param comment The plaintext comment to encrypt
 * @param recipientPublicKey The recipient's public key (32 bytes)
 * @param senderKeyPair The sender's key pair for encryption
 * @returns The encrypted comment as a Cell
 */
export async function encryptComment(
    comment: string,
    recipientPublicKey: Uint8Array
): Promise<Cell> {
    // Generate ephemeral key pair for this message
    const ephemeralSeed = await getSecureRandomBytes(32);
    const ephemeralKeyPair = keyPairFromSeed(ephemeralSeed);
    
    // Create shared secret using ECDH (X25519)
    // In a real implementation, you'd use nacl.box.before or similar
    // For now, we use a simplified approach with the crypto library
    const nacl = await import("tweetnacl");
    
    // Convert comment to bytes
    const messageBytes = new TextEncoder().encode(comment);
    
    // Generate nonce
    const nonce = nacl.randomBytes(24);
    
    // Create shared secret (simplified - in production use proper X25519)
    const sharedSecret = nacl.box.before(recipientPublicKey, ephemeralKeyPair.secretKey.slice(0, 32));
    
    // Encrypt the message
    const encrypted = nacl.box.after(messageBytes, nonce, sharedSecret);
    
    // Build the encrypted comment cell
    // Format: [op_code:32] [ephemeral_pubkey:256] [xor_pubkey:256] [nonce:192] [ciphertext:variable]
    const xorPubkey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        xorPubkey[i] = ephemeralKeyPair.publicKey[i] ^ recipientPublicKey[i];
    }
    
    const builder = beginCell()
        .storeUint(ENCRYPTED_COMMENT_OPCODE, 32)
        .storeBuffer(Buffer.from(ephemeralKeyPair.publicKey))
        .storeBuffer(Buffer.from(xorPubkey));
    
    // Store nonce and ciphertext
    const payload = Buffer.concat([
        Buffer.from(nonce),
        Buffer.from(encrypted)
    ]);
    
    // If payload fits in current cell, store it directly
    if (payload.length * 8 <= 1023 - 32 - 256 - 256) {
        builder.storeBuffer(payload);
    } else {
        // Store in reference cell
        builder.storeRef(beginCell().storeBuffer(payload).endCell());
    }
    
    return builder.endCell();
}

/**
 * Decrypt an encrypted comment from a TON transfer
 * @param cell The cell containing the encrypted comment
 * @param recipientKeyPair The recipient's key pair for decryption
 * @returns The decrypted comment string, or null if decryption fails
 */
export async function decryptComment(
    cell: Cell,
    recipientKeyPair: KeyPair
): Promise<string | null> {
    try {
        const slice = cell.beginParse();
        
        // Read and verify op_code
        const opcode = slice.loadUint(32);
        if (opcode !== ENCRYPTED_COMMENT_OPCODE) {
            return null;
        }
        
        // Read ephemeral public key
        const ephemeralPubkey = slice.loadBuffer(32);
        
        // Read XOR'd public key (used for sender verification, not needed for decryption)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _xorPubkey = slice.loadBuffer(32);
        
        // Recover the sender's ephemeral public key
        // (not needed for decryption, but could be useful for verification)
        
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
        
        // Extract nonce and ciphertext
        const nonce = payload.slice(0, 24);
        const ciphertext = payload.slice(24);
        
        const nacl = await import("tweetnacl");
        
        // Create shared secret
        const sharedSecret = nacl.box.before(
            new Uint8Array(ephemeralPubkey),
            recipientKeyPair.secretKey.slice(0, 32)
        );
        
        // Decrypt
        const decrypted = nacl.box.open.after(
            new Uint8Array(ciphertext),
            new Uint8Array(nonce),
            sharedSecret
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
