/**
 * Real Jetton Deployment Library for TON Blockchain
 * 
 * This deploys the custom QC RocketStart bonding curve Jetton contracts.
 * 
 * Contract Source: /contracts/jetton_master.fc, /contracts/jetton_wallet.fc
 */

import {
    Address,
    beginCell,
    Cell,
    toNano,
    contractAddress,
    StateInit,
    storeStateInit,
    Dictionary
} from "@ton/core";
import { TonClient } from "@ton/ton";

// Import compiled contract bytecode
import {
    JETTON_MASTER_CODE_HEX,
    JETTON_WALLET_CODE_HEX
} from "@/contracts/build/contract-code";

export interface JettonDeployConfig {
    owner: Address;
    name: string;
    symbol: string;
    description: string;
    image: string;
    decimals?: number;
    totalSupply?: bigint; // Initial total supply (0 for mint-on-demand)
}

export interface JettonDeployResult {
    success: boolean;
    jettonMasterAddress?: string;
    stateInit?: Cell;
    deployMessage?: Cell;
    error?: string;
}

/**
 * Build Jetton metadata content cell (on-chain metadata per TEP-64)
 * Uses Dictionary with SHA256 key hashes for proper explorer display
 */
function buildOnChainMetadata(config: JettonDeployConfig): Cell {
    // TEP-64 on-chain metadata format requires a dictionary with SHA256 key hashes

    // Create dictionary with Buffer keys (256-bit SHA256 hashes)
    const dict = Dictionary.empty(Dictionary.Keys.Buffer(32), Dictionary.Values.Cell());

    // Helper to build snake-format value cell with proper chunking for long strings
    // TEP-64 Snake format: 0x00 prefix byte, then data, with continuation in refs if needed
    const makeSnakeCell = (data: string): Cell => {
        const buffer = Buffer.from(data, 'utf-8');
        // Account for the 0x00 prefix byte - leaves 126 bytes for data per cell
        const CELL_MAX_SIZE_BYTES = 126;

        if (buffer.length <= CELL_MAX_SIZE_BYTES) {
            // Short data - fits in one cell with prefix
            return beginCell()
                .storeUint(0x00, 8)  // Snake format prefix byte (REQUIRED by TEP-64)
                .storeBuffer(buffer)
                .endCell();
        }

        // Long data - need to chain cells
        // First cell has 0x00 prefix, subsequent cells are just data
        const chunks: Buffer[] = [];
        chunks.push(buffer.subarray(0, CELL_MAX_SIZE_BYTES)); // First chunk (smaller due to prefix)
        for (let i = CELL_MAX_SIZE_BYTES; i < buffer.length; i += 127) {
            chunks.push(buffer.subarray(i, Math.min(i + 127, buffer.length)));
        }

        // Build from last to first (reversed to create chain)
        let cell: Cell | null = null;
        for (let i = chunks.length - 1; i >= 0; i--) {
            const builder = beginCell();
            if (i === 0) {
                // First cell gets the snake format prefix
                builder.storeUint(0x00, 8);
            }
            builder.storeBuffer(chunks[i]);
            if (cell) {
                builder.storeRef(cell);
            }
            cell = builder.endCell();
        }

        return cell!;
    };

    const keyName = Buffer.from("82a3537ff0dbce7eec35d69edc3a189ee6f17d82f353a553f9aa96cb0be3ce89", "hex");
    const keySymbol = Buffer.from("b76a7ca153c24671658335bbd08946350ffc621fa1c516e7123095d4ffd5c581", "hex");
    const keyDecimals = Buffer.from("ee80fd2f1e03480e2282363596ee752d7bb27f50776b95086a0279189675923e", "hex");
    const keyDescription = Buffer.from("c9046f7a37ad0ea7cee73355984fa5428982f8b37c8f7bcec91f7ac71a7cd104", "hex");
    const keyImage = Buffer.from("6105d6cc76af400325e94d588ce511be5bfdbb73b437dc51eca43917d7a43e3d", "hex");

    dict.set(keyName, makeSnakeCell(config.name));
    dict.set(keySymbol, makeSnakeCell(config.symbol));
    dict.set(keyDecimals, makeSnakeCell(String(config.decimals ?? 9)));

    if (config.description) {
        dict.set(keyDescription, makeSnakeCell(config.description.slice(0, 200)));
    }

    if (config.image && !config.image.startsWith('data:')) {
        dict.set(keyImage, makeSnakeCell(config.image));
    }

    return beginCell()
        .storeUint(0x00, 8)
        .storeDict(dict)
        .endCell();
}

function buildOffChainMetadata(metadataUri: string): Cell {
    return beginCell()
        .storeUint(0x01, 8)
        .storeBuffer(Buffer.from(metadataUri))
        .endCell();
}

function buildJettonMinterData(
    config: JettonDeployConfig,
    walletCode: Cell,
    platformAddress: Address
): Cell {
    return beginCell()
        .storeCoins(config.totalSupply ?? BigInt(0))
        .storeBit(true)
        .storeAddress(platformAddress)
        .storeAddress(config.owner)
        .storeRef(buildOnChainMetadata(config))
        .storeRef(walletCode)
        .storeCoins(0)
        .storeBit(false)
        .storeCoins(toNano("2000"))
        .endCell();
}

/**
 * Calculate Jetton Master contract address from stateInit
 */
export function calculateJettonMasterAddress(stateInit: StateInit): Address {
    return contractAddress(0, stateInit);
}

/**
 * Build complete Jetton deployment package
 * Returns stateInit and deploy message for the user's wallet to send
 */
