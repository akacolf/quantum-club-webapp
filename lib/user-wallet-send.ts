/**
 * Send TON from the active user wallet, signed locally with the decrypted
 * mnemonic. Used by QC Pro purchase + per-post unlock flows. The caller is
 * responsible for surfacing a passcode/biometric prompt before invoking.
 */

import { Address, beginCell, internal, SendMode, toNano } from "@ton/core";
import {
  WalletContractV3R2,
  WalletContractV4,
  WalletContractV5R1,
} from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { getSecureMnemonic } from "@/lib/secure-mnemonic";
import { env } from "@/env";

interface SendArgs {
  telegramId: string;
  walletAddress: string;
  recipient: string;
  amountTon: number;
  /** Plain-text comment that the server uses to match the payment */
  memo: string;
  testnet?: boolean;
}

function readWalletVersion(telegramId: string, walletAddress: string): string {
  const sanitized = walletAddress.replace(/[^a-zA-Z0-9_-]/g, "_");
  return (
    localStorage.getItem(`quantum_wallet_version_${telegramId}_${sanitized}`) ||
    localStorage.getItem(`quantum_wallet_version_${telegramId}`) ||
    "v5r1"
  );
}

function createCommentBody(text: string) {
  return beginCell().storeUint(0, 32).storeStringTail(text).endCell();
}

export async function sendTonFromUserWallet(args: SendArgs): Promise<void> {
  const { telegramId, walletAddress, recipient, amountTon, memo } = args;
  const isTestnet = args.testnet ?? env.NEXT_PUBLIC_TON_NETWORK === "testnet";

  const storedMnemonic = await getSecureMnemonic(telegramId, walletAddress);
  if (!storedMnemonic) {
    throw new Error("Wallet credentials not found");
  }

  const keyPair = await mnemonicToPrivateKey(storedMnemonic.split(" "));
  const version = readWalletVersion(telegramId, walletAddress);

  let wallet;
  switch (version) {
    case "v4r2":
      wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      break;
    case "v3r2":
      wallet = WalletContractV3R2.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      break;
    case "v5r1":
    default:
      wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      break;
  }

  if (!Address.parse(walletAddress).equals(wallet.address)) {
    throw new Error(
      "Wallet credentials do not match the selected wallet. Re-import this wallet to send from it.",
    );
  }

  const tonApiClient = new TonApiClient({
    baseUrl: isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io",
    apiKey: env.NEXT_PUBLIC_TONAPI_KEY,
  });
  const adapter = new ContractAdapter(tonApiClient);
  const contract = adapter.open(wallet);

  let seqno = 0;
  try {
    seqno = await contract.getSeqno();
  } catch {
    seqno = 0;
  }

  await contract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
    messages: [
      internal({
        to: Address.parse(recipient),
        value: toNano(amountTon.toFixed(9)),
        body: createCommentBody(memo),
        bounce: false,
      }),
    ],
  });
}
