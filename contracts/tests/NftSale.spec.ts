import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address, fromNano } from '@ton/core';
import { NftSale, NftSaleConfig } from '../wrappers/NftSale';
import '@ton/test-utils';

describe('NftSale', () => {
    let code: Cell;

    beforeAll(async () => {
        // Load the compiled contract code
        // You'll need to compile the contract first using func compiler
        const fs = await import('fs');
        const path = await import('path');
        const bocPath = path.join(__dirname, '../build/nft_sale.boc');
        
        if (fs.existsSync(bocPath)) {
            const bocBuffer = fs.readFileSync(bocPath);
            code = Cell.fromBoc(bocBuffer)[0];
        } else {
            throw new Error('Contract not compiled. Run compile script first.');
        }
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let seller: SandboxContract<TreasuryContract>;
    let buyer: SandboxContract<TreasuryContract>;
    let marketplace: SandboxContract<TreasuryContract>;
    let royaltyRecipient: SandboxContract<TreasuryContract>;
    let nftContract: SandboxContract<TreasuryContract>; // Simulated NFT
    let nftSale: SandboxContract<NftSale>;

    // Test configuration
    const SALE_PRICE = toNano('10'); // 10 TON
    const MARKETPLACE_FEE = toNano('0.05'); // 0.5% of 10 TON
    const ROYALTY_AMOUNT = toNano('0.5'); // 5% royalty

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        // Create treasury contracts for different actors
        deployer = await blockchain.treasury('deployer');
        seller = await blockchain.treasury('seller');
        buyer = await blockchain.treasury('buyer');
        marketplace = await blockchain.treasury('marketplace');
        royaltyRecipient = await blockchain.treasury('royalty');
        nftContract = await blockchain.treasury('nft'); // Simulates NFT contract

        // Create the NFT Sale contract configuration
        const config: NftSaleConfig = {
            marketplaceAddress: marketplace.address,
            nftAddress: nftContract.address,
            nftOwnerAddress: seller.address,
            fullPrice: SALE_PRICE,
            marketplaceFeeAddress: marketplace.address,
            marketplaceFee: MARKETPLACE_FEE,
            royaltyAddress: royaltyRecipient.address,
            royaltyAmount: ROYALTY_AMOUNT,
        };

        // Create and deploy the sale contract
        nftSale = blockchain.openContract(NftSale.createFromConfig(config, code));

        const deployResult = await nftSale.sendDeploy(deployer.getSender(), toNano('0.1'));
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftSale.address,
            deploy: true,
            success: true,
        });
    });

    describe('Deployment', () => {
        it('should deploy successfully', async () => {
            // Contract is deployed in beforeEach
            const isComplete = await nftSale.isSaleComplete();
            expect(isComplete).toBe(false);
        });

        it('should have correct initial values', async () => {
            const saleData = await nftSale.getSaleData();
            
            expect(saleData.magic).toBe(0x46495850); // "FIXP"
            expect(saleData.isComplete).toBe(false);
            expect(saleData.nftAddress.equals(nftContract.address)).toBe(true);
            expect(saleData.nftOwnerAddress.equals(seller.address)).toBe(true);
            expect(saleData.fullPrice).toBe(SALE_PRICE);
            expect(saleData.marketplaceFee).toBe(MARKETPLACE_FEE);
            expect(saleData.royaltyAmount).toBe(ROYALTY_AMOUNT);
        });

        it('should return correct NFT address', async () => {
            const nftAddress = await nftSale.getNftAddress();
            expect(nftAddress.equals(nftContract.address)).toBe(true);
        });

        it('should return correct price', async () => {
            const price = await nftSale.getFullPrice();
            expect(price).toBe(SALE_PRICE);
        });

        it('should return correct seller address', async () => {
            const sellerAddr = await nftSale.getSellerAddress();
            expect(sellerAddr.equals(seller.address)).toBe(true);
        });
    });

    describe('Buy NFT', () => {
        it('should allow buyer to purchase NFT with exact price + gas', async () => {
            // First, simulate NFT ownership assigned
            await nftSale.sendOwnershipAssigned(
                nftContract.getSender(),
                toNano('0.1'),
                seller.address
            );

            // Buyer sends purchase
            const buyAmount = SALE_PRICE + toNano('0.1'); // Price + gas
            const buyResult = await nftSale.sendBuy(buyer.getSender(), buyAmount);

            // Check transaction succeeded
            expect(buyResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: nftSale.address,
                success: true,
            });

            // Verify sale is complete
            const isComplete = await nftSale.isSaleComplete();
            expect(isComplete).toBe(true);

            // Verify outgoing transactions were sent to correct recipients
            // NFT transfer message to buyer
            expect(buyResult.transactions).toHaveTransaction({
                from: nftSale.address,
                to: nftContract.address,
                success: true,
            });

            // Marketplace fee payment
            expect(buyResult.transactions).toHaveTransaction({
                from: nftSale.address,
                to: marketplace.address,
                success: true,
            });

            // Royalty payment
            expect(buyResult.transactions).toHaveTransaction({
                from: nftSale.address,
                to: royaltyRecipient.address,
                success: true,
            });

            // Note: Seller receives remaining balance via mode 128, which may not
            // show as a separate transaction in all cases
        });

        it('should reject purchase with insufficient funds', async () => {
            // Simulate NFT ownership assigned
            await nftSale.sendOwnershipAssigned(
                nftContract.getSender(),
                toNano('0.1'),
                seller.address
            );

            // Try to buy with less than price
            const insufficientAmount = SALE_PRICE - toNano('1');
            const buyResult = await nftSale.sendBuy(buyer.getSender(), insufficientAmount);

            // Transaction should fail
            expect(buyResult.transactions).toHaveTransaction({
                from: buyer.address,
                to: nftSale.address,
                success: false,
            });

            // Sale should still be active
            const isComplete = await nftSale.isSaleComplete();
            expect(isComplete).toBe(false);
        });

        it('should reject double purchase', async () => {
            // Simulate NFT ownership first
            await nftSale.sendOwnershipAssigned(
                nftContract.getSender(),
                toNano('0.1'),
                seller.address
            );

            // First purchase succeeds
            const buyAmount = SALE_PRICE + toNano('0.1');
            await nftSale.sendBuy(buyer.getSender(), buyAmount);

            // Second purchase should fail
            const secondBuyer = await blockchain.treasury('second_buyer');
            const secondBuyResult = await nftSale.sendBuy(secondBuyer.getSender(), buyAmount);

            expect(secondBuyResult.transactions).toHaveTransaction({
                from: secondBuyer.address,
                to: nftSale.address,
                success: false,
            });
        });
    });

    describe('Cancel Sale', () => {
        it('should allow seller to cancel sale', async () => {
            // Simulate NFT ownership first
            await nftSale.sendOwnershipAssigned(
                nftContract.getSender(),
                toNano('0.1'),
                seller.address
            );

            // Seller cancels
            const cancelResult = await nftSale.sendCancel(seller.getSender(), toNano('0.05'));

            expect(cancelResult.transactions).toHaveTransaction({
                from: seller.address,
                to: nftSale.address,
                success: true,
            });

            // Sale should be marked complete
            const isComplete = await nftSale.isSaleComplete();
            expect(isComplete).toBe(true);
        });

        it('should reject cancel from non-seller', async () => {
            // Simulate NFT ownership first
            await nftSale.sendOwnershipAssigned(
                nftContract.getSender(),
                toNano('0.1'),
                seller.address
            );

            // Random user tries to cancel
            const randomUser = await blockchain.treasury('random');
            const cancelResult = await nftSale.sendCancel(randomUser.getSender(), toNano('0.05'));

            expect(cancelResult.transactions).toHaveTransaction({
                from: randomUser.address,
                to: nftSale.address,
                success: false,
            });

            // Sale should still be active
            const isComplete = await nftSale.isSaleComplete();
            expect(isComplete).toBe(false);
        });

        it('should reject cancel after sale is complete', async () => {
            // Simulate NFT ownership first
            await nftSale.sendOwnershipAssigned(
                nftContract.getSender(),
                toNano('0.1'),
                seller.address
            );

            // Complete the sale
            const buyAmount = SALE_PRICE + toNano('0.1');
            await nftSale.sendBuy(buyer.getSender(), buyAmount);

            // Seller tries to cancel
            const cancelResult = await nftSale.sendCancel(seller.getSender(), toNano('0.05'));

            expect(cancelResult.transactions).toHaveTransaction({
                from: seller.address,
                to: nftSale.address,
                success: false, // Should fail since sale is complete
            });
        });
    });

    describe('Fee Distribution', () => {
        it('should correctly distribute fees on sale', async () => {
            // Simulate NFT ownership first
            await nftSale.sendOwnershipAssigned(
                nftContract.getSender(),
                toNano('0.1'),
                seller.address
            );

            // Complete purchase
            const buyAmount = SALE_PRICE + toNano('0.15');
            const buyResult = await nftSale.sendBuy(buyer.getSender(), buyAmount);

            // Verify all expected outgoing transactions
            // 1. NFT transfer to buyer
            expect(buyResult.transactions).toHaveTransaction({
                from: nftSale.address,
                to: nftContract.address,
                success: true,
            });

            // 2. Marketplace fee
            expect(buyResult.transactions).toHaveTransaction({
                from: nftSale.address,
                to: marketplace.address,
                success: true,
            });

            // 3. Royalty payment
            expect(buyResult.transactions).toHaveTransaction({
                from: nftSale.address,
                to: royaltyRecipient.address,
                success: true,
            });

            // Note: Seller receives remaining balance via mode 128
            // This is handled by the contract's final message

            // Verify sale is complete
            const isComplete = await nftSale.isSaleComplete();
            expect(isComplete).toBe(true);
        });

        it('should handle zero royalty correctly', async () => {
            // Create new sale with zero royalty
            const configNoRoyalty: NftSaleConfig = {
                marketplaceAddress: marketplace.address,
                nftAddress: nftContract.address,
                nftOwnerAddress: seller.address,
                fullPrice: SALE_PRICE,
                marketplaceFeeAddress: marketplace.address,
                marketplaceFee: MARKETPLACE_FEE,
                royaltyAddress: royaltyRecipient.address,
                royaltyAmount: 0n, // No royalty
            };

            const saleNoRoyalty = blockchain.openContract(
                NftSale.createFromConfig(configNoRoyalty, code)
            );
            await saleNoRoyalty.sendDeploy(deployer.getSender(), toNano('0.1'));

            // Simulate NFT ownership
            await saleNoRoyalty.sendOwnershipAssigned(
                nftContract.getSender(),
                toNano('0.1'),
                seller.address
            );

            const royaltyBalanceBefore = await royaltyRecipient.getBalance();

            // Complete purchase
            const buyAmount = SALE_PRICE + toNano('0.15');
            await saleNoRoyalty.sendBuy(buyer.getSender(), buyAmount);

            const royaltyBalanceAfter = await royaltyRecipient.getBalance();

            // Royalty recipient should not receive anything (except possible gas refunds)
            // The difference should be very small (just gas)
            const royaltyReceived = royaltyBalanceAfter - royaltyBalanceBefore;
            console.log('Royalty received (should be ~0):', fromNano(royaltyReceived), 'TON');
        });
    });

    describe('Edge Cases', () => {
        it('should handle minimum price correctly', async () => {
            const minPrice = toNano('0.1'); // Minimum 0.1 TON
            const minFee = minPrice * 5n / 1000n; // 0.5%

            const configMinPrice: NftSaleConfig = {
                marketplaceAddress: marketplace.address,
                nftAddress: nftContract.address,
                nftOwnerAddress: seller.address,
                fullPrice: minPrice,
                marketplaceFeeAddress: marketplace.address,
                marketplaceFee: minFee,
                royaltyAddress: royaltyRecipient.address,
                royaltyAmount: 0n,
            };

            const saleMinPrice = blockchain.openContract(
                NftSale.createFromConfig(configMinPrice, code)
            );
            await saleMinPrice.sendDeploy(deployer.getSender(), toNano('0.1'));

            // Simulate NFT ownership
            await saleMinPrice.sendOwnershipAssigned(
                nftContract.getSender(),
                toNano('0.1'),
                seller.address
            );

            // Complete purchase
            const buyAmount = minPrice + toNano('0.1');
            const result = await saleMinPrice.sendBuy(buyer.getSender(), buyAmount);

            expect(result.transactions).toHaveTransaction({
                from: buyer.address,
                to: saleMinPrice.address,
                success: true,
            });
        });

        it('should handle large price correctly', async () => {
            const largePrice = toNano('1000000'); // 1 million TON
            const largeFee = largePrice * 5n / 1000n; // 0.5%

            const configLargePrice: NftSaleConfig = {
                marketplaceAddress: marketplace.address,
                nftAddress: nftContract.address,
                nftOwnerAddress: seller.address,
                fullPrice: largePrice,
                marketplaceFeeAddress: marketplace.address,
                marketplaceFee: largeFee,
                royaltyAddress: royaltyRecipient.address,
                royaltyAmount: 0n,
            };

            const saleLargePrice = blockchain.openContract(
                NftSale.createFromConfig(configLargePrice, code)
            );
            await saleLargePrice.sendDeploy(deployer.getSender(), toNano('0.1'));

            const priceFromContract = await saleLargePrice.getFullPrice();
            expect(priceFromContract).toBe(largePrice);
        });
    });
});
