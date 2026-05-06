/**
 * QC Social — creator payout processor.
 *
 * Iterates over creatorPayoutRequests/{id} where status == "pending" and
 * sends the requested TON amount from the platform wallet to each creator's
 * destination address. On success, marks the request paid and folds the
 * amount into the creator's `paidOutTon` ledger field.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/process-payouts.ts [--dry-run]
 *
 * Required env:
 *   - FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL  (same as the server)
 *   - PLATFORM_WALLET_MNEMONIC                     (24 words, space-separated)
 *   - NEXT_PUBLIC_TON_NETWORK                      ("mainnet" | "testnet")
 *
 * Run cadence: weekly via cron-job.org, or ad-hoc when a creator pings.
 */

import admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { mnemonicToWalletKey } from "@ton/crypto";
import {
  Address,
  TonClient,
  WalletContractV5R1,
  internal,
  toNano,
} from "@ton/ton";

interface Args {
  dryRun: boolean;
  limit: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { dryRun: false, limit: 50 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") args.dryRun = true;
    else if (argv[i] === "--limit") args.limit = Number(argv[++i] ?? 50);
  }
  return args;
}

function initAdmin() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

async function main() {
  const args = parseArgs();
  initAdmin();
  const db = admin.firestore();

  const mnemonic = process.env.PLATFORM_WALLET_MNEMONIC;
  if (!mnemonic) throw new Error("PLATFORM_WALLET_MNEMONIC not set");

  const isTestnet = process.env.NEXT_PUBLIC_TON_NETWORK === "testnet";
  const endpoint = isTestnet
    ? "https://testnet.toncenter.com/api/v2/jsonRPC"
    : "https://toncenter.com/api/v2/jsonRPC";

  const key = await mnemonicToWalletKey(mnemonic.split(/\s+/));
  const wallet = WalletContractV5R1.create({
    publicKey: key.publicKey,
    workchain: 0,
  });
  const client = new TonClient({ endpoint });
  const contract = client.open(wallet);
  const sender = wallet.address.toString({ bounceable: false });
  console.log(`[payouts] platform sender: ${sender}`);

  const snap = await db
    .collection("creatorPayoutRequests")
    .where("status", "==", "pending")
    .limit(args.limit)
    .get();

  console.log(`[payouts] ${snap.size} pending request(s)`);

  for (const doc of snap.docs) {
    const data = doc.data();
    const amountTon = data.amountTon as number;
    const destination = data.destination as string;
    const creatorQcId = data.creatorQcId as string;

    console.log(
      `→ ${doc.id}: ${amountTon.toFixed(2)} TON → ${destination} (creator ${creatorQcId})`,
    );
    if (args.dryRun) continue;

    try {
      const seqno = await contract.getSeqno();
      await contract.sendTransfer({
        seqno,
        secretKey: key.secretKey,
        messages: [
          internal({
            to: Address.parse(destination),
            value: toNano(amountTon.toFixed(9)),
            body: `QC Social payout`,
            bounce: false,
          }),
        ],
      });
      // Wait for the seqno to advance — confirms the message went out.
      let attempts = 0;
      while (attempts < 30) {
        const current = await contract.getSeqno();
        if (current > seqno) break;
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;
      }

      await db.runTransaction(async (tx) => {
        tx.update(doc.ref, {
          status: "paid",
          paidAt: FieldValue.serverTimestamp(),
        });
        tx.update(db.doc(`creatorEarnings/${creatorQcId}`), {
          paidOutTon: FieldValue.increment(amountTon),
        });
      });
      console.log(`  ✓ paid`);
    } catch (e) {
      console.error(`  ✗ failed:`, e);
      await doc.ref.update({
        status: "failed",
        errorMessage: e instanceof Error ? e.message : String(e),
      });
    }
  }

  console.log(`[payouts] done`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
