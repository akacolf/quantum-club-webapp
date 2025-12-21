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
 * Derive Bitcoin address from mnemonic
 * @param mnemonic - 24-word recovery phrase
 * @param isTestnet - if true, returns testnet address (tb1...), otherwise mainnet (bc1...)
 */
export function deriveBtcAddress(mnemonic: string, isTestnet: boolean = false): string {
    try {
        const seed = mnemonicToSeedSync(mnemonic);
        const hdKey = HDKey.fromMasterSeed(seed);
        // Use testnet path if testnet mode
        const path = isTestnet ? "m/44'/1'/0'/0/0" : BTC_PATH;
        const derived = hdKey.derive(path);

        if (!derived.publicKey) {
            throw new Error("Failed to derive public key");
        }

        // Create SegWit (bech32) address
        // Use "tb" for testnet, "bc" for mainnet
        const pubKeyHash = hash160(Buffer.from(derived.publicKey));
        const hrp = isTestnet ? "tb" : "bc";
        const address = bech32Encode(hrp, 0, pubKeyHash);
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

// ============== Balance Fetching Functions ==============

/**
 * Fetch ETH balance using public RPC (Cloudflare/Ankr for mainnet, Sepolia for testnet)
 * Returns balance in ETH (not wei)
 */
export async function fetchEthBalance(address: string, isTestnet: boolean = false): Promise<number> {
    if (!address) return 0;

    const rpcUrls = isTestnet
        ? [
            "https://rpc.sepolia.org",
            "https://rpc.ankr.com/eth_sepolia",
            "https://ethereum-sepolia.publicnode.com"
        ]
        : [
            "https://cloudflare-eth.com",
            "https://rpc.ankr.com/eth",
            "https://eth.public-rpc.com"
        ];

    for (const rpcUrl of rpcUrls) {
        try {
            const response = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_getBalance",
                    params: [address, "latest"],
                    id: 1
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.result) {
                    // Convert from wei (hex) to ETH
                    const weiHex = data.result;
                    const wei = BigInt(weiHex);
                    const eth = Number(wei) / 1e18;
                    return eth;
                }
            }
        } catch (error) {
            console.warn(`ETH RPC ${rpcUrl} failed:`, error);
            continue;
        }
    }
    return 0;
}

/**
 * Fetch BTC balance using Blockstream API (completely free, no auth)
 * Returns balance in BTC (not satoshis)
 */
export async function fetchBtcBalance(address: string, isTestnet: boolean = false): Promise<number> {
    if (!address) return 0;

    try {
        // Blockstream API - use testnet endpoint if isTestnet
        const baseUrl = isTestnet
            ? "https://blockstream.info/testnet/api"
            : "https://blockstream.info/api";
        const response = await fetch(`${baseUrl}/address/${address}`);

        if (response.ok) {
            const data = await response.json();
            // chain_stats contains confirmed balance
            // mempool_stats contains unconfirmed
            const confirmedSats = data.chain_stats?.funded_txo_sum - data.chain_stats?.spent_txo_sum || 0;
            const btc = confirmedSats / 1e8;
            return btc;
        }
    } catch (error) {
        console.error("BTC balance fetch error:", error);
    }
    return 0;
}

/**
 * Fetch ETH price in USD using CoinGecko (free, no API key needed)
 */
export async function fetchEthPrice(): Promise<number> {
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
        );
        if (response.ok) {
            const data = await response.json();
            return data.ethereum?.usd || 0;
        }
    } catch (error) {
        console.error("ETH price fetch error:", error);
    }
    return 0;
}

/**
 * Fetch BTC price in USD using CoinGecko (free, no API key needed)
 */
export async function fetchBtcPrice(): Promise<number> {
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
        );
        if (response.ok) {
            const data = await response.json();
            return data.bitcoin?.usd || 0;
        }
    } catch (error) {
        console.error("BTC price fetch error:", error);
    }
    return 0;
}

export interface MultiChainBalances {
    eth: {
        address: string;
        balance: number;
        usdValue: number;
        price: number;
    };
    btc: {
        address: string;
        balance: number;
        usdValue: number;
        price: number;
    };
}

/**
 * Fetch all multi-chain balances at once
 */
export async function fetchAllMultiChainBalances(
    ethAddress: string,
    btcAddress: string,
    isTestnet: boolean = false
): Promise<MultiChainBalances> {
    // Fetch all in parallel
    const [ethBalance, btcBalance, ethPrice, btcPrice] = await Promise.all([
        fetchEthBalance(ethAddress, isTestnet),
        fetchBtcBalance(btcAddress, isTestnet),
        fetchEthPrice(),
        fetchBtcPrice()
    ]);

    return {
        eth: {
            address: ethAddress,
            balance: ethBalance,
            usdValue: ethBalance * ethPrice,
            price: ethPrice
        },
        btc: {
            address: btcAddress,
            balance: btcBalance,
            usdValue: btcBalance * btcPrice,
            price: btcPrice
        }
    };
}
