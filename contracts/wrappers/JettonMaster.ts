import { 
    Address, 
    beginCell, 
    Cell, 
    Contract, 
    contractAddress, 
    ContractProvider, 
    Sender, 
    SendMode, 
    toNano 
} from '@ton/core';

/**
 * Jetton Master Contract Wrapper
 * 
 * TEP-74 compliant Jetton Master with bonding curve trading
 */

// Op-codes (matching imports/opcodes.tolk)
export const OP_BUY = 0xaf750d34;                    // op::buy
export const OP_SELL_NOTIFICATION = 0xb7e76bfd;      // op::sell_notification
export const OP_BURN_NOTIFICATION = 0x7bdd97de;      // op::burn_notification
export const OP_GRADUATE = 0x47524144;               // op::graduate ("GRAD")
export const OP_INTERNAL_TRANSFER = 0x178d4519;      // op::internal_transfer
export const OP_MINT = 0x15;                         // op::mint

export interface JettonMasterConfig {
    totalSupply: bigint;
    mintable: boolean;
    adminAddress: Address;
    creatorAddress: Address;
    jettonContent: Cell;
    jettonWalletCode: Cell;
    tonReserve: bigint;
    graduated: boolean;
    graduationTarget: bigint;
}

export interface JettonData {
    totalSupply: bigint;
    mintable: boolean;
    adminAddress: Address;
    jettonContent: Cell;
    jettonWalletCode: Cell;
}

export interface CurveData {
    totalSupply: bigint;
    tonReserve: bigint;
    currentPrice: bigint;
    graduated: boolean;
    graduationTarget: bigint;
}

export function jettonMasterConfigToCell(config: JettonMasterConfig): Cell {
    return beginCell()
        .storeCoins(config.totalSupply)
        .storeBit(config.mintable)
        .storeAddress(config.adminAddress)
        .storeAddress(config.creatorAddress)
        .storeRef(config.jettonContent)
        .storeRef(config.jettonWalletCode)
        .storeCoins(config.tonReserve)
        .storeBit(config.graduated)
        .storeCoins(config.graduationTarget)
        .endCell();
}

export function buildJettonContent(name: string, symbol: string, description: string = '', image: string = ''): Cell {
    // Build TEP-64 on-chain metadata
    const dict = beginCell();
    
    // Simple on-chain content for testing
    return beginCell()
        .storeUint(0, 8) // on-chain flag
        .storeStringTail(JSON.stringify({ name, symbol, description, image, decimals: '9' }))
        .endCell();
}

export class JettonMaster implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) {}

    static createFromAddress(address: Address) {
        return new JettonMaster(address);
    }

    static createFromConfig(config: JettonMasterConfig, code: Cell, workchain = 0) {
        const data = jettonMasterConfigToCell(config);
        const init = { code, data };
        return new JettonMaster(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    /**
     * Send buy message to purchase tokens with TON
     */
    async sendBuy(
        provider: ContractProvider, 
        via: Sender, 
        value: bigint,
        minTokensOut: bigint = 0n
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OP_BUY, 32)
                .storeUint(0, 64) // query_id
                .storeCoins(minTokensOut) // slippage protection
                .endCell(),
        });
    }

    /**
     * Send graduate message (admin only)
     */
    async sendGraduate(
        provider: ContractProvider, 
        via: Sender, 
        value: bigint,
        dexRouterAddress: Address
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OP_GRADUATE, 32)
                .storeUint(0, 64) // query_id
                .storeAddress(dexRouterAddress)
                .endCell(),
        });
    }

    /**
     * Get TEP-74 standard jetton data
     */
    async getJettonData(provider: ContractProvider): Promise<JettonData> {
        const result = await provider.get('get_jetton_data', []);
        
        return {
            totalSupply: result.stack.readBigNumber(),
            mintable: result.stack.readBoolean(),
            adminAddress: result.stack.readAddress(),
            jettonContent: result.stack.readCell(),
            jettonWalletCode: result.stack.readCell(),
        };
    }

    /**
     * Get wallet address for an owner
     */
    async getWalletAddress(provider: ContractProvider, ownerAddress: Address): Promise<Address> {
        const result = await provider.get('get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(ownerAddress).endCell() }
        ]);
        return result.stack.readAddress();
    }

    /**
     * Get bonding curve data
     */
    async getCurveData(provider: ContractProvider): Promise<CurveData> {
        const result = await provider.get('get_curve_data', []);
        
        return {
            totalSupply: result.stack.readBigNumber(),
            tonReserve: result.stack.readBigNumber(),
            currentPrice: result.stack.readBigNumber(),
            graduated: result.stack.readBoolean(),
            graduationTarget: result.stack.readBigNumber(),
        };
    }

    /**
     * Preview buy - how many tokens for given TON amount
     */
    async previewBuy(provider: ContractProvider, tonAmount: bigint): Promise<bigint> {
        const result = await provider.get('preview_buy', [
            { type: 'int', value: tonAmount }
        ]);
        return result.stack.readBigNumber();
    }

    /**
     * Preview sell - how much TON for given token amount
     */
    async previewSell(provider: ContractProvider, tokenAmount: bigint): Promise<bigint> {
        const result = await provider.get('preview_sell', [
            { type: 'int', value: tokenAmount }
        ]);
        return result.stack.readBigNumber();
    }
}
