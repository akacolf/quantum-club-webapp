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
  limit,
  getDocs,
  getDoc,
} from "firebase/firestore";

// ── Types ──────────────────────────────────────────────────────────────────────

export type CallStatus =
  | "ringing"
  | "connected"
  | "ended"
  | "declined"
  | "missed"
  | "busy";

export type EndReason =
  | "caller_ended"
  | "callee_ended"
  | "timeout"
  | "declined"
  | "busy"
  | "error"
  | null;

export interface CallDocument {
  callerId: string;
  calleeId: string;
  callerName: string;
  calleeName: string;
  chatId: string;
  status: CallStatus;
  createdAt: Timestamp | null;
  answeredAt: Timestamp | null;
  endedAt: Timestamp | null;
  endReason: EndReason;
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
}

export interface ICECandidateData {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
}

export interface CallHistoryData {
  callId: string;
  status: CallStatus;
  duration: number; // seconds
  callerId: string;
  calleeId: string;
}

// ── WebRTC Configuration ───────────────────────────────────────────────────────

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.cloudflare.com:3478" },
];

/** Fetch TURN credentials via server action (keeps API key secret). */
export async function fetchRtcConfig(): Promise<RTCConfiguration> {
  try {
    const { getTurnCredentials } = await import("@/app/ecosystem/chat/actions");
    const result = await getTurnCredentials({});
    if (result?.data) {
      return { iceServers: result.data, iceTransportPolicy: "all" };
    }
  } catch {}
  return { iceServers: FALLBACK_ICE_SERVERS, iceTransportPolicy: "all" };
}

export const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

// ── Firestore Signaling Utilities ──────────────────────────────────────────────

export async function createCallDocument(params: {
  callerId: string;
  calleeId: string;
  callerName: string;
  calleeName: string;
  chatId: string;
  offer: RTCSessionDescriptionInit;
}): Promise<string> {
  const callRef = doc(collection(dbfs, "qc-calls"));
  await setDoc(callRef, {
    callerId: params.callerId,
    calleeId: params.calleeId,
    callerName: params.callerName,
    calleeName: params.calleeName,
    chatId: params.chatId,
    status: "ringing" as CallStatus,
    createdAt: serverTimestamp(),
    answeredAt: null,
    endedAt: null,
    endReason: null,
    offer: { type: params.offer.type, sdp: params.offer.sdp },
    answer: null,
  });
  return callRef.id;
}

export function listenToCallDoc(
  callId: string,
  callback: (data: CallDocument) => void
): () => void {
  const ref = doc(dbfs, "qc-calls", callId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as CallDocument);
    }
  });
}

export function listenToICECandidates(
  callId: string,
  role: "caller" | "callee",
  callback: (candidate: ICECandidateData) => void
): () => void {
  const subCollection = role === "caller" ? "callerCandidates" : "calleeCandidates";
  const colRef = collection(dbfs, "qc-calls", callId, subCollection);
  return onSnapshot(colRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        callback(change.doc.data() as ICECandidateData);
      }
    });
  });
}

export async function addICECandidate(
  callId: string,
  role: "caller" | "callee",
  candidate: RTCIceCandidate
): Promise<void> {
  const subCollection = role === "caller" ? "callerCandidates" : "calleeCandidates";
  const colRef = collection(dbfs, "qc-calls", callId, subCollection);
  await addDoc(colRef, {
    candidate: candidate.candidate,
    sdpMLineIndex: candidate.sdpMLineIndex,
    sdpMid: candidate.sdpMid,
  });
}

export async function updateCallDoc(
  callId: string,
  updates: Partial<CallDocument>
): Promise<void> {
  const ref = doc(dbfs, "qc-calls", callId);
  await updateDoc(ref, updates as Record<string, unknown>);
}

export async function writeCallHistoryMessage(
  chatId: string,
  callData: CallHistoryData,
  senderName: string,
  senderId: string
): Promise<void> {
  const messagesRef = collection(dbfs, "qc-chats", chatId, "messages");
  await addDoc(messagesRef, {
    text: "",
    senderId,
    senderName,
    createdAt: serverTimestamp(),
    type: "call",
    call: {
      callId: callData.callId,
      status: callData.status,
      duration: callData.duration,
      callerId: callData.callerId,
      calleeId: callData.calleeId,
    },
  });

  // Update chat doc so the call appears in the chat list preview and reorders it
  const previewText =
    callData.status === "missed"
      ? "📞 Missed voice call"
      : callData.status === "declined"
        ? "📞 Declined call"
        : callData.duration > 0
          ? `📞 Voice call · ${Math.floor(callData.duration / 60)}:${(callData.duration % 60).toString().padStart(2, "0")}`
          : "📞 Voice call";

  updateDoc(doc(dbfs, "qc-chats", chatId), {
    lastMessage: previewText,
    lastMessageBy: senderId,
    lastMessageAt: serverTimestamp(),
  }).catch(() => {});
}

/**
 * Check if there's already a ringing call between two users.
 * Prevents race condition where both users call each other simultaneously.
 */
export async function findExistingRingingCall(
  userId1: string,
  userId2: string
): Promise<string | null> {
  const callsRef = collection(dbfs, "qc-calls");

  // Check if userId1 is calling userId2
  const q1 = query(
    callsRef,
    where("callerId", "==", userId1),
    where("calleeId", "==", userId2),
    where("status", "==", "ringing"),
    limit(1)
  );

  // Check if userId2 is calling userId1
  const q2 = query(
    callsRef,
    where("callerId", "==", userId2),
    where("calleeId", "==", userId1),
    where("status", "==", "ringing"),
    limit(1)
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  if (!snap1.empty) return snap1.docs[0].id;
  if (!snap2.empty) return snap2.docs[0].id;
  return null;
}

/**
 * Check if a user is currently in an active call via presence.
 */
export async function checkUserBusy(userId: string): Promise<boolean> {
  const ref = doc(dbfs, "qc-presence", userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const data = snap.data();
  return !!data?.activeCallId;
}
