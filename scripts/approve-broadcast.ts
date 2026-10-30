/**
 * QC Broadcasts — approval script.
 *
 * Promotes a pending verificationRequests doc into a live verified broadcast
 * (or creates one directly from CLI flags), provisioning:
 *   - broadcasts/{broadcastId}                  (main doc, verified:true)
 *   - broadcasts/{broadcastId}/admins/{qcId}    (owner)
 *   - broadcastHandles/{handle}                 (handle → id lookup)
 *   - verificationRequests/{requestId}          (status: "approved")   [if approving]
 *
 * Usage (tsx auto-loads .env.local via Node's --env-file flag):
 *   # Approve a pending request by id
 *   npx tsx --env-file=.env.local scripts/approve-broadcast.ts --request <requestId>
 *
 *   # Create directly (for team-owned broadcasts with no request)
 *   npx tsx --env-file=.env.local scripts/approve-broadcast.ts \
 *     --owner <qcId> \
 *     --handle <handle> \
 *     --name "Display Name" \
 *     [--bio "Short bio"] \
 *     [--avatar "https://..."] \
 *     [--cover "https://..."]
 *
 *   # Dry run (no writes)
 *   npx tsx --env-file=.env.local scripts/approve-broadcast.ts --request <id> --dry-run
 *
 * Requires FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL in the environment
 * (same vars the server uses).
 */

import admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

interface Args {
  request?: string;
  owner?: string;
  handle?: string;
  name?: string;
  bio?: string;
  avatar?: string;
  cover?: string;
  dryRun: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    const value = argv[i + 1];
    if (!value) continue;
    switch (key) {
      case "--request":
        args.request = value;
        i++;
        break;
      case "--owner":
        args.owner = value;
        i++;
        break;
      case "--handle":
        args.handle = value.toLowerCase();
        i++;
        break;
      case "--name":
        args.name = value;
        i++;
        break;
      case "--bio":
        args.bio = value;
        i++;
        break;
      case "--avatar":
        args.avatar = value;
        i++;
        break;
      case "--cover":
        args.cover = value;
        i++;
        break;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------

function initFirebase() {
  if (admin.apps.length > 0) return admin.firestore();

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!privateKey) {
    throw new Error("Missing FIREBASE_PRIVATE_KEY in environment");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });

  return admin.firestore();
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const HANDLE_REGEX = /^[a-z0-9][a-z0-9_]*[a-z0-9]$/;

function assertHandle(handle: string) {
  if (handle.length < 3 || handle.length > 24) {
    throw new Error(
      `Handle must be 3–24 characters, got ${handle.length}: "${handle}"`,
    );
  }
  if (!HANDLE_REGEX.test(handle)) {
    throw new Error(
      `Handle must match ${HANDLE_REGEX}: "${handle}" is invalid`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs();
  const db = initFirebase();

  let owner: string;
  let handle: string;
  let name: string;
  let bio = "";
  let avatar: string | null = null;
  let cover: string | null = null;
  let requestRef: FirebaseFirestore.DocumentReference | null = null;

  if (args.request) {
    requestRef = db.collection("verificationRequests").doc(args.request);
    const snap = await requestRef.get();
    if (!snap.exists) {
      throw new Error(`verificationRequests/${args.request} not found`);
    }
    const data = snap.data()!;
    if (data.status !== "pending") {
      throw new Error(
        `Request is not pending (status=${data.status}). Aborting.`,
      );
    }
    owner = data.requesterQcId;
    handle = (data.proposedHandle as string).toLowerCase();
    name = data.proposedName;
    bio = data.bio ?? "";
    console.log(`[approve] Using request ${args.request}`);
  } else {
    if (!args.owner || !args.handle || !args.name) {
      throw new Error(
        "Direct mode requires --owner, --handle, and --name (or use --request)",
      );
    }
    owner = args.owner;
    handle = args.handle;
    name = args.name;
    bio = args.bio ?? "";
    avatar = args.avatar ?? null;
    cover = args.cover ?? null;
  }

  if (args.avatar) avatar = args.avatar;
  if (args.cover) cover = args.cover;

  assertHandle(handle);

  // Handle must be unique
  const handleRef = db.collection("broadcastHandles").doc(handle);
  const handleSnap = await handleRef.get();
  if (handleSnap.exists) {
    throw new Error(
      `Handle "${handle}" is already taken by broadcast ${handleSnap.data()?.broadcastId}`,
    );
  }

  const broadcastRef = db.collection("broadcasts").doc();
  const broadcastId = broadcastRef.id;

  const summary = {
    broadcastId,
    handle,
    name,
    owner,
    bio,
    avatar,
    cover,
    sourceRequest: args.request ?? null,
  };

  console.log("[approve] Plan:");
  console.log(JSON.stringify(summary, null, 2));

  if (args.dryRun) {
    console.log("[approve] --dry-run set. No writes performed.");
    return;
  }

  const batch = db.batch();

  batch.set(broadcastRef, {
    handle,
    name,
    bio,
    avatar,
    coverImage: cover,
    verified: true,
    createdAt: FieldValue.serverTimestamp(),
    subscriberCount: 0,
    postCount: 0,
  });

  batch.set(broadcastRef.collection("admins").doc(owner), {
    role: "owner",
    addedAt: FieldValue.serverTimestamp(),
    addedBy: "system",
  });

  batch.set(handleRef, {
    broadcastId,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (requestRef) {
    batch.update(requestRef, {
      status: "approved",
      approvedAt: FieldValue.serverTimestamp(),
      approvedBroadcastId: broadcastId,
    });
  }

  await batch.commit();
  console.log(
    `[approve] Created broadcast ${broadcastId} (@${handle}) owned by ${owner}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[approve] FAILED:", err?.message ?? err);
    process.exit(1);
  });
