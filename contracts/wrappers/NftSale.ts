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
 * NFT Sale Contract Wrapper
 * 
 * Implements the Contract interface from @ton/core for use with Blueprint/Sandbox testing
 */

// Op-codes
export const OP_TRANSFER_NFT = 0x5fcc3d14;
export const OP_OWNERSHIP_ASSIGNED = 0x05138d91;
export const OP_BUY = 1;
export const OP_CANCEL = 0;

export interface NftSaleConfig {
    marketplaceAddress: Address;
    nftAddress: Address;
    nftOwnerAddress: Address;
    fullPrice: bigint;
    marketplaceFeeAddress: Address;
    marketplaceFee: bigint;
    royaltyAddress: Address;
    royaltyAmount: bigint;
}

export interface SaleData {
    magic: number;
    isComplete: boolean;
    createdAt: number;
    marketplaceAddress: Address;
    nftAddress: Address;
    nftOwnerAddress: Address;
    fullPrice: bigint;
    marketplaceFeeAddress: Address;
    marketplaceFee: bigint;
    royaltyAddress: Address;
    royaltyAmount: bigint;
}

export function nftSaleConfigToCell(config: NftSaleConfig): Cell {
    const createdAt = Math.floor(Date.now() / 1000);
    
    // Fees cell (ref)
    const feesCell = beginCell()
        .storeAddress(config.marketplaceFeeAddress)
        .storeCoins(config.marketplaceFee)
        .storeAddress(config.royaltyAddress)
        .storeCoins(config.royaltyAmount)
        .endCell();
    
    // Main data cell
    return beginCell()
        .storeBit(false) // is_complete = false
        .storeUint(createdAt, 32)
        .storeAddress(config.marketplaceAddress)
        .storeAddress(config.nftAddress)
        .storeAddress(config.nftOwnerAddress)
        .storeCoins(config.fullPrice)
        .storeRef(feesCell)
        .storeBit(false) // nft_received = false
        .endCell();
}

export class NftSale implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell }
    ) {}

    static createFromAddress(address: Address) {
        return new NftSale(address);
    }

    static createFromConfig(config: NftSaleConfig, code: Cell, workchain = 0) {
        const data = nftSaleConfigToCell(config);
        const init = { code, data };
        return new NftSale(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    /**
     * Send buy message to purchase the NFT
     */
    async sendBuy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OP_BUY, 32)
                .storeUint(0, 64) // query_id
                .endCell(),
        });
    }

    /**
     * Send cancel message to cancel the sale (seller only)
     */
    async sendCancel(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OP_CANCEL, 32)
                .storeUint(0, 64) // query_id
                .endCell(),
        });
    }

    /**
     * Simulate NFT ownership assigned (when NFT is transferred to sale contract)
     */
    async sendOwnershipAssigned(
        provider: ContractProvider, 
        via: Sender, 
        value: bigint,
        previousOwner: Address
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OP_OWNERSHIP_ASSIGNED, 32)
                .storeUint(0, 64) // query_id
                .storeAddress(previousOwner)
                .endCell(),
        });
    }

    /**
     * Get sale data from contract
     */
    async getSaleData(provider: ContractProvider): Promise<SaleData> {
        const result = await provider.get('get_sale_data', []);
        
        return {
            magic: result.stack.readNumber(),
            isComplete: result.stack.readBoolean(),
            createdAt: result.stack.readNumber(),
            marketplaceAddress: result.stack.readAddress(),
            nftAddress: result.stack.readAddress(),
            nftOwnerAddress: result.stack.readAddress(),
            fullPrice: result.stack.readBigNumber(),
            marketplaceFeeAddress: result.stack.readAddress(),
            marketplaceFee: result.stack.readBigNumber(),
            royaltyAddress: result.stack.readAddress(),
            royaltyAmount: result.stack.readBigNumber(),
        };
    }

    /**
     * Get NFT address
     */
    async getNftAddress(provider: ContractProvider): Promise<Address> {
        const result = await provider.get('get_nft_address', []);
        return result.stack.readAddress();
    }

    /**
     * Get full price
     */
    async getFullPrice(provider: ContractProvider): Promise<bigint> {
        const result = await provider.get('get_full_price', []);
        return result.stack.readBigNumber();
    }

    /**
     * Check if sale is complete
     */
    async isSaleComplete(provider: ContractProvider): Promise<boolean> {
        const result = await provider.get('is_sale_complete', []);
        return result.stack.readBoolean();
    }

    /**
     * Get seller address
     */
    async getSellerAddress(provider: ContractProvider): Promise<Address> {
        const result = await provider.get('get_seller_address', []);
        return result.stack.readAddress();
    }
}
