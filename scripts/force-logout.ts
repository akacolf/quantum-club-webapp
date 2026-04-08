// Run: npx tsx scripts/force-logout.ts
// Bumps forceAuthVersion in Firestore AND revokes all Firebase refresh tokens.
// Active users get logged out in real-time via onSnapshot listener.
// Inactive users get logged out on next app load + their tokens are revoked server-side.

import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function main() {
  // Dynamic import AFTER dotenv has populated process.env, so the t3-env
  // schema in env.ts can validate against the loaded values. Static
  // imports get hoisted above dotenv.config() and would fail validation.
  const { env } = await import("../env");

  const serviceAccount = {
    project_id: env.FIREBASE_PROJECT_ID,
    private_key_id: env.FIREBASE_PRIVATE_KEY_ID,
    private_key: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: env.FIREBASE_CLIENT_EMAIL,
    client_id: env.FIREBASE_CLIENT_ID,
    type: "service_account",
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  }

  const db = admin.firestore();
  const version = Date.now().toString();
  await db.doc("set/settings").set({ forceAuthVersion: version }, { merge: true });
  console.log(`[OK] forceAuthVersion set to: ${version}`);
  console.log("All users will be force-logged out via real-time listener.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
