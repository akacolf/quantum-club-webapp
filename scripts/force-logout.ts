// Run: npx tsx scripts/force-logout.ts
// Sets forceAuthVersion in Firestore to log out all users

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

async function main() {
  const version = Date.now().toString();
  await db.doc("set/settings").set({ forceAuthVersion: version }, { merge: true });
  console.log(`✅ forceAuthVersion set to: ${version}`);
  console.log("All users will be logged out on next app load.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
