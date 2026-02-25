import { dbfs } from "@/app/(firebase)/client";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  query,
  where,
  getDocs,
  limit,
  arrayUnion,
  arrayRemove,
  deleteField,
} from "firebase/firestore";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GroupCallDocument {
  chatId: string;
  groupName: string;
  createdBy: string;
  createdAt: Timestamp | null;
  status: "active" | "ended";
  participants: string[];
  participantNames: Record<string, string>;
  maxParticipants: number;
}

export interface GroupCallSignal {
  from: string;
  to: string;
  type: "offer" | "answer" | "ice-candidate";
  data: Record<string, unknown>;
  createdAt: Timestamp | null;
}

const MAX_PARTICIPANTS = 8;

// ── Firestore Operations ────────────────────────────────────────────────────────

export async function createGroupCall(
  chatId: string,
  groupName: string,
  creatorId: string,
  creatorName: string
): Promise<string> {
  const callRef = doc(collection(dbfs, "qc-group-calls"));
  await setDoc(callRef, {
    chatId,
    groupName,
    createdBy: creatorId,
    createdAt: serverTimestamp(),
    status: "active",
    participants: [creatorId],
    participantNames: { [creatorId]: creatorName },
    maxParticipants: MAX_PARTICIPANTS,
  });
  return callRef.id;
}

export async function joinGroupCall(
  callId: string,
  userId: string,
  userName: string
): Promise<boolean> {
  const ref = doc(dbfs, "qc-group-calls", callId);
  try {
    await updateDoc(ref, {
      participants: arrayUnion(userId),
      [`participantNames.${userId}`]: userName,
    });
    return true;
  } catch {
    return false;
  }
}

export async function leaveGroupCall(
  callId: string,
  userId: string
): Promise<void> {
  const ref = doc(dbfs, "qc-group-calls", callId);
  await updateDoc(ref, {
    participants: arrayRemove(userId),
    [`participantNames.${userId}`]: deleteField(),
  }).catch(() => {});
}

export async function endGroupCall(callId: string): Promise<void> {
  const ref = doc(dbfs, "qc-group-calls", callId);
  await updateDoc(ref, { status: "ended" }).catch(() => {});
}

export async function sendSignal(
  callId: string,
  from: string,
  to: string,
  type: GroupCallSignal["type"],
  data: Record<string, unknown>
): Promise<void> {
  const colRef = collection(dbfs, "qc-group-calls", callId, "signals");
  await addDoc(colRef, {
    from,
    to,
    type,
    data,
    createdAt: serverTimestamp(),
  });
}

export function listenToGroupCall(
  callId: string,
  callback: (data: GroupCallDocument) => void
): () => void {
  const ref = doc(dbfs, "qc-group-calls", callId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as GroupCallDocument);
    }
  }, () => {});
}

export function listenToSignals(
  callId: string,
  userId: string,
  callback: (signal: GroupCallSignal) => void
): () => void {
  const colRef = collection(dbfs, "qc-group-calls", callId, "signals");
  const q = query(colRef, where("to", "==", userId));
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        callback(change.doc.data() as GroupCallSignal);
      }
    });
  }, () => {});
}

export async function getActiveGroupCall(
  chatId: string
): Promise<{ id: string; data: GroupCallDocument } | null> {
  const colRef = collection(dbfs, "qc-group-calls");
  const q = query(
    colRef,
    where("chatId", "==", chatId),
    where("status", "==", "active"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, data: snap.docs[0].data() as GroupCallDocument };
}

export function listenToActiveGroupCall(
  chatId: string,
  callback: (call: { id: string; data: GroupCallDocument } | null) => void
): () => void {
  const colRef = collection(dbfs, "qc-group-calls");
  const q = query(
    colRef,
    where("chatId", "==", chatId),
    where("status", "==", "active"),
    limit(1)
  );
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const doc = snapshot.docs[0];
      callback({ id: doc.id, data: doc.data() as GroupCallDocument });
    }
  }, () => {});
}
