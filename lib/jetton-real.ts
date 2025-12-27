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
    storeStateInit
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
 */
function buildOnChainMetadata(config: JettonDeployConfig): Cell {
    // On-chain metadata format with key-value dictionary
    const contentCell = beginCell();

    // On-chain metadata indicator
    contentCell.storeUint(0x00, 8);

    // Store metadata as snake format
    const nameCell = beginCell().storeBuffer(Buffer.from(config.name)).endCell();
    const symbolCell = beginCell().storeBuffer(Buffer.from(config.symbol)).endCell();
    const descCell = beginCell().storeBuffer(Buffer.from(config.description)).endCell();
    const decimalsCell = beginCell().storeUint(config.decimals ?? 9, 8).endCell();

    // Build dictionary with metadata keys
    // Keys: 0xffffffff => uri, 0x434 => name, 0x435 => symbol, 0x437 => decimals, 0x436 => description
    contentCell
        .storeRef(nameCell)
        .storeRef(symbolCell)
        .storeRef(decimalsCell)
        .storeRef(descCell);

    return contentCell.endCell();
}

/**
 * Build off-chain metadata (URI pointing to JSON)
 */
export function buildOffChainMetadata(metadataUri: string): Cell {
    return beginCell()
        .storeUint(0x01, 8) // Off-chain metadata indicator
        .storeBuffer(Buffer.from(metadataUri))
        .endCell();
}

/**
 * Build Jetton minter initial data cell
 * Must match the load_data() layout in jetton_master.fc exactly:
 *   total_supply, mintable, admin_address, creator_address,
 *   content, wallet_code, ton_reserve, platform_fees,
 *   creator_fees, graduated, graduation_target
 */
function buildJettonMinterData(
    config: JettonDeployConfig, 
    walletCode: Cell,
    platformAddress: Address
): Cell {
    return beginCell()
        .storeCoins(config.totalSupply ?? BigInt(0))  // total_supply (0 initially)
        .storeInt(1, 1)                               // mintable (1 = true)
        .storeAddress(platformAddress)                // admin_address (PLATFORM wallet for fees)
        .storeAddress(config.owner)                   // creator_address (token creator)
        .storeRef(buildOnChainMetadata(config))       // jetton_content
        .storeRef(walletCode)                         // jetton_wallet_code
        .storeCoins(0)                                // ton_reserve (starts at 0)
        .storeCoins(0)                                // platform_fees (starts at 0)
        .storeCoins(0)                                // creator_fees (starts at 0)
        .storeInt(0, 1)                               // graduated (0 = not graduated)
        .storeCoins(toNano("2000"))                   // graduation_target (2000 TON)
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
