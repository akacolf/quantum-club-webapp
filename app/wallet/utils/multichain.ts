/**
 * Multi-chain address derivation utilities
 * Derives ETH and BTC addresses from the same seed phrase used for TON wallet
 */

import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { privateKeyToAddress } from "viem/accounts";
import { createHash } from "crypto";

// BIP-44 derivation paths
const ETH_PATH = "m/44'/60'/0'/0/0";
const BTC_PATH = "m/44'/0'/0'/0/0";

/**
 * Derive Ethereum address from mnemonic
 */
export function deriveEthAddress(mnemonic: string): string {
    try {
        const seed = mnemonicToSeedSync(mnemonic);
        const hdKey = HDKey.fromMasterSeed(seed);
        const derived = hdKey.derive(ETH_PATH);

        if (!derived.privateKey) {
            throw new Error("Failed to derive private key");
        }

        // Convert to hex string with 0x prefix for viem
        const privateKeyHex = `0x${Buffer.from(derived.privateKey).toString("hex")}` as `0x${string}`;
        return privateKeyToAddress(privateKeyHex);
    } catch (error) {
        console.error("ETH address derivation error:", error);
        return "";
    }
}

/**
 * Derive Bitcoin address from mnemonic (Native SegWit - bc1...)
 */
export function deriveBtcAddress(mnemonic: string): string {
    try {
        const seed = mnemonicToSeedSync(mnemonic);
        const hdKey = HDKey.fromMasterSeed(seed);
        const derived = hdKey.derive(BTC_PATH);

        if (!derived.publicKey) {
            throw new Error("Failed to derive public key");
        }

        // Create SegWit (bech32) address
        const pubKeyHash = hash160(Buffer.from(derived.publicKey));
        const address = bech32Encode("bc", 0, pubKeyHash);
        return address;
    } catch (error) {
        console.error("BTC address derivation error:", error);
        return "";
    }
}

// Helper: RIPEMD160(SHA256(data))
function hash160(data: Buffer): Buffer {
    const sha256 = createHash("sha256").update(data).digest();
    // Use a simple implementation since we're client-side
    return ripemd160(sha256);
}

// Simple RIPEMD160 implementation using crypto module
function ripemd160(data: Buffer): Buffer {
    // Use Node.js crypto module for RIPEMD160
    return createHash("ripemd160").update(data).digest() as unknown as Buffer;
}

// Bech32 encoding for SegWit addresses
function bech32Encode(hrp: string, version: number, data: Buffer): string {
    const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

    const values = [version, ...convertBits(data, 8, 5, true)];
    const checksum = createChecksum(hrp, values);
    const combined = [...values, ...checksum];

    return hrp + "1" + combined.map(v => CHARSET[v]).join("");
}

function convertBits(data: Buffer, fromBits: number, toBits: number, pad: boolean): number[] {
    let acc = 0;
    let bits = 0;
    const result: number[] = [];
    const maxv = (1 << toBits) - 1;

    for (const value of data) {
        acc = (acc << fromBits) | value;
        bits += fromBits;
        while (bits >= toBits) {
            bits -= toBits;
            result.push((acc >> bits) & maxv);
        }
    }

    if (pad && bits > 0) {
        result.push((acc << (toBits - bits)) & maxv);
    }

    return result;
}

function createChecksum(hrp: string, values: number[]): number[] {
    const enc = hrpExpand(hrp).concat(values).concat([0, 0, 0, 0, 0, 0]);
    const mod = polymod(enc) ^ 1;
    const ret: number[] = [];
    for (let i = 0; i < 6; i++) {
        ret.push((mod >> (5 * (5 - i))) & 31);
    }
    return ret;
}

function hrpExpand(hrp: string): number[] {
    const ret: number[] = [];
    for (const c of hrp) {
        ret.push(c.charCodeAt(0) >> 5);
    }
    ret.push(0);
    for (const c of hrp) {
        ret.push(c.charCodeAt(0) & 31);
    }
    return ret;
}

function polymod(values: number[]): number {
    const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let chk = 1;
    for (const v of values) {
        const b = chk >> 25;
        chk = ((chk & 0x1ffffff) << 5) ^ v;
        for (let i = 0; i < 5; i++) {
            if ((b >> i) & 1) {
                chk ^= GEN[i];
            }
        }
    }
    return chk;
}

export type ChainType = "ton" | "eth" | "btc";

export interface ChainInfo {
    id: ChainType;
    name: string;
    symbol: string;
    logo: string;
    color: string;
    warningText: string;
}

export const CHAIN_INFO: Record<ChainType, ChainInfo> = {
    ton: {
        id: "ton",
        name: "TON",
        symbol: "TON",
        logo: "/svg/ton-logo.svg",
        color: "#0098EA",
        warningText: "Send only TON, TON-based tokens, and NFTs to this address.",
    },
    eth: {
        id: "eth",
        name: "Ethereum",
        symbol: "ETH",
        logo: "/svg/eth-logo.svg",
        color: "#627EEA",
        warningText: "Send only ETH and ERC-20 tokens to this address.",
    },
    btc: {
        id: "btc",
        name: "Bitcoin",
        symbol: "BTC",
        logo: "/svg/btc-logo.svg",
        color: "#F7931A",
        warningText: "Send only Bitcoin (BTC) to this address.",
    },
};
