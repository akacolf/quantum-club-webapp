import { 
    Address, 
    beginCell, 
    Cell, 
    Contract, 
    contractAddress, 
    ContractProvider, 
    Sender, 
    SendMode,
} from '@ton/core';

/**
 * Jetton Wallet Contract Wrapper
 * 
 * TEP-74 compliant Jetton Wallet
 */

// Op-codes
export const OP_TRANSFER = 0xf8a7ea5;
export const OP_INTERNAL_TRANSFER = 0x178d4519;
export const OP_BURN = 0x595f07bc;
export const OP_TRANSFER_NOTIFICATION = 0x7362d09c;

export interface JettonWalletConfig {
    balance: bigint;
    ownerAddress: Address;
    jettonMasterAddress: Address;
    jettonWalletCode: Cell;
}

export interface WalletData {
    balance: bigint;
    ownerAddress: Address;
    jettonMasterAddress: Address;
    jettonWalletCode: Cell;
}

export function jettonWalletConfigToCell(config: JettonWalletConfig): Cell {
    return beginCell()
        .storeCoins(config.balance)
        .storeAddress(config.ownerAddress)
        .storeAddress(config.jettonMasterAddress)
        .storeRef(config.jettonWalletCode)
        .endCell();
}

export class JettonWallet implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) {}

    static createFromAddress(address: Address) {
        return new JettonWallet(address);
    }

    static createFromConfig(config: JettonWalletConfig, code: Cell, workchain = 0) {
        const data = jettonWalletConfigToCell(config);
        const init = { code, data };
        return new JettonWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    /**
     * Send transfer message to transfer tokens to another user
     */
    async sendTransfer(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        toAddress: Address,
        jettonAmount: bigint,
        responseAddress: Address,
        forwardTonAmount: bigint = 0n,
        forwardPayload?: Cell
    ) {
        const body = beginCell()
            .storeUint(OP_TRANSFER, 32)
            .storeUint(0, 64) // query_id
            .storeCoins(jettonAmount)
            .storeAddress(toAddress)
            .storeAddress(responseAddress)
            .storeBit(false) // no custom payload
            .storeCoins(forwardTonAmount);
        
        if (forwardPayload) {
            body.storeBit(true).storeRef(forwardPayload);
        } else {
            body.storeBit(false);
        }

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body.endCell(),
        });
    }

    /**
     * Send burn message to burn tokens (triggers sell on master)
     */
    async sendBurn(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        jettonAmount: bigint,
        responseAddress: Address
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OP_BURN, 32)
                .storeUint(0, 64) // query_id
                .storeCoins(jettonAmount)
                .storeAddress(responseAddress)
                .endCell(),
        });
    }

    /**
     * Get wallet data (TEP-74 standard)
     */
    async getWalletData(provider: ContractProvider): Promise<WalletData> {
        const result = await provider.get('get_wallet_data', []);
        
        return {
            balance: result.stack.readBigNumber(),
            ownerAddress: result.stack.readAddress(),
            jettonMasterAddress: result.stack.readAddress(),
            jettonWalletCode: result.stack.readCell(),
        };
    }
}
