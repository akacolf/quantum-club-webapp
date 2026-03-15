// Run: npx tsx scripts/force-logout.ts
// Bumps forceAuthVersion in Firestore AND revokes all Firebase refresh tokens.
// Active users get logged out in real-time via onSnapshot listener.
// Inactive users get logged out on next app load + their tokens are revoked server-side.

import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const serviceAccount = {
  project_id: "nekoq-875e2",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  type: "service_account",
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

const db = admin.firestore();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function revokeAllRefreshTokens() {
  let revokedCount = 0;
  let nextPageToken: string | undefined;
  do {
    const listResult = await admin.auth().listUsers(1000, nextPageToken);
    for (const user of listResult.users) {
      try {
        await admin.auth().revokeRefreshTokens(user.uid);
      } catch (e: any) {
        if (e?.errorInfo?.code === "auth/quota-exceeded") {
          console.log("  Rate limited — waiting 10s...");
          await sleep(10_000);
          await admin.auth().revokeRefreshTokens(user.uid);
        } else {
          throw e;
        }
      }
      revokedCount++;
      if (revokedCount % 100 === 0) {
        console.log(`  Revoked ${revokedCount} tokens...`);
      }
    }
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);
  return revokedCount;
}

async function main() {
  const version = Date.now().toString();

  // 1. Bump Firestore version → triggers real-time logout for active users
  await db.doc("set/settings").set({ forceAuthVersion: version }, { merge: true });
  console.log(`[OK] forceAuthVersion set to: ${version}`);

  // 2. Revoke all Firebase refresh tokens → invalidates server-side sessions
  const revokedCount = await revokeAllRefreshTokens();
  console.log(`[OK] Revoked refresh tokens for ${revokedCount} users`);

  console.log("All users will be force-logged out.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
