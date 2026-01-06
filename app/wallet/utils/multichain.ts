/**
 * Multi-chain address derivation utilities
 * Derives ETH, BTC, SOL, and TRX addresses from the same seed phrase used for TON wallet
 */

import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { privateKeyToAddress } from "viem/accounts";
import { createHash } from "crypto";
import { ed25519 } from "@noble/curves/ed25519.js";
import bs58 from "bs58";

// BIP-44 derivation paths
const ETH_PATH = "m/44'/60'/0'/0/0";
const BTC_PATH = "m/44'/0'/0'/0/0";
const SOL_PATH = "m/44'/501'/0'/0'";
const TRX_PATH = "m/44'/195'/0'/0/0";

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

/**
 * Derive Solana address from mnemonic
 * Uses Ed25519 curve with BIP44 path m/44'/501'/0'/0'
 */
export function deriveSolAddress(mnemonic: string): string {
    try {
        const seed = mnemonicToSeedSync(mnemonic);
        const hdKey = HDKey.fromMasterSeed(seed);
        const derived = hdKey.derive(SOL_PATH);

        if (!derived.privateKey) {
            throw new Error("Failed to derive private key");
        }

        // For Solana, we need to use the first 32 bytes of the derived key as seed for Ed25519
        const seedBytes = derived.privateKey.slice(0, 32);

        // Generate Ed25519 public key from seed
        const publicKey = ed25519.getPublicKey(seedBytes);

        // Encode public key as base58 (Solana address format)
        return bs58.encode(publicKey);
    } catch (error) {
        console.error("SOL address derivation error:", error);
        return "";
    }
}

/**
 * Derive Tron address from mnemonic
 * Uses secp256k1 (like ETH) with Base58Check encoding
 */
export function deriveTronAddress(mnemonic: string): string {
    try {
        const seed = mnemonicToSeedSync(mnemonic);
        const hdKey = HDKey.fromMasterSeed(seed);
        const derived = hdKey.derive(TRX_PATH);

        if (!derived.privateKey) {
            throw new Error("Failed to derive private key");
        }

        // Get ETH-style address first (using viem)
        const privateKeyHex = `0x${Buffer.from(derived.privateKey).toString("hex")}` as `0x${string}`;
        const ethAddress = privateKeyToAddress(privateKeyHex);

        // Convert ETH address to Tron format
        // Remove 0x prefix and add 41 (Tron mainnet prefix)
        const addressHex = "41" + ethAddress.slice(2);
        const addressBytes = Buffer.from(addressHex, "hex");

        // Base58Check encode
        const hash1 = createHash("sha256").update(addressBytes).digest();
        const hash2 = createHash("sha256").update(hash1).digest();
        const checksum = hash2.slice(0, 4);

        const addressWithChecksum = Buffer.concat([addressBytes, checksum]);
        return bs58.encode(addressWithChecksum);
    } catch (error) {
        console.error("TRX address derivation error:", error);
        return "";
    }
}

export type ChainType = "ton" | "eth" | "btc" | "sol" | "trx";

export interface ChainInfo {
    id: ChainType;
    name: string;
    symbol: string;
    logo: string;
    color: string;
    warningText: string;
    receiveOnly?: boolean;
}

