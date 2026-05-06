import { NextRequest, NextResponse, connection } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { Address, internal, SendMode, beginCell, toNano } from "@ton/core";
import {
  WalletContractV3R2,
  WalletContractV4,
  WalletContractV5R1,
} from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { firestore } from "@/app/(firebase)/server";
import { env } from "@/env";

const CRON_SECRET = env.CRON_SECRET;
/** Cap per run so a backlog can't blow up the request budget. */
const PAYOUTS_PER_RUN = 25;
/** Max time to wait for the seqno bump before recording a tx as in-flight. */
const SEQNO_WAIT_MS = 60_000;
const SEQNO_POLL_INTERVAL_MS = 3_000;

export const maxDuration = 300;

/**
 * Creator payout cron — drains creatorPayoutRequests where status="pending".
 * Sends from the platform wallet, marks the request paid, and folds the
 * amount into the creator's `paidOutTon` ledger field. On send failure the
 * request is flipped to "failed" with an error message so it surfaces in
 * the admin tool; pendingTon stays at 0 since we already deducted at
 * request time (creator can re-request after we manually credit them back).
 */
export async function GET(request: NextRequest) {
  await connection();

  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mnemonic = env.PLATFORM_WALLET_MNEMONIC;
  if (!mnemonic) {
    return NextResponse.json(
      { error: "PLATFORM_WALLET_MNEMONIC not configured" },
      { status: 500 },
    );
  }

  const isTestnet = env.NEXT_PUBLIC_TON_NETWORK === "testnet";
  const keyPair = await mnemonicToPrivateKey(mnemonic.split(/\s+/));
  const version = env.PLATFORM_WALLET_VERSION ?? "v5r1";
  const wallet =
    version === "v4r2"
      ? WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey })
      : version === "v3r2"
        ? WalletContractV3R2.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
          })
        : WalletContractV5R1.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
          });

  const tonApi = new TonApiClient({
    baseUrl: isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io",
    apiKey: env.TONAPI_KEY ?? env.NEXT_PUBLIC_TONAPI_KEY,
  });
  const contract = new ContractAdapter(tonApi).open(wallet);

  const snap = await firestore
    .collection("creatorPayoutRequests")
    .where("status", "==", "pending")
    .limit(PAYOUTS_PER_RUN)
    .get();

  let paid = 0;
  let failed = 0;
  const results: Array<{
    requestId: string;
    creatorQcId: string;
    amountTon: number;
    status: "paid" | "failed";
    error?: string;
  }> = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const amountTon = data.amountTon as number;
    const destination = data.destination as string;
    const creatorQcId = data.creatorQcId as string;

    try {
      const seqnoBefore = await contract.getSeqno();
      await contract.sendTransfer({
        seqno: seqnoBefore,
        secretKey: keyPair.secretKey,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: [
          internal({
            to: Address.parse(destination),
            value: toNano(amountTon.toFixed(9)),
            body: beginCell()
              .storeUint(0, 32)
              .storeStringTail("QC Social payout")
              .endCell(),
            bounce: false,
          }),
        ],
      });

      // Wait for the platform wallet's seqno to advance before moving on.
      // If the network is congested we still mark paid and let the doc carry
      // the txHash field empty — admin can reconcile via the explorer.
      const startedAt = Date.now();
      let confirmed = false;
      while (Date.now() - startedAt < SEQNO_WAIT_MS) {
        await new Promise((r) => setTimeout(r, SEQNO_POLL_INTERVAL_MS));
        const current = await contract.getSeqno();
        if (current > seqnoBefore) {
          confirmed = true;
          break;
        }
      }

      await firestore.runTransaction(async (tx) => {
        tx.update(doc.ref, {
          status: "paid",
          paidAt: FieldValue.serverTimestamp(),
          payoutSeqno: seqnoBefore,
          payoutConfirmed: confirmed,
        });
        tx.update(firestore.doc(`creatorEarnings/${creatorQcId}`), {
          paidOutTon: FieldValue.increment(amountTon),
        });
      });
      paid++;
      results.push({
        requestId: doc.id,
        creatorQcId,
        amountTon,
        status: "paid",
      });
    } catch (err) {
      failed++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(
        `[process-payouts] ${doc.id} → ${destination} failed:`,
        errorMessage,
      );
      await doc.ref.update({
        status: "failed",
        errorMessage,
        failedAt: FieldValue.serverTimestamp(),
      });
      results.push({
        requestId: doc.id,
        creatorQcId,
        amountTon,
        status: "failed",
        error: errorMessage,
      });
    }
  }

  return NextResponse.json({
    success: true,
    candidates: snap.size,
    paid,
    failed,
    results,
  });
}
