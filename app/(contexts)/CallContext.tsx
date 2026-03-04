"use client";

/**
 * Call Provider (thin wrapper)
 *
 * State lives in stores/call-store.ts (no local useState).
 * This Provider handles:
 * 1. WebRTC refs (peer connections, media streams, audio elements)
 * 2. Action implementations that depend on refs
 * 3. Side effects (incoming call listener, cleanup on unmount)
 * 4. Syncing deps + actions into the store
 */

import React, {
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
  getDoc,
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
import {
  createGroupCall as createGroupCallDoc,
  joinGroupCall as joinGroupCallDoc,
  leaveGroupCall as leaveGroupCallDoc,
  endGroupCall as endGroupCallDoc,
  sendSignal,
  listenToGroupCall,
  listenToSignals,
  getActiveGroupCall,
} from "@/lib/group-call";
import { useCallStore, type CallState, type GroupCallState, type CallInfo, type GroupCallInfo } from "@/stores/call-store";
import { useShallow } from "zustand/shallow";
import { sendCallNotification } from "./call-actions";

// Re-export types for backward compatibility
export type { CallState, GroupCallState } from "@/stores/call-store";

// ── Provider ───────────────────────────────────────────────────────────────────

const RING_TIMEOUT_MS = 60_000;

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { telegramId, qcUsername } = useUserContext();

  // Sync deps into store
  useEffect(() => {
    useCallStore.getState().setDeps({ telegramId, qcUsername });
  }, [telegramId, qcUsername]);

  // Refs for cleanup (can't go in Zustand)
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
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Group call refs
  const groupPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const groupStreamRef = useRef<MediaStream | null>(null);
  const groupAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const unsubGroupCallRef = useRef<(() => void) | null>(null);
  const unsubGroupSignalsRef = useRef<(() => void) | null>(null);

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
      stopRingtone();
      stopRingback();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        if (remoteAudioRef.current.parentNode) {
          remoteAudioRef.current.parentNode.removeChild(remoteAudioRef.current);
        }
        remoteAudioRef.current = null;
      }

      if (unsubCallDocRef.current) {
        unsubCallDocRef.current();
        unsubCallDocRef.current = null;
      }
      if (unsubICERef.current) {
        unsubICERef.current();
        unsubICERef.current = null;
      }

      setActiveCall(null);

      pendingCandidatesRef.current = [];
      connectedAtRef.current = 0;

      if (!opts?.skipHistoryWrite) {
        useCallStore.setState({
          callState: "idle",
          callInfo: null,
          isMuted: false,
          isSpeaker: false,
          isMinimized: false,
          callDuration: 0,
        });
      }
    },
    [setActiveCall, stopRingtone, stopRingback]
  );

  // ── End call ──────────────────────────────────────────────────────────────

  const endCall = useCallback(() => {
    const { callInfo: info, callState: state, _deps } = useCallStore.getState();
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

    updateCallDoc(info.callId, {
      status: finalStatus,
      endedAt: serverTimestamp() as any,
      endReason,
    }).catch(() => {});

    if (_deps.telegramId) {
      writeCallHistoryMessage(
        info.chatId,
        {
          callId: info.callId,
          status: finalStatus,
          duration,
          callerId: info.isCaller ? _deps.telegramId : info.remoteUserId,
          calleeId: info.isCaller ? info.remoteUserId : _deps.telegramId,
        },
        _deps.qcUsername || "Unknown",
        _deps.telegramId
      ).catch(() => {});
    }

    cleanup();
  }, [cleanup]);

  // ── Start call timer ────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    connectedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      useCallStore.setState({
        callDuration: Math.floor((Date.now() - connectedAtRef.current) / 1000),
      });
    }, 1000);
  }, []);

  // ── Setup ICE connection state monitoring ────────────────────────────────

  const monitorConnection = useCallback(
    (pc: RTCPeerConnection) => {
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          pc.restartIce();
          setTimeout(() => {
            if (pc.iceConnectionState === "failed") {
              toast.error("Call connection failed");
              const { callInfo: info } = useCallStore.getState();
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
      const { _deps } = useCallStore.getState();
      if (!_deps.telegramId || useCallStore.getState().callState !== "idle") return;

      try {
        const busy = await checkUserBusy(params.calleeId);
        if (busy) {
          toast.error(`${params.calleeName} is on another call`);
          return;
        }

        const existing = await findExistingRingingCall(
          _deps.telegramId,
          params.calleeId
        );
        if (existing) {
          toast("Call already in progress");
          return;
        }

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

        const rtcConfig = await fetchRtcConfig();
        const pc = new RTCPeerConnection(rtcConfig);
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        if (remoteAudioRef.current) {
          remoteAudioRef.current.pause();
          remoteAudioRef.current.srcObject = null;
          if (remoteAudioRef.current.parentNode) {
            remoteAudioRef.current.parentNode.removeChild(remoteAudioRef.current);
          }
        }
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioEl.setAttribute("playsinline", "");
        audioEl.setAttribute("autoplay", "");
        audioEl.style.display = "none";
        document.body.appendChild(audioEl);
        remoteAudioRef.current = audioEl;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const callId = await createCallDocument({
          callerId: _deps.telegramId,
          calleeId: params.calleeId,
          callerName: _deps.qcUsername || "Unknown",
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

        useCallStore.setState({
          callInfo: info,
          callState: "outgoing_ringing",
        });
        setActiveCall(callId);
        playRingback();

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            addICECandidate(callId, "caller", e.candidate).catch(() => {});
          }
        };

        pc.ontrack = (e) => {
          const s = e.streams?.[0] ?? new MediaStream([e.track]);
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = s;
            remoteAudioRef.current.play().catch((err) =>
              console.warn("[CallContext] Remote audio play failed:", err)
            );
          }
        };

        monitorConnection(pc);

        unsubCallDocRef.current = listenToCallDoc(callId, async (data) => {
          if (data.answer && pc.signalingState === "have-local-offer") {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
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

          if (data.status === "connected" && useCallStore.getState().callState !== "connected") {
            stopRingback();
            useCallStore.setState({ callState: "connected" });
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

        unsubICERef.current = listenToICECandidates(
          callId,
          "callee",
          async (candidateData) => {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(
                new RTCIceCandidate({
                  candidate: candidateData.candidate,
                  sdpMLineIndex: candidateData.sdpMLineIndex,
                  sdpMid: candidateData.sdpMid,
                })
              ).catch(() => {});
            } else {
              pendingCandidatesRef.current.push({
                candidate: candidateData.candidate,
                sdpMLineIndex: candidateData.sdpMLineIndex,
                sdpMid: candidateData.sdpMid,
              });
            }
          }
        );

        timeoutRef.current = setTimeout(() => {
          if (useCallStore.getState().callState === "outgoing_ringing") {
            updateCallDoc(callId, {
              status: "missed",
              endedAt: serverTimestamp() as any,
              endReason: "timeout",
            }).catch(() => {});
            writeCallHistoryMessage(
              params.chatId,
              {
                callId,
                status: "missed",
                duration: 0,
                callerId: _deps.telegramId!,
                calleeId: params.calleeId,
              },
              _deps.qcUsername || "Unknown",
              _deps.telegramId!
            ).catch(() => {});
            toast("No answer");
            cleanup();
          }
        }, RING_TIMEOUT_MS);

        sendCallNotification({
          calleeId: params.calleeId,
          callerName: _deps.qcUsername || "Unknown",
          chatId: params.chatId,
        }).catch(() => {});
      } catch (err) {
        console.error("[CallContext] initiateCall error:", err);
        toast.error("Failed to start call");
        cleanup();
      }
    },
    [
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
    const { callInfo: info, _deps } = useCallStore.getState();
    if (!info || !_deps.telegramId) return;

    try {
      stopRingtone();

      const callSnap = await getDoc(doc(dbfs, "qc-calls", info.callId));
      const callData = callSnap.data();
      if (callData?.status !== "ringing") {
        useCallStore.setState({
          callState: "idle",
          callInfo: null,
        });
        toast.info("Call already answered on another device");
        return;
      }

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

      const rtcConfig = await fetchRtcConfig();
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        if (remoteAudioRef.current.parentNode) {
          remoteAudioRef.current.parentNode.removeChild(remoteAudioRef.current);
        }
      }
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.setAttribute("playsinline", "");
      audioEl.setAttribute("autoplay", "");
      audioEl.style.display = "none";
      document.body.appendChild(audioEl);
      remoteAudioRef.current = audioEl;

      pc.ontrack = (e) => {
        const s = e.streams?.[0] ?? new MediaStream([e.track]);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = s;
          remoteAudioRef.current.play().catch((err) =>
            console.warn("[CallContext] Remote audio play failed:", err)
          );
        }
      };

      monitorConnection(pc);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          addICECandidate(info.callId, "callee", e.candidate).catch(() => {});
        }
      };

      const callRef = await new Promise<import("@/lib/webrtc").CallDocument>((resolve) => {
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

      await pc.setRemoteDescription(new RTCSessionDescription(callRef.offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await updateCallDoc(info.callId, {
        answer: { type: answer.type!, sdp: answer.sdp! },
        status: "connected",
        answeredAt: serverTimestamp() as any,
      });

      useCallStore.setState({ callState: "connected" });
      setActiveCall(info.callId);
      startTimer();

      unsubICERef.current = listenToICECandidates(
        info.callId,
        "caller",
        async (candidateData) => {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(
              new RTCIceCandidate({
                candidate: candidateData.candidate,
                sdpMLineIndex: candidateData.sdpMLineIndex,
                sdpMid: candidateData.sdpMid,
              })
            ).catch(() => {});
          } else {
            pendingCandidatesRef.current.push({
              candidate: candidateData.candidate,
              sdpMLineIndex: candidateData.sdpMLineIndex,
              sdpMid: candidateData.sdpMid,
            });
          }
        }
      );

      unsubCallDocRef.current = listenToCallDoc(info.callId, (data) => {
        if (data.status === "ended" || data.status === "missed") {
          cleanup();
        }
      });
    } catch (err) {
      console.error("[CallContext] acceptCall error:", err);
      toast.error("Failed to answer call");
      cleanup();
    }
  }, [
    stopRingtone,
    monitorConnection,
    setActiveCall,
    startTimer,
    cleanup,
  ]);

  // ── Decline call (callee) ─────────────────────────────────────────────────

  const declineCall = useCallback(() => {
    const { callInfo: info, _deps } = useCallStore.getState();
    if (!info) return;

    stopRingtone();

    updateCallDoc(info.callId, {
      status: "declined",
      endedAt: serverTimestamp() as any,
      endReason: "declined",
    }).catch(() => {});

    if (_deps.telegramId) {
      writeCallHistoryMessage(
        info.chatId,
        {
          callId: info.callId,
          status: "declined",
          duration: 0,
          callerId: info.remoteUserId,
          calleeId: _deps.telegramId,
        },
        _deps.qcUsername || "Unknown",
        _deps.telegramId
      ).catch(() => {});
    }

    cleanup();
  }, [stopRingtone, cleanup]);

  // ── Toggle mute ─────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current || groupStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        useCallStore.setState({ isMuted: !audioTrack.enabled });
      }
    }
  }, []);

  // ── Toggle speaker ──────────────────────────────────────────────────────

  const toggleSpeaker = useCallback(() => {
    const { isSpeaker } = useCallStore.getState();
    const next = !isSpeaker;
    useCallStore.setState({ isSpeaker: next });

    const audioElements: HTMLAudioElement[] = [];
    if (remoteAudioRef.current) audioElements.push(remoteAudioRef.current);
    for (const el of groupAudioElementsRef.current.values()) {
      audioElements.push(el);
    }
    if (audioElements.length === 0) return;

    const firstEl = audioElements[0];
    if (typeof (firstEl as any).setSinkId === "function") {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const outputs = devices.filter((d) => d.kind === "audiooutput");
          if (outputs.length < 2) return;

          const speaker = outputs.find((d) =>
            d.label.toLowerCase().includes("speaker")
          );
          const earpiece = outputs.find(
            (d) =>
              d.label.toLowerCase().includes("earpiece") ||
              d.label.toLowerCase().includes("handset")
          );

          const targetId = next
            ? speaker?.deviceId ?? "default"
            : earpiece?.deviceId ?? "";

          for (const el of audioElements) {
            (el as any)
              .setSinkId(targetId)
              .catch((err: Error) =>
                console.warn("[CallContext] setSinkId failed:", err)
              );
          }
        })
        .catch(() => {});
    }
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
      if (useCallStore.getState().callState !== "idle") return;

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

          useCallStore.setState({
            callInfo: info,
            callState: "incoming_ringing",
          });

          playRingtone();

          unsubCallDocRef.current = listenToCallDoc(change.doc.id, (callData) => {
            if (callData.status !== "ringing" && useCallStore.getState().callState === "incoming_ringing") {
              stopRingtone();
              if (unsubCallDocRef.current) {
                unsubCallDocRef.current();
                unsubCallDocRef.current = null;
              }
              useCallStore.setState({
                callState: "idle",
                callInfo: null,
              });
            }
          });

          break;
        }
      }
    });

    return () => unsub();
  }, [telegramId, playRingtone, stopRingtone]);

  // ── Group call: cleanup helper ──────────────────────────────────────────

  const cleanupGroupCall = useCallback(() => {
    for (const pc of groupPeersRef.current.values()) {
      pc.close();
    }
    groupPeersRef.current.clear();

    if (groupStreamRef.current) {
      groupStreamRef.current.getTracks().forEach((t) => t.stop());
      groupStreamRef.current = null;
    }

    for (const el of groupAudioElementsRef.current.values()) {
      el.pause();
      el.srcObject = null;
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    groupAudioElementsRef.current.clear();

    if (unsubGroupCallRef.current) {
      unsubGroupCallRef.current();
      unsubGroupCallRef.current = null;
    }
    if (unsubGroupSignalsRef.current) {
      unsubGroupSignalsRef.current();
      unsubGroupSignalsRef.current = null;
    }

    setActiveCall(null);
    useCallStore.setState({
      isMinimized: false,
      isMuted: false,
      isSpeaker: false,
      groupCallState: "idle",
      groupCallInfo: null,
    });
  }, [setActiveCall]);

  // ── Group call: create peer for remote ────────────────────────────────────

  const createPeerForRemote = useCallback(
    async (
      callId: string,
      remoteUserId: string,
      rtcConfig: RTCConfiguration,
      isCaller: boolean
    ) => {
      const { _deps } = useCallStore.getState();
      if (!_deps.telegramId || groupPeersRef.current.has(remoteUserId)) return;

      const pc = new RTCPeerConnection(rtcConfig);
      groupPeersRef.current.set(remoteUserId, pc);

      if (groupStreamRef.current) {
        groupStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, groupStreamRef.current!);
        });
      }

      pc.ontrack = (e) => {
        const stream = e.streams?.[0] ?? new MediaStream([e.track]);
        let audioEl = groupAudioElementsRef.current.get(remoteUserId);
        if (!audioEl) {
          audioEl = document.createElement("audio");
          audioEl.autoplay = true;
          audioEl.setAttribute("playsinline", "");
          audioEl.style.display = "none";
          document.body.appendChild(audioEl);
          groupAudioElementsRef.current.set(remoteUserId, audioEl);

          if (useCallStore.getState().isSpeaker && typeof (audioEl as any).setSinkId === "function") {
            navigator.mediaDevices.enumerateDevices().then((devices) => {
              const speaker = devices.find(
                (d) => d.kind === "audiooutput" && d.label.toLowerCase().includes("speaker")
              );
              if (speaker) {
                (audioEl as any).setSinkId(speaker.deviceId).catch(() => {});
              }
            }).catch(() => {});
          }
        }
        audioEl.srcObject = stream;
        audioEl.play().catch(() => {});
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal(callId, _deps.telegramId!, remoteUserId, "ice-candidate", {
            candidate: e.candidate.candidate,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
            sdpMid: e.candidate.sdpMid,
          }).catch(() => {});
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          pc.restartIce();
        }
      };

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal(callId, _deps.telegramId!, remoteUserId, "offer", {
          type: offer.type,
          sdp: offer.sdp,
        });
      }
    },
    []
  );

  // ── Join group call ─────────────────────────────────────────────────────

  const joinGroupCallFn = useCallback(
    async (chatId: string, groupName: string) => {
      const { _deps, groupCallState, callState } = useCallStore.getState();
      if (!_deps.telegramId || !_deps.qcUsername) return;
      if (groupCallState !== "idle") return;
      if (callState !== "idle") {
        toast.error("End your current call first");
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: AUDIO_CONSTRAINTS,
          });
        } catch {
          toast.error("Microphone access required for voice calls");
          return;
        }
        groupStreamRef.current = stream;

        let callId: string;
        let existingParticipants: string[] = [];
        let callStartedAt = Date.now();

        const existing = await getActiveGroupCall(chatId);
        if (existing) {
          if (existing.data.participants.length >= existing.data.maxParticipants) {
            toast.error("Call is full (max 8 participants)");
            stream.getTracks().forEach((t) => t.stop());
            groupStreamRef.current = null;
            return;
          }
          callId = existing.id;
          existingParticipants = existing.data.participants;
          callStartedAt = existing.data.createdAt?.toMillis() || Date.now();
          await joinGroupCallDoc(callId, _deps.telegramId, _deps.qcUsername);
        } else {
          callId = await createGroupCallDoc(chatId, groupName, _deps.telegramId, _deps.qcUsername);
        }

        const info: GroupCallInfo = {
          callId,
          chatId,
          groupName,
          participants: existingParticipants.includes(_deps.telegramId)
            ? existingParticipants
            : [...existingParticipants, _deps.telegramId],
          participantNames: { [_deps.telegramId]: _deps.qcUsername },
          startedAt: callStartedAt,
        };

        useCallStore.setState({
          groupCallInfo: info,
          groupCallState: "active",
          isMuted: false,
          isSpeaker: false,
        });
        setActiveCall(callId);

        const rtcConfig = await fetchRtcConfig();

        for (const pid of existingParticipants) {
          if (pid !== _deps.telegramId) {
            await createPeerForRemote(callId, pid, rtcConfig, true);
          }
        }

        unsubGroupCallRef.current = listenToGroupCall(callId, (data) => {
          if (data.status === "ended") {
            cleanupGroupCall();
            return;
          }

          const updatedInfo: GroupCallInfo = {
            callId,
            chatId,
            groupName: data.groupName,
            participants: data.participants,
            participantNames: data.participantNames,
            startedAt: data.createdAt?.toMillis() || useCallStore.getState().groupCallInfo?.startedAt || Date.now(),
          };
          useCallStore.setState({ groupCallInfo: updatedInfo });

          for (const [pid, pc] of groupPeersRef.current.entries()) {
            if (!data.participants.includes(pid)) {
              pc.close();
              groupPeersRef.current.delete(pid);
              const audioEl = groupAudioElementsRef.current.get(pid);
              if (audioEl) {
                audioEl.pause();
                audioEl.srcObject = null;
                if (audioEl.parentNode) audioEl.parentNode.removeChild(audioEl);
                groupAudioElementsRef.current.delete(pid);
              }
            }
          }
        });

        unsubGroupSignalsRef.current = listenToSignals(callId, _deps.telegramId, async (signal) => {
          if (signal.type === "offer") {
            const pc = groupPeersRef.current.get(signal.from);
            if (pc) {
              await pc.setRemoteDescription(
                new RTCSessionDescription(signal.data as unknown as RTCSessionDescriptionInit)
              );
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await sendSignal(callId, _deps.telegramId!, signal.from, "answer", {
                type: answer.type,
                sdp: answer.sdp,
              });
            } else {
              await createPeerForRemote(callId, signal.from, rtcConfig, false);
              const newPc = groupPeersRef.current.get(signal.from);
              if (newPc) {
                await newPc.setRemoteDescription(
                  new RTCSessionDescription(signal.data as unknown as RTCSessionDescriptionInit)
                );
                const answer = await newPc.createAnswer();
                await newPc.setLocalDescription(answer);
                await sendSignal(callId, _deps.telegramId!, signal.from, "answer", {
                  type: answer.type,
                  sdp: answer.sdp,
                });
              }
            }
          } else if (signal.type === "answer") {
            const pc = groupPeersRef.current.get(signal.from);
            if (pc && pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(
                new RTCSessionDescription(signal.data as unknown as RTCSessionDescriptionInit)
              );
            }
          } else if (signal.type === "ice-candidate") {
            const pc = groupPeersRef.current.get(signal.from);
            if (pc) {
              await pc.addIceCandidate(
                new RTCIceCandidate({
                  candidate: signal.data.candidate as string,
                  sdpMLineIndex: signal.data.sdpMLineIndex as number | null,
                  sdpMid: signal.data.sdpMid as string | null,
                })
              ).catch(() => {});
            }
          }
        });
      } catch (err) {
        console.error("[CallContext] joinGroupCall error:", err);
        toast.error("Failed to join group call");
        cleanupGroupCall();
      }
    },
    [setActiveCall, createPeerForRemote, cleanupGroupCall]
  );

  // ── Leave group call ────────────────────────────────────────────────────

  const leaveGroupCallFn = useCallback(() => {
    const { groupCallInfo: info, _deps } = useCallStore.getState();
    if (!info || !_deps.telegramId) return;

    leaveGroupCallDoc(info.callId, _deps.telegramId).then(() => {
      const remaining = info.participants.filter((p) => p !== _deps.telegramId);
      if (remaining.length === 0) {
        endGroupCallDoc(info.callId).catch(() => {});
      }
    }).catch(() => {});

    cleanupGroupCall();
  }, [cleanupGroupCall]);

  // ── Sync actions into store ─────────────────────────────────────────────

  useEffect(() => {
    useCallStore.setState({
      initiateCall,
      acceptCall,
      declineCall,
      endCall,
      toggleMute,
      toggleSpeaker,
      joinGroupCall: joinGroupCallFn,
      leaveGroupCall: leaveGroupCallFn,
    });
  }, [
    initiateCall, acceptCall, declineCall, endCall,
    toggleMute, toggleSpeaker,
    joinGroupCallFn, leaveGroupCallFn,
  ]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cleanup({ skipHistoryWrite: true });
      cleanupGroupCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

// =====================================================
// Compatibility hook — consumers continue using useCallContext() unchanged
// =====================================================
export function useCallContext() {
  return useCallStore(
    useShallow((s) => ({
      callState: s.callState,
      callInfo: s.callInfo,
      isMuted: s.isMuted,
      isSpeaker: s.isSpeaker,
      callDuration: s.callDuration,
      isMinimized: s.isMinimized,
      initiateCall: s.initiateCall,
      acceptCall: s.acceptCall,
      declineCall: s.declineCall,
      endCall: s.endCall,
      toggleMute: s.toggleMute,
      toggleSpeaker: s.toggleSpeaker,
      toggleMinimize: s.toggleMinimize,
      groupCallState: s.groupCallState,
      groupCallInfo: s.groupCallInfo,
      joinGroupCall: s.joinGroupCall,
      leaveGroupCall: s.leaveGroupCall,
    }))
  );
}