export const CHAIN_INFO: Record<ChainType, ChainInfo> = {
    ton: {
        id: "ton",
        name: "TON",
        symbol: "TON",
        logo: "/svg/ton-logo.svg",
        color: "#0098EA",
        warningText: "Send only TON, TON-based tokens, and NFTs to this address.",
        receiveOnly: false,
    },
    eth: {
        id: "eth",
        name: "Ethereum",
        symbol: "ETH",
        logo: "/svg/eth-logo.svg",
        color: "#627EEA",
        warningText: "Send only ETH and ERC-20 tokens to this address.",
        receiveOnly: true,
    },
    btc: {
        id: "btc",
        name: "Bitcoin",
        symbol: "BTC",
        logo: "/svg/btc-logo.svg",
        color: "#F7931A",
        warningText: "Send only Bitcoin (BTC) to this address.",
        receiveOnly: true,
    },
    sol: {
        id: "sol",
        name: "Solana",
        symbol: "SOL",
        logo: "/svg/sol-logo.svg",
        color: "#9945FF",
        warningText: "Send only SOL and SPL tokens to this address.",
        receiveOnly: true,
    },
    trx: {
        id: "trx",
        name: "TRON",
        symbol: "TRX",
        logo: "/svg/trx-logo.svg",
        color: "#FF0013",
        warningText: "Send only TRX and TRC-20 tokens to this address.",
        receiveOnly: true,
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

/**
 * Fetch SOL balance using Solana public RPC
 * Returns balance in SOL (not lamports)
 */
export async function fetchSolBalance(address: string): Promise<number> {
    if (!address) return 0;

    const rpcUrls = [
        "https://api.mainnet-beta.solana.com",
        "https://solana-mainnet.g.alchemy.com/v2/demo",
        "https://rpc.ankr.com/solana"
    ];

    for (const rpcUrl of rpcUrls) {
        try {
            const response = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "getBalance",
                    params: [address],
                    id: 1
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.result?.value !== undefined) {
                    // Convert from lamports to SOL
                    return data.result.value / 1e9;
                }
            }
        } catch (error) {
            console.warn(`SOL RPC ${rpcUrl} failed:`, error);
            continue;
        }
    }
    return 0;
}

/**
 * Fetch SOL price in USD using CoinGecko
 */
export async function fetchSolPrice(): Promise<number> {
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        if (response.ok) {
            const data = await response.json();
            return data.solana?.usd || 0;
        }
    } catch (error) {
        console.error("SOL price fetch error:", error);
    }
    return 0;
}

/**
 * Fetch TRX balance using TronGrid API (free public endpoint)
 * Returns balance in TRX (not sun)
 */
export async function fetchTrxBalance(address: string): Promise<number> {
    if (!address) return 0;

    try {
        const response = await fetch(
            `https://api.trongrid.io/v1/accounts/${address}`
        );

        if (response.ok) {
            const data = await response.json();
            if (data.data?.[0]?.balance !== undefined) {
                // Convert from sun to TRX
                return data.data[0].balance / 1e6;
            }
        }
    } catch (error) {
        console.error("TRX balance fetch error:", error);
    }
    return 0;
}

/**
 * Fetch TRX price in USD using CoinGecko
 */
export async function fetchTrxPrice(): Promise<number> {
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd"
        );
        if (response.ok) {
            const data = await response.json();
            return data.tron?.usd || 0;
        }
    } catch (error) {
        console.error("TRX price fetch error:", error);
    }
    return 0;
}

export interface ChainBalance {
    address: string;
    balance: number;
    usdValue: number;
    price: number;
}

export interface MultiChainBalances {
    eth: ChainBalance;
    btc: ChainBalance;
    sol: ChainBalance;
    trx: ChainBalance;
}

// ============== Transaction Sending Functions ==============

/**
 * Get ETH private key from mnemonic
 */
