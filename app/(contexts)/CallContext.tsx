"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { dbfs } from "@/app/(firebase)/client";
import {
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
} from "firebase/firestore";
import { useUserContext } from "./UserContext";
import { toast } from "sonner";
import {
  createCallDocument,
  listenToCallDoc,
  listenToICECandidates,
  addICECandidate,
  updateCallDoc,
  writeCallHistoryMessage,
  findExistingRingingCall,
  checkUserBusy,
  fetchRtcConfig,
  AUDIO_CONSTRAINTS,
  type CallDocument,
  type CallStatus,
} from "@/lib/webrtc";

// ── Types ──────────────────────────────────────────────────────────────────────

export type CallState =
  | "idle"
  | "outgoing_ringing"
  | "incoming_ringing"
  | "connected"
  | "ended";

interface CallInfo {
  callId: string;
  chatId: string;
  remoteUserId: string;
  remoteName: string;
  isCaller: boolean;
}

interface CallContextType {
  callState: CallState;
  callInfo: CallInfo | null;
  isMuted: boolean;
  isSpeaker: boolean;
  callDuration: number;
  initiateCall: (params: {
    calleeId: string;
    calleeName: string;
    chatId: string;
  }) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function useCallContext() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCallContext must be used within CallProvider");
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────────

const RING_TIMEOUT_MS = 60_000;

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { telegramId, qcUsername } = useUserContext();

  const [callState, setCallState] = useState<CallState>("idle");
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Refs for cleanup
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const unsubCallDocRef = useRef<(() => void) | null>(null);
  const unsubICERef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedAtRef = useRef<number>(0);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const ringbackRef = useRef<HTMLAudioElement | null>(null);
  const callInfoRef = useRef<CallInfo | null>(null);
  const callStateRef = useRef<CallState>("idle");
  // Track pending remote ICE candidates (received before remote description is set)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Keep refs in sync
  useEffect(() => {
    callInfoRef.current = callInfo;
  }, [callInfo]);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // ── Audio helpers ──────────────────────────────────────────────────────────

  const playRingtone = useCallback(() => {
    try {
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio("/audio/ringtone.mp3");
        ringtoneRef.current.loop = true;
      }
      ringtoneRef.current.play().catch(() => {});
    } catch {}
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);

  const playRingback = useCallback(() => {
    try {
      if (!ringbackRef.current) {
        ringbackRef.current = new Audio("/audio/ringback.mp3");
        ringbackRef.current.loop = true;
      }
      ringbackRef.current.play().catch(() => {});
    } catch {}
  }, []);

  const stopRingback = useCallback(() => {
    if (ringbackRef.current) {
      ringbackRef.current.pause();
      ringbackRef.current.currentTime = 0;
    }
  }, []);

  // ── Presence: activeCallId ────────────────────────────────────────────────

  const setActiveCall = useCallback(
    (callId: string | null) => {
      if (!telegramId) return;
      const ref = doc(dbfs, "qc-presence", telegramId);
      setDoc(ref, { activeCallId: callId }, { merge: true }).catch(() => {});
    },
    [telegramId]
  );

  // ── Cleanup ─────────────────────────────────────────────────────────────

