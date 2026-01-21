import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Cell, toNano, Address, fromNano, beginCell } from '@ton/core';
import { JettonMaster, JettonMasterConfig, buildJettonContent, OP_BUY } from '../wrappers/JettonMaster';
import '@ton/test-utils';

describe('JettonMaster', () => {
    let masterCode: Cell;
    let walletCode: Cell;

    beforeAll(async () => {
        const fs = await import('fs');
        const path = await import('path');
        
        const masterBocPath = path.join(__dirname, '../build/jetton_master.boc');
        const walletBocPath = path.join(__dirname, '../build/jetton_wallet.boc');
        
        if (!fs.existsSync(masterBocPath)) {
            throw new Error('JettonMaster contract not compiled. Run compile script first.');
        }
        if (!fs.existsSync(walletBocPath)) {
            throw new Error('JettonWallet contract not compiled. Run compile script first.');
        }
        
        masterCode = Cell.fromBoc(fs.readFileSync(masterBocPath))[0];
        walletCode = Cell.fromBoc(fs.readFileSync(walletBocPath))[0];
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;
    let creator: SandboxContract<TreasuryContract>;
    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let jettonMaster: SandboxContract<JettonMaster>;

    // Test configuration
    const GRADUATION_TARGET = toNano('100'); // 100 TON to graduate

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        admin = await blockchain.treasury('admin');
        creator = await blockchain.treasury('creator');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');

        // Create jetton content
        const jettonContent = buildJettonContent(
            'Test Token',
            'TEST',
            'A test token for Blueprint testing',
            'https://example.com/icon.png'
        );

        const config: JettonMasterConfig = {
            totalSupply: 0n,
            mintable: true,
            adminAddress: admin.address,
            creatorAddress: creator.address,
            jettonContent: jettonContent,
            jettonWalletCode: walletCode,
            tonReserve: 0n,
            graduated: false,
            graduationTarget: GRADUATION_TARGET,
        };

        jettonMaster = blockchain.openContract(JettonMaster.createFromConfig(config, masterCode));

        const deployResult = await jettonMaster.sendDeploy(deployer.getSender(), toNano('0.1'));
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: jettonMaster.address,
            deploy: true,
            success: true,
        });
    });

    describe('Deployment', () => {
        it('should deploy successfully', async () => {
            const jettonData = await jettonMaster.getJettonData();
            expect(jettonData.totalSupply).toBe(0n);
            expect(jettonData.mintable).toBe(true);
        });

        it('should have correct initial curve data', async () => {
            const curveData = await jettonMaster.getCurveData();
            expect(curveData.totalSupply).toBe(0n);
            expect(curveData.tonReserve).toBe(0n);
            expect(curveData.graduated).toBe(false);
            expect(curveData.graduationTarget).toBe(GRADUATION_TARGET);
        });

        it('should return creator address correctly', async () => {
            const jettonData = await jettonMaster.getJettonData();
            // Note: get_jetton_data returns creator_address, not admin_address (matches TEP-74 owner concept)
            expect(jettonData.adminAddress.equals(creator.address)).toBe(true);
        });
    });

    describe('Buy Tokens', () => {
        it('should allow users to buy tokens with TON', async () => {
            const buyAmount = toNano('10'); // 10 TON
            
            const buyResult = await jettonMaster.sendBuy(
                user1.getSender(),
                buyAmount,
                0n // no slippage protection
            );

            expect(buyResult.transactions).toHaveTransaction({
                from: user1.address,
                to: jettonMaster.address,
                success: true,
            });

            // Check supply increased
            const curveData = await jettonMaster.getCurveData();
            expect(curveData.totalSupply).toBeGreaterThan(0n);
            expect(curveData.tonReserve).toBeGreaterThan(0n);
        });

        it('should reject buy with zero value', async () => {
            const buyResult = await jettonMaster.sendBuy(
                user1.getSender(),
                toNano('0.01'), // Too small after gas
                0n
            );

            expect(buyResult.transactions).toHaveTransaction({
                from: user1.address,
                to: jettonMaster.address,
                success: false,
            });
        });

        it('should increase supply with each buy', async () => {
            // First buy
            await jettonMaster.sendBuy(user1.getSender(), toNano('5'), 0n);
            const firstCurve = await jettonMaster.getCurveData();
            
            // Second buy
            await jettonMaster.sendBuy(user2.getSender(), toNano('5'), 0n);
            const secondCurve = await jettonMaster.getCurveData();
            
            expect(secondCurve.totalSupply).toBeGreaterThan(firstCurve.totalSupply);
            expect(secondCurve.tonReserve).toBeGreaterThan(firstCurve.tonReserve);
        });
    });

    describe('Preview Functions', () => {
        it('should have working curve data getter', async () => {
            const curveData = await jettonMaster.getCurveData();
            expect(curveData.totalSupply).toBe(0n);
            expect(curveData.currentPrice).toBeGreaterThanOrEqual(0n);
        });

        it('should track reserves correctly after buying', async () => {
            // Buy some tokens first
            await jettonMaster.sendBuy(user1.getSender(), toNano('10'), 0n);
            const curveData = await jettonMaster.getCurveData();
            
            // Total supply and reserve should increase
            expect(curveData.totalSupply).toBeGreaterThan(0n);
            expect(curveData.tonReserve).toBeGreaterThan(0n);
            expect(curveData.currentPrice).toBeGreaterThan(0n);
        });
    });

    describe('Wallet Address', () => {
        it('should return deterministic wallet addresses', async () => {
            const wallet1 = await jettonMaster.getWalletAddress(user1.address);
            const wallet2 = await jettonMaster.getWalletAddress(user1.address);
            
            expect(wallet1.equals(wallet2)).toBe(true);
        });

        it('should return different wallets for different users', async () => {
            const wallet1 = await jettonMaster.getWalletAddress(user1.address);
            const wallet2 = await jettonMaster.getWalletAddress(user2.address);
            
            expect(wallet1.equals(wallet2)).toBe(false);
        });
    });

    describe('Graduation', () => {
        it('should not graduate before threshold', async () => {
            // Buy less than graduation target
            await jettonMaster.sendBuy(user1.getSender(), toNano('50'), 0n);
            
            const curveData = await jettonMaster.getCurveData();
            expect(curveData.graduated).toBe(false);
        });

        it('should reject non-admin graduation', async () => {
            // Fill up to graduation
            await jettonMaster.sendBuy(user1.getSender(), GRADUATION_TARGET + toNano('10'), 0n);
            
            // Non-admin tries to graduate
            const dexRouter = await blockchain.treasury('dex');
            const result = await jettonMaster.sendGraduate(
                user1.getSender(), // Not admin
                toNano('0.1'),
                dexRouter.address
            );

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: jettonMaster.address,
                success: false,
            });
        });
    });

    describe('Bonding Curve', () => {
        it('should increase price with more tokens bought', async () => {
            // Get initial price
            const initialCurve = await jettonMaster.getCurveData();
            const initialPrice = initialCurve.currentPrice;
            
            // Buy some tokens to increase supply
            await jettonMaster.sendBuy(user1.getSender(), toNano('50'), 0n);
            
            // Get new price (should be higher)
            const laterCurve = await jettonMaster.getCurveData();
            
            // Price should increase with supply
            expect(laterCurve.currentPrice).toBeGreaterThan(initialPrice);
        });

        it('should maintain consistent reserve after multiple trades', async () => {
            // Multiple buys
            await jettonMaster.sendBuy(user1.getSender(), toNano('10'), 0n);
            await jettonMaster.sendBuy(user2.getSender(), toNano('15'), 0n);
            await jettonMaster.sendBuy(user1.getSender(), toNano('5'), 0n);
            
            const curveData = await jettonMaster.getCurveData();
            
            // Reserve should be positive
            expect(curveData.tonReserve).toBeGreaterThan(0n);
            // Total supply should be positive
            expect(curveData.totalSupply).toBeGreaterThan(0n);
        });
    });

    describe('Gas Usage', () => {
        it('should track gas costs for buy transaction', async () => {
            const buyAmount = toNano('10');
            
            const result = await jettonMaster.sendBuy(
                user1.getSender(),
                buyAmount,
                0n
            );

            console.log('\n=== Jetton Buy Transaction Gas Report ===');
            printTransactionFees(result.transactions);

            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: jettonMaster.address,
                success: true,
                op: OP_BUY, // 0xaf750d34
            });
        });

        it('should have reasonable gas for deployment', async () => {
            const jettonContent = buildJettonContent('Gas Test', 'GAS', '', '');
            const config: JettonMasterConfig = {
                totalSupply: 0n,
                mintable: true,
                adminAddress: admin.address,
                creatorAddress: creator.address,
                jettonContent: jettonContent,
                jettonWalletCode: walletCode,
                tonReserve: 0n,
                graduated: false,
                graduationTarget: GRADUATION_TARGET,
            };

            const newJetton = blockchain.openContract(
                JettonMaster.createFromConfig(config, masterCode)
            );

            const deployResult = await newJetton.sendDeploy(deployer.getSender(), toNano('0.1'));

            console.log('\n=== Jetton Master Deployment Gas Report ===');
            printTransactionFees(deployResult.transactions);

            expect(deployResult.transactions).toHaveTransaction({
                from: deployer.address,
                to: newJetton.address,
                deploy: true,
                success: true,
            });

            // Check deployment doesn't exceed reasonable gas
            const deployTx = deployResult.transactions.find(
                tx => tx.description.type === 'generic' && 
                      tx.description.computePhase?.type === 'vm'
            );
            
            if (deployTx?.description.type === 'generic' && 
                deployTx.description.computePhase?.type === 'vm') {
                const gasUsed = deployTx.description.computePhase.gasUsed;
                console.log(`Deployment gas used: ${gasUsed}`);
                expect(gasUsed).toBeLessThan(10000000n); // 10M gas limit
            }
        });
    });

    describe('Transaction Validation', () => {
        it('should process buy with correct op-code', async () => {
            const result = await jettonMaster.sendBuy(
                user1.getSender(),
                toNano('5'),
                0n
            );

            // Verify buy transaction has correct op-code
            expect(result.transactions).toHaveTransaction({
                from: user1.address,
                to: jettonMaster.address,
                success: true,
                op: OP_BUY,
            });
            
            // Should have outgoing messages (fee payment, mint)
            const jettonTx = result.transactions.find(
                tx => {
                    const dest = tx.inMessage?.info.dest;
                    return dest && 'equals' in dest && dest.equals(jettonMaster.address);
                }
            );
            
            if (jettonTx) {
                expect(jettonTx.outMessagesCount).toBeGreaterThan(0);
            }
        });
    });
});
