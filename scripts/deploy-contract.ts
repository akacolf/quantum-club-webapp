/**
 * Deploy the Fee Router contract to TON blockchain
 * 
 * Usage:
 *   TESTNET: npx ts-node scripts/deploy-contract.ts testnet
 *   MAINNET: npx ts-node scripts/deploy-contract.ts mainnet
 * 
 * Before running:
 * 1. Compile the contract: npx ts-node scripts/compile-contract.ts
 * 2. Set your deployer mnemonic in .env as DEPLOYER_MNEMONIC
 * 3. Make sure the deployer wallet has enough TON for deployment (~0.5 TON)
 */

import { Cell, Address, beginCell, toNano, contractAddress } from "@ton/core";
import { TonClient, WalletContractV4 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Treasury address (quantumclub.ton) - will be the contract owner
const TREASURY_ADDRESS = "UQBUSXMd54HOJlmmh4TsuMvIcwB91kkIlz6HTgj62dN43S3U";
// Fee in basis points (50 = 0.5%)
const INITIAL_FEE_BPS = 50;

interface NetworkConfig {
  endpoint: string;
  apiKey?: string;
}

const networks: Record<string, NetworkConfig> = {
  testnet: {
    endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
  },
  mainnet: {
    endpoint: "https://toncenter.com/api/v2/jsonRPC",
  },
};

function createInitData(ownerAddress: Address, feeBps: number): Cell {
  return beginCell()
    .storeAddress(ownerAddress)
    .storeUint(feeBps, 16)
    .storeUint(0, 128) // total_fees_collected = 0
    .endCell();
}

async function main() {
  const network = process.argv[2] || "testnet";
  
  if (!networks[network]) {
    console.error(`Invalid network: ${network}. Use 'testnet' or 'mainnet'`);
    process.exit(1);
  }

  console.log(`\n🚀 Deploying Fee Router to ${network.toUpperCase()}...\n`);

  // Load compiled contract
  const compiledPath = path.join(__dirname, "../build/fee-router.compiled.json");
  if (!fs.existsSync(compiledPath)) {
    console.error("❌ Compiled contract not found. Run 'npx ts-node scripts/compile-contract.ts' first.");
    process.exit(1);
  }

  const compiled = JSON.parse(fs.readFileSync(compiledPath, "utf-8"));
  const code = Cell.fromBoc(Buffer.from(compiled.hex, "hex"))[0];

  // Get deployer mnemonic from environment
  const mnemonic = process.env.DEPLOYER_MNEMONIC;
  if (!mnemonic) {
    console.error("❌ DEPLOYER_MNEMONIC not set in .env file");
    console.log("\nTo deploy, add this to your .env file:");
    console.log("DEPLOYER_MNEMONIC=word1 word2 word3 ... word24\n");
    
    // Still show what the contract address would be
    const ownerAddress = Address.parse(TREASURY_ADDRESS);
    const initData = createInitData(ownerAddress, INITIAL_FEE_BPS);
    const addr = contractAddress(0, { code, data: initData });
    
    console.log("📋 Contract address (once deployed):");
    console.log(`   ${addr.toString({ bounceable: true })}\n`);
    process.exit(1);
  }

  // Create client
  const client = new TonClient({
    endpoint: networks[network].endpoint,
  });

  // Create deployer wallet
  const keyPair = await mnemonicToPrivateKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });

  const walletContract = client.open(wallet);
  const walletAddress = wallet.address.toString();

  console.log(`📬 Deployer wallet: ${walletAddress}`);

  // Check wallet balance
  const balance = await walletContract.getBalance();
  console.log(`💰 Wallet balance: ${Number(balance) / 1e9} TON`);

  if (balance < toNano("0.1")) {
    console.error("❌ Insufficient balance. Need at least 0.1 TON for deployment.");
    process.exit(1);
  }

  // Create contract init data
  const ownerAddress = Address.parse(TREASURY_ADDRESS);
  const initData = createInitData(ownerAddress, INITIAL_FEE_BPS);

  // Calculate contract address
  const contractAddr = contractAddress(0, { code, data: initData });

  console.log(`\n📋 Contract details:`);
  console.log(`   Owner: ${TREASURY_ADDRESS}`);
  console.log(`   Fee: ${INITIAL_FEE_BPS / 100}%`);
  console.log(`   Address: ${contractAddr.toString({ bounceable: true })}`);

  // Check if already deployed
  const existingContract = await client.getContractState(contractAddr);
  if (existingContract.state === "active") {
    console.log("\n⚠️  Contract already deployed at this address!");
    process.exit(0);
  }

  // Deploy
  console.log("\n⏳ Sending deployment transaction...");

  const seqno = await walletContract.getSeqno();

  // Build the deployment message using internal()
  const { internal } = await import("@ton/ton");
  
  await walletContract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: contractAddr,
        value: toNano("0.05"),
        init: { code, data: initData },
        body: beginCell().endCell(),
        bounce: false,
      }),
    ],
  });

  // Wait for deployment
  console.log("⏳ Waiting for confirmation...");
  
  let attempts = 0;
  while (attempts < 30) {
    await new Promise((r) => setTimeout(r, 2000));
    const state = await client.getContractState(contractAddr);
    if (state.state === "active") {
      console.log("\n✅ Contract deployed successfully!");
      console.log(`\n📋 Contract Address:`);
      console.log(`   Bounceable: ${contractAddr.toString({ bounceable: true })}`);
      console.log(`   Non-bounceable: ${contractAddr.toString({ bounceable: false })}`);
      console.log(`   Raw: ${contractAddr.toRawString()}`);
      
      console.log(`\n📝 Next steps:`);
      console.log(`   1. Update lib/treasuryConfig.ts with the contract address`);
      console.log(`   2. Test the contract on ${network} before going live\n`);
      
      // Save deployment info
      const deploymentInfo = {
        network,
        address: contractAddr.toString({ bounceable: true }),
        addressRaw: contractAddr.toRawString(),
        owner: TREASURY_ADDRESS,
        feeBps: INITIAL_FEE_BPS,
        deployedAt: new Date().toISOString(),
        codeHash: code.hash().toString("hex"),
      };
      
      fs.writeFileSync(
        path.join(__dirname, `../build/deployment-${network}.json`),
        JSON.stringify(deploymentInfo, null, 2)
      );
      
      return;
    }
    attempts++;
    process.stdout.write(".");
  }

  console.log("\n⚠️  Deployment transaction sent but contract not yet active.");
  console.log(`   Check the contract at: ${contractAddr.toString({ bounceable: true })}`);
}

main().catch(console.error);
