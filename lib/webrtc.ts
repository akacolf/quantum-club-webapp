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
  orderBy,
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
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/** Fetch TURN credentials from our server-side proxy (keeps API key secret). */
export async function fetchRtcConfig(): Promise<RTCConfiguration> {
  console.warn("[WebRTC] Fetching TURN credentials...");
  try {
    const res = await fetch("/api/turn-credentials");
    if (res.ok) {
      const iceServers = await res.json();
      console.warn("[WebRTC] TURN credentials fetched:", iceServers.length, "servers");
      return { iceServers, iceTransportPolicy: "all" };
    }
    console.warn("[WebRTC] TURN fetch failed, status:", res.status, "— using fallback STUN");
  } catch (err) {
    console.warn("[WebRTC] TURN fetch error — using fallback STUN:", err);
  }
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
  console.warn("[WebRTC] Creating call document:", {
    callerId: params.callerId,
    calleeId: params.calleeId,
    chatId: params.chatId,
  });
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
  console.warn("[WebRTC] Call document created:", callRef.id);
  return callRef.id;
}

export function listenToCallDoc(
  callId: string,
  callback: (data: CallDocument) => void
): () => void {
  console.warn("[WebRTC] Listening to call doc:", callId);
  const ref = doc(dbfs, "qc-calls", callId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as CallDocument;
      console.warn("[WebRTC] Call doc update:", callId, {
        status: data.status,
        hasOffer: !!data.offer,
        hasAnswer: !!data.answer,
      });
      callback(data);
    } else {
      console.warn("[WebRTC] Call doc does not exist:", callId);
    }
  });
}

export function listenToICECandidates(
  callId: string,
  role: "caller" | "callee",
  callback: (candidate: ICECandidateData) => void
): () => void {
  const subCollection = role === "caller" ? "callerCandidates" : "calleeCandidates";
  console.warn("[WebRTC] Listening to ICE candidates:", callId, role, subCollection);
  const colRef = collection(dbfs, "qc-calls", callId, subCollection);
  return onSnapshot(colRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data() as ICECandidateData;
        console.warn("[WebRTC] ICE candidate received:", role, {
          candidate: data.candidate?.slice(0, 50) + "...",
          sdpMid: data.sdpMid,
        });
        callback(data);
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
  console.warn("[WebRTC] Sending ICE candidate:", role, {
    candidate: candidate.candidate?.slice(0, 50) + "...",
    sdpMid: candidate.sdpMid,
  });
  await addDoc(colRef, {
    candidate: candidate.candidate,
    sdpMLineIndex: candidate.sdpMLineIndex,
    sdpMid: candidate.sdpMid,
  });
  console.warn("[WebRTC] ICE candidate written to Firestore:", role);
}

export async function updateCallDoc(
  callId: string,
  updates: Partial<CallDocument>
): Promise<void> {
  console.warn("[WebRTC] Updating call doc:", callId, Object.keys(updates));
  const ref = doc(dbfs, "qc-calls", callId);
  await updateDoc(ref, updates as Record<string, unknown>);
  console.warn("[WebRTC] Call doc updated:", callId);
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
  console.warn("[WebRTC] Checking for existing ringing call:", userId1, "↔", userId2);
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

  const result = !snap1.empty ? snap1.docs[0].id : !snap2.empty ? snap2.docs[0].id : null;
  console.warn("[WebRTC] Existing ringing call:", result);
  return result;
}

/**
 * Check if a user is currently in an active call via presence.
 */
export async function checkUserBusy(userId: string): Promise<boolean> {
  console.warn("[WebRTC] Checking if user is busy:", userId);
  const ref = doc(dbfs, "qc-presence", userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    console.warn("[WebRTC] User presence doc not found:", userId);
    return false;
  }
  const data = snap.data();
  const busy = !!data?.activeCallId;
  console.warn("[WebRTC] User busy:", userId, busy, "activeCallId:", data?.activeCallId ?? "none");
  return busy;
}