  const cleanup = useCallback(
    (opts?: { skipHistoryWrite?: boolean }) => {
      // Stop audio
      stopRingtone();
      stopRingback();

      // Clear timeout + timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Close peer connection
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      // Stop remote audio
      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current = null;
      }

      // Unsubscribe listeners
      if (unsubCallDocRef.current) {
        unsubCallDocRef.current();
        unsubCallDocRef.current = null;
      }
      if (unsubICERef.current) {
        unsubICERef.current();
        unsubICERef.current = null;
      }

      // Clear presence
      setActiveCall(null);

      // Reset state
      pendingCandidatesRef.current = [];
      setIsMuted(false);
      setIsSpeaker(false);
      setCallDuration(0);
      connectedAtRef.current = 0;

      if (!opts?.skipHistoryWrite) {
        setCallState("idle");
        setCallInfo(null);
      }
    },
    [setActiveCall, stopRingtone, stopRingback]
  );

  // ── End call ──────────────────────────────────────────────────────────────

  const endCall = useCallback(() => {
    const info = callInfoRef.current;
    const state = callStateRef.current;
    if (!info || state === "idle") return;

    const duration =
      connectedAtRef.current > 0
        ? Math.floor((Date.now() - connectedAtRef.current) / 1000)
        : 0;

    const endReason = info.isCaller ? "caller_ended" : "callee_ended";
    const finalStatus: CallStatus =
      state === "outgoing_ringing"
        ? "missed"
        : state === "incoming_ringing"
          ? "declined"
          : "ended";

    // Update Firestore
    updateCallDoc(info.callId, {
      status: finalStatus,
      endedAt: serverTimestamp() as any,
      endReason,
    }).catch(() => {});

    // Write history message
    if (telegramId) {
      writeCallHistoryMessage(
        info.chatId,
        {
          callId: info.callId,
          status: finalStatus,
          duration,
          callerId: info.isCaller ? telegramId : info.remoteUserId,
          calleeId: info.isCaller ? info.remoteUserId : telegramId,
        },
        qcUsername || "Unknown",
        telegramId
      ).catch(() => {});
    }

    cleanup();
  }, [telegramId, qcUsername, cleanup]);

  // ── Start call timer ────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    connectedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setCallDuration(
        Math.floor((Date.now() - connectedAtRef.current) / 1000)
      );
    }, 1000);
  }, []);

  // ── Setup ICE connection state monitoring ────────────────────────────────

  const monitorConnection = useCallback(
    (pc: RTCPeerConnection) => {
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          pc.restartIce();
          // If still failed after a bit, end the call
          setTimeout(() => {
            if (pc.iceConnectionState === "failed") {
              toast.error("Call connection failed");
              const info = callInfoRef.current;
              if (info) {
                updateCallDoc(info.callId, {
                  status: "ended",
                  endedAt: serverTimestamp() as any,
                  endReason: "error",
                }).catch(() => {});
              }
              cleanup();
            }
          }, 5000);
        } else if (pc.iceConnectionState === "disconnected") {
          // Temporary disconnection — wait for recovery
          setTimeout(() => {
            if (pc.iceConnectionState === "disconnected") {
              toast.error("Call disconnected");
              endCall();
            }
          }, 10_000);
        }
      };
    },
    [cleanup, endCall]
  );

  // ── Initiate call (caller) ────────────────────────────────────────────────

  const initiateCall = useCallback(
    async (params: {
      calleeId: string;
      calleeName: string;
      chatId: string;
    }) => {
      if (!telegramId || callStateRef.current !== "idle") return;

      try {
        // Check if callee is busy
        const busy = await checkUserBusy(params.calleeId);
        if (busy) {
          toast.error(`${params.calleeName} is on another call`);
          return;
        }

        // Check for existing ringing call between us
        const existing = await findExistingRingingCall(
          telegramId,
          params.calleeId
        );
        if (existing) {
          toast("Call already in progress");
          return;
        }

        // Get microphone
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: AUDIO_CONSTRAINTS,
          });
        } catch {
          toast.error("Microphone access required for voice calls");
          return;
        }
        localStreamRef.current = stream;

        // Fetch TURN credentials and create peer connection
        const rtcConfig = await fetchRtcConfig();
        const pc = new RTCPeerConnection(rtcConfig);
        pcRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Create call document in Firestore
        const callId = await createCallDocument({
          callerId: telegramId,
          calleeId: params.calleeId,
          callerName: qcUsername || "Unknown",
          calleeName: params.calleeName,
          chatId: params.chatId,
          offer: { type: offer.type!, sdp: offer.sdp! },
        });

        const info: CallInfo = {
          callId,
          chatId: params.chatId,
          remoteUserId: params.calleeId,
          remoteName: params.calleeName,
          isCaller: true,
        };
        setCallInfo(info);
        callInfoRef.current = info;
        setCallState("outgoing_ringing");
        callStateRef.current = "outgoing_ringing";
        setActiveCall(callId);

        // Play ringback tone
        playRingback();

        // Send ICE candidates to Firestore
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            addICECandidate(callId, "caller", e.candidate).catch(
              () => {}
            );
          }
        };

        // Handle remote stream — persist audio element to prevent GC
        pc.ontrack = (e) => {
          if (!remoteAudioRef.current) {
            remoteAudioRef.current = new Audio();
          }
          remoteAudioRef.current.srcObject = e.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        };

        monitorConnection(pc);

        // Listen for answer + status changes
        unsubCallDocRef.current = listenToCallDoc(callId, async (data) => {
          if (
            data.answer &&
            pc.signalingState === "have-local-offer"
          ) {
            try {
              await pc.setRemoteDescription(
                new RTCSessionDescription(data.answer)
              );
              // Flush any pending ICE candidates
              for (const c of pendingCandidatesRef.current) {
                await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
              }
              pendingCandidatesRef.current = [];
            } catch {
              toast.error("Failed to connect call");
              cleanup();
              return;
            }
          }

          if (data.status === "connected" && callStateRef.current !== "connected") {
            stopRingback();
            setCallState("connected");
            callStateRef.current = "connected";
            startTimer();
          } else if (
            data.status === "ended" ||
            data.status === "declined" ||
            data.status === "missed" ||
            data.status === "busy"
          ) {
            stopRingback();
            if (data.status === "declined") {
              toast("Call declined");
            } else if (data.status === "busy") {
              toast(`${params.calleeName} is on another call`);
            }
            cleanup();
          }
        });

        // Listen for callee ICE candidates
        unsubICERef.current = listenToICECandidates(
          callId,
          "callee",
          async (candidateData) => {
            if (pc.remoteDescription) {
              await pc
                .addIceCandidate(
                  new RTCIceCandidate({
                    candidate: candidateData.candidate,
                    sdpMLineIndex: candidateData.sdpMLineIndex,
                    sdpMid: candidateData.sdpMid,
                  })
                )
                .catch(() => {});
            } else {
              pendingCandidatesRef.current.push({
                candidate: candidateData.candidate,
                sdpMLineIndex: candidateData.sdpMLineIndex,
                sdpMid: candidateData.sdpMid,
              });
            }
          }
        );

        // 60s ring timeout
        timeoutRef.current = setTimeout(() => {
          if (callStateRef.current === "outgoing_ringing") {
            updateCallDoc(callId, {
              status: "missed",
              endedAt: serverTimestamp() as any,
              endReason: "timeout",
            }).catch(() => {});
            // Write missed call history
            writeCallHistoryMessage(
              params.chatId,
              {
                callId,
                status: "missed",
                duration: 0,
                callerId: telegramId,
                calleeId: params.calleeId,
              },
              qcUsername || "Unknown",
              telegramId
            ).catch(() => {});
            toast("No answer");
            cleanup();
          }
        }, RING_TIMEOUT_MS);

        // Send push notification to callee
        fetch("/api/call-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calleeId: params.calleeId,
            callerName: qcUsername || "Unknown",
            chatId: params.chatId,
          }),
        }).catch(() => {});
      } catch (err) {
        console.error("[CallContext] initiateCall error:", err);
        toast.error("Failed to start call");
        cleanup();
      }
    },
    [
      telegramId,
      qcUsername,
      setActiveCall,
      playRingback,
      stopRingback,
      monitorConnection,
      startTimer,
      cleanup,
    ]
  );

  // ── Accept call (callee) ──────────────────────────────────────────────────

  const acceptCall = useCallback(async () => {
    const info = callInfoRef.current;
    if (!info || !telegramId) return;

    try {
      stopRingtone();

      // Get microphone
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: AUDIO_CONSTRAINTS,
        });
      } catch {
        toast.error("Microphone access required for voice calls");
        return;
      }
      localStreamRef.current = stream;

      // Fetch TURN credentials and create peer connection
      const rtcConfig = await fetchRtcConfig();
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote stream — persist audio element to prevent GC
      pc.ontrack = (e) => {
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
        }
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      };

      monitorConnection(pc);

      // Send ICE candidates — must be set BEFORE setLocalDescription
      // to avoid missing early candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          addICECandidate(info.callId, "callee", e.candidate).catch(
            () => {}
          );
        }
      };

      // Get the offer from Firestore
      const callRef = await new Promise<CallDocument>((resolve) => {
        const unsub = listenToCallDoc(info.callId, (data) => {
          unsub();
          resolve(data);
        });
      });

      if (!callRef.offer) {
        toast.error("Call data unavailable");
        cleanup();
        return;
      }

      // Set remote description (offer)
      await pc.setRemoteDescription(
        new RTCSessionDescription(callRef.offer)
      );

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Write answer to Firestore + update status
      await updateCallDoc(info.callId, {
        answer: { type: answer.type!, sdp: answer.sdp! },
        status: "connected",
        answeredAt: serverTimestamp() as any,
      });

      setCallState("connected");
      callStateRef.current = "connected";
      setActiveCall(info.callId);
      startTimer();

      // Listen for caller ICE candidates
      unsubICERef.current = listenToICECandidates(
        info.callId,
        "caller",
        async (candidateData) => {
          if (pc.remoteDescription) {
            await pc
              .addIceCandidate(
                new RTCIceCandidate({
                  candidate: candidateData.candidate,
                  sdpMLineIndex: candidateData.sdpMLineIndex,
                  sdpMid: candidateData.sdpMid,
                })
              )
              .catch(() => {});
          } else {
            pendingCandidatesRef.current.push({
              candidate: candidateData.candidate,
              sdpMLineIndex: candidateData.sdpMLineIndex,
              sdpMid: candidateData.sdpMid,
            });
          }
        }
      );

      // Listen for call status changes
      unsubCallDocRef.current = listenToCallDoc(info.callId, (data) => {
        if (
          data.status === "ended" ||
          data.status === "missed"
        ) {
          cleanup();
        }
      });
    } catch (err) {
      console.error("[CallContext] acceptCall error:", err);
      toast.error("Failed to answer call");
      cleanup();
    }
  }, [
    telegramId,
    stopRingtone,
    monitorConnection,
    setActiveCall,
    startTimer,
    cleanup,
  ]);

  // ── Decline call (callee) ─────────────────────────────────────────────────

  const declineCall = useCallback(() => {
    const info = callInfoRef.current;
    if (!info) return;

    stopRingtone();

    updateCallDoc(info.callId, {
      status: "declined",
      endedAt: serverTimestamp() as any,
      endReason: "declined",
    }).catch(() => {});

    // Write declined call history
    if (telegramId) {
      writeCallHistoryMessage(
        info.chatId,
        {
          callId: info.callId,
          status: "declined",
          duration: 0,
          callerId: info.remoteUserId,
          calleeId: telegramId,
        },
        qcUsername || "Unknown",
        telegramId
      ).catch(() => {});
    }

    cleanup();
  }, [telegramId, qcUsername, stopRingtone, cleanup]);

  // ── Toggle mute ─────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // ── Toggle speaker ──────────────────────────────────────────────────────

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => !prev);
    // Note: speaker routing is limited in browsers, this is mostly a visual toggle.
    // On Telegram Mini Apps, the audio output typically follows the device default.
  }, []);

  // ── Global incoming call listener ─────────────────────────────────────────

  useEffect(() => {
    if (!telegramId) return;

    const callsRef = collection(dbfs, "qc-calls");
    const q = query(
      callsRef,
      where("calleeId", "==", telegramId),
      where("status", "==", "ringing")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      // Only process if idle
      if (callStateRef.current !== "idle") return;

      for (const change of snapshot.docChanges()) {
        if (change.type === "added") {
          const data = change.doc.data() as CallDocument;

          const info: CallInfo = {
            callId: change.doc.id,
            chatId: data.chatId,
            remoteUserId: data.callerId,
            remoteName: data.callerName,
            isCaller: false,
          };
          setCallInfo(info);
          callInfoRef.current = info;
          setCallState("incoming_ringing");
          callStateRef.current = "incoming_ringing";

          playRingtone();

          // Auto-dismiss if status changes from ringing
          const unsubDoc = listenToCallDoc(change.doc.id, (callData) => {
            if (callData.status !== "ringing" && callStateRef.current === "incoming_ringing") {
              stopRingtone();
              unsubDoc();
              if (
                callData.status === "ended" ||
                callData.status === "missed" ||
                callData.status === "declined"
              ) {
                setCallState("idle");
                callStateRef.current = "idle";
                setCallInfo(null);
                callInfoRef.current = null;
              }
            }
          });

          // Only handle one incoming call at a time
          break;
        }
      }
    });

    return () => unsub();
  }, [telegramId, playRingtone, stopRingtone]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cleanup({ skipHistoryWrite: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CallContext.Provider
      value={{
        callState,
        callInfo,
        isMuted,
        isSpeaker,
        callDuration,
        initiateCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        toggleSpeaker,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