export function buildJettonDeploy(config: JettonDeployConfig, platformWallet?: string): JettonDeployResult {
    try {
        // Parse contract code from hex
        const minterCode = Cell.fromBoc(Buffer.from(JETTON_MASTER_CODE_HEX, 'hex'))[0];
        const walletCode = Cell.fromBoc(Buffer.from(JETTON_WALLET_CODE_HEX, 'hex'))[0];

        // Parse platform address (admin) - defaults to hardcoded platform wallet
        const platformAddress = Address.parse(
            platformWallet || "UQBUSXMd54HOJlmmh4TsuMvIcwB91kkIlz6HTgj62dN43S3U"
        );

        // Build initial data with correct layout
        const minterData = buildJettonMinterData(config, walletCode, platformAddress);

        // Create StateInit
        const stateInit: StateInit = {
            code: minterCode,
            data: minterData,
        };

        // Calculate contract address
        const jettonMasterAddress = calculateJettonMasterAddress(stateInit);

        // Build deploy message (just internal message with stateInit)
        // The message body can be empty for deployment
        const deployMessage = beginCell()
            .storeUint(0, 32) // No opcode needed for deployment
            .storeUint(0, 64) // Query ID
            .endCell();

        // Convert stateInit to Cell for transmission
        const stateInitCell = beginCell()
            .store(storeStateInit(stateInit))
            .endCell();

        return {
            success: true,
            jettonMasterAddress: jettonMasterAddress.toString({ bounceable: true }),
            stateInit: stateInitCell,
            deployMessage,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error building deployment",
        };
    }
}

/**
 * Build mint message for minting tokens to an address
 */
export function buildMintMessage(
    toAddress: Address,
    amount: bigint,
    forwardTonAmount: bigint = toNano("0.05")
): Cell {
    // Mint opcode: 21
    const MINT_OP = 21;

    return beginCell()
        .storeUint(MINT_OP, 32) // op: mint
        .storeUint(0, 64) // query_id
        .storeAddress(toAddress) // to_address
        .storeCoins(forwardTonAmount) // forward_ton_amount
        .storeRef(
            beginCell()
                .storeUint(0x178d4519, 32) // internal_transfer op
                .storeUint(0, 64) // query_id
                .storeCoins(amount) // jetton_amount
                .storeAddress(null) // from_address
                .storeAddress(toAddress) // response_destination
                .storeCoins(0) // forward_ton_amount
                .storeBit(false) // forward_payload
                .endCell()
        )
        .endCell();
}

/**
 * Build transfer message for sending Jettons between wallets
 */
export function buildTransferMessage(
    toAddress: Address,
    amount: bigint,
    responseAddress: Address,
    forwardTonAmount: bigint = BigInt(0),
    forwardPayload?: Cell
): Cell {
    // Transfer opcode: 0xf8a7ea5
    const TRANSFER_OP = 0xf8a7ea5;

    return beginCell()
        .storeUint(TRANSFER_OP, 32) // op: transfer
        .storeUint(0, 64) // query_id
        .storeCoins(amount) // amount (in jettons)
        .storeAddress(toAddress) // destination
        .storeAddress(responseAddress) // response_destination
        .storeBit(false) // null custom_payload
        .storeCoins(forwardTonAmount) // forward_ton_amount
        .storeBit(forwardPayload ? true : false) // forward_payload flag
        .storeMaybeRef(forwardPayload)
        .endCell();
}

/**
 * Get Jetton wallet address for a user
 */
export async function getJettonWalletAddress(
    jettonMasterAddress: string,
    ownerAddress: string,
    tonClient: TonClient
): Promise<string | null> {
    try {
        const master = Address.parse(jettonMasterAddress);
        const owner = Address.parse(ownerAddress);

        const result = await tonClient.runMethod(master, "get_wallet_address", [
            { type: "slice", cell: beginCell().storeAddress(owner).endCell() }
        ]);

        const walletAddress = result.stack.readAddress();
        return walletAddress?.toString({ bounceable: true }) || null;
    } catch {
        return null;
    }
}

/**
 * Get Jetton balance for a wallet
 */
export async function getJettonBalance(
    jettonWalletAddress: string,
    tonClient: TonClient
): Promise<bigint> {
    try {
        const wallet = Address.parse(jettonWalletAddress);
        const result = await tonClient.runMethod(wallet, "get_wallet_data");

        const balance = result.stack.readBigNumber();
        return balance;
    } catch {
        return BigInt(0);
    }
}

/**
 * Check if Jetton contract is deployed and active
 */
export async function isJettonDeployed(
    jettonAddress: string,
    tonClient: TonClient
): Promise<boolean> {
    try {
        const address = Address.parse(jettonAddress);
        const state = await tonClient.getContractState(address);
        return state.state === "active";
    } catch {
        return false;
    }
}

/**
 * Get full Jetton data from the master contract
 */
export async function getJettonData(
    jettonAddress: string,
    tonClient: TonClient
): Promise<{
    totalSupply: bigint;
    mintable: boolean;
    adminAddress: string;
} | null> {
    try {
        const address = Address.parse(jettonAddress);
        const result = await tonClient.runMethod(address, "get_jetton_data");

        const totalSupply = result.stack.readBigNumber();
        const mintable = result.stack.readBoolean();
        const adminAddress = result.stack.readAddress();

        return {
            totalSupply,
            mintable,
            adminAddress: adminAddress?.toString({ bounceable: true }) || "",
        };
    } catch {
        return null;
    }
}