export function getEthPrivateKey(mnemonic: string): string {
    const seed = mnemonicToSeedSync(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    const derived = hdKey.derive(ETH_PATH);

    if (!derived.privateKey) {
        throw new Error("Failed to derive private key");
    }

    return `0x${Buffer.from(derived.privateKey).toString("hex")}`;
}

/**
 * Get SOL private key from mnemonic (returns keypair as Uint8Array)
 */
export function getSolKeypair(mnemonic: string): Uint8Array {
    const seed = mnemonicToSeedSync(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    const derived = hdKey.derive(SOL_PATH);

    if (!derived.privateKey) {
        throw new Error("Failed to derive private key");
    }

    // For Solana, we need the first 32 bytes as seed for Ed25519
    const seedBytes = derived.privateKey.slice(0, 32);
    const publicKey = ed25519.getPublicKey(seedBytes);

    // Solana keypair is 64 bytes: 32 bytes secret + 32 bytes public
    const keypair = new Uint8Array(64);
    keypair.set(seedBytes);
    keypair.set(publicKey, 32);
    return keypair;
}

/**
 * Get TRX private key from mnemonic (hex string without 0x prefix)
 */
export function getTrxPrivateKey(mnemonic: string): string {
    const seed = mnemonicToSeedSync(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    const derived = hdKey.derive(TRX_PATH);

    if (!derived.privateKey) {
        throw new Error("Failed to derive private key");
    }

    return Buffer.from(derived.privateKey).toString("hex");
}

/**
 * Validate ETH/EVM address
 */
export function isValidEthAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate SOL address (base58, 32-44 chars)
 */
export function isValidSolAddress(address: string): boolean {
    try {
        const decoded = bs58.decode(address);
        return decoded.length === 32;
    } catch {
        return false;
    }
}

/**
 * Validate TRX address (base58, starts with T, 34 chars)
 */
export function isValidTrxAddress(address: string): boolean {
    try {
        if (!address.startsWith("T") || address.length !== 34) {
            return false;
        }
        bs58.decode(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Estimate ETH gas for a simple transfer
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function estimateEthGas(_from: string, _to: string, _value: string): Promise<{ gasLimit: string; gasPrice: string; estimatedFee: string }> {
    const rpcUrl = "https://cloudflare-eth.com";
    
    try {
        // Get current gas price
        const gasPriceRes = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_gasPrice",
                params: [],
                id: 1
            })
        });

        let gasPrice = BigInt(20000000000); // 20 gwei fallback
        if (gasPriceRes.ok) {
            const data = await gasPriceRes.json();
            if (data.result) {
                gasPrice = BigInt(data.result);
            }
        }

        // Simple ETH transfer uses 21000 gas
        const gasLimit = BigInt(21000);
        const estimatedFee = gasLimit * gasPrice;
        
        return {
            gasLimit: gasLimit.toString(),
            gasPrice: gasPrice.toString(),
            estimatedFee: (Number(estimatedFee) / 1e18).toFixed(6)
        };
    } catch (error) {
        console.error("ETH gas estimation error:", error);
        // Return fallback values
        return {
            gasLimit: "21000",
            gasPrice: "20000000000",
            estimatedFee: "0.00042"
        };
    }
}

/**
 * Send ETH transaction
 */
export async function sendEthTransaction(
    mnemonic: string,
    to: string,
    amountEth: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const rpcUrls = [
        "https://cloudflare-eth.com",
        "https://rpc.ankr.com/eth",
        "https://eth.public-rpc.com"
    ];

    try {
        // Dynamically import viem for transaction signing
        const { createWalletClient, http, parseEther } = await import("viem");
        const { privateKeyToAccount } = await import("viem/accounts");
        const { mainnet } = await import("viem/chains");

        const privateKey = getEthPrivateKey(mnemonic) as `0x${string}`;
        const account = privateKeyToAccount(privateKey);

        // Try each RPC until one works
        for (const rpcUrl of rpcUrls) {
            try {
                const client = createWalletClient({
                    account,
                    chain: mainnet,
                    transport: http(rpcUrl)
                });

                const hash = await client.sendTransaction({
                    to: to as `0x${string}`,
                    value: parseEther(amountEth)
                });

                return { success: true, txHash: hash };
            } catch (err) {
                console.warn(`ETH send via ${rpcUrl} failed:`, err);
                continue;
            }
        }

        return { success: false, error: "All RPC endpoints failed" };
    } catch (error) {
        console.error("ETH transaction error:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Transaction failed" 
        };
    }
}

/**
 * Estimate SOL transaction fee
 */
export async function estimateSolFee(): Promise<string> {
    // Solana has very low and predictable fees (~0.000005 SOL)
    return "0.000005";
}

/**
 * Send SOL transaction using @solana/kit (modern SDK)
 */
export async function sendSolTransaction(
    mnemonic: string,
    to: string,
    amountSol: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const rpcUrl = "https://api.mainnet-beta.solana.com";

    try {
        // Import the new @solana/kit SDK
        const {
            createSolanaRpc,
            address,
            lamports,
            createTransactionMessage,
            setTransactionMessageFeePayerSigner,
            setTransactionMessageLifetimeUsingBlockhash,
            appendTransactionMessageInstruction,
            signAndSendTransactionMessageWithSigners,
            createSignerFromKeyPair,
            createKeyPairFromBytes,
            pipe,
        } = await import("@solana/kit");
        
        const { getTransferSolInstruction } = await import("@solana-program/system");

        // Get keypair bytes and create signer
        const keypairBytes = getSolKeypair(mnemonic);
        const keyPair = await createKeyPairFromBytes(keypairBytes);
        const signer = await createSignerFromKeyPair(keyPair);
        
        // Create RPC client
        const rpc = createSolanaRpc(rpcUrl);
        
        // Get latest blockhash for transaction lifetime
        const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
        
        // Convert SOL to lamports (1 SOL = 1e9 lamports)
        const lamportsAmount = lamports(BigInt(Math.floor(parseFloat(amountSol) * 1e9)));
        
        // Build the transaction message
        const transactionMessage = pipe(
            createTransactionMessage({ version: 0 }),
            (m) => setTransactionMessageFeePayerSigner(signer, m),
            (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
            (m) => appendTransactionMessageInstruction(
                getTransferSolInstruction({
                    amount: lamportsAmount,
                    destination: address(to),
                    source: signer,
                }),
                m
            )
        );
        
        // Sign and send the transaction
        const signature = await signAndSendTransactionMessageWithSigners(transactionMessage);
        
        // Convert signature bytes to base58 string
        return { success: true, txHash: String(signature) };
    } catch (error) {
        console.error("SOL transaction error:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Transaction failed" 
        };
    }
}

/**
 * Estimate TRX transaction fee (bandwidth/energy)
 */
export async function estimateTrxFee(): Promise<string> {
    // TRX transactions cost ~1-5 TRX depending on bandwidth
    return "1.0";
}

/**
 * Send TRX transaction
 */
export async function sendTrxTransaction(
    mnemonic: string,
    to: string,
    amountTrx: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
        // Dynamically import TronWeb
        const { TronWeb } = await import("tronweb");

        const privateKey = getTrxPrivateKey(mnemonic);

        const tronWeb = new TronWeb({
            fullHost: "https://api.trongrid.io",
            privateKey
        });

        const amountSun = Math.floor(parseFloat(amountTrx) * 1e6);
        
        // Create and sign transaction
        const tx = await tronWeb.transactionBuilder.sendTrx(to, amountSun);
        const signedTx = await tronWeb.trx.sign(tx);
        const result = await tronWeb.trx.sendRawTransaction(signedTx);

        if (result.result) {
            return { success: true, txHash: result.txid };
        } else {
            return { success: false, error: "Transaction rejected" };
        }
    } catch (error) {
        console.error("TRX transaction error:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Transaction failed" 
        };
    }
}

/**
 * Fetch all multi-chain balances at once
 */
export async function fetchAllMultiChainBalances(
    ethAddress: string,
    btcAddress: string,
    solAddress: string,
    trxAddress: string,
    isTestnet: boolean = false
): Promise<MultiChainBalances> {
    // Fetch all in parallel
    const [
        ethBalance, btcBalance, solBalance, trxBalance,
        ethPrice, btcPrice, solPrice, trxPrice
    ] = await Promise.all([
        fetchEthBalance(ethAddress, isTestnet),
        fetchBtcBalance(btcAddress, isTestnet),
        fetchSolBalance(solAddress),
        fetchTrxBalance(trxAddress),
        fetchEthPrice(),
        fetchBtcPrice(),
        fetchSolPrice(),
        fetchTrxPrice()
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
        },
        sol: {
            address: solAddress,
            balance: solBalance,
            usdValue: solBalance * solPrice,
            price: solPrice
        },
        trx: {
            address: trxAddress,
            balance: trxBalance,
            usdValue: trxBalance * trxPrice,
            price: trxPrice
        }
    };
}

