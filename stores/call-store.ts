"use client";

import { create } from "zustand";

export type CallState =
  | "idle"
  | "outgoing_ringing"
  | "incoming_ringing"
  | "connected"
  | "ended";

export interface CallInfo {
  callId: string;
  chatId: string;
  remoteUserId: string;
  remoteName: string;
  isCaller: boolean;
}

export type GroupCallState = "idle" | "active";

export interface GroupCallInfo {
  callId: string;
  chatId: string;
  groupName: string;
  participants: string[];
  participantNames: Record<string, string>;
  startedAt: number;
}

interface CallStoreState {
  // 1:1 calls
  callState: CallState;
  callInfo: CallInfo | null;
  isMuted: boolean;
  isSpeaker: boolean;
  callDuration: number;
  isMinimized: boolean;
  // Group calls
  groupCallState: GroupCallState;
  groupCallInfo: GroupCallInfo | null;
}

interface CallStoreActions {
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
  toggleMinimize: () => void;
  joinGroupCall: (chatId: string, groupName: string) => Promise<void>;
  leaveGroupCall: () => void;
}

export type CallStore = CallStoreState & CallStoreActions;

export const useCallStore = create<CallStore>()(() => ({
  // State defaults
  callState: "idle" as CallState,
  callInfo: null,
  isMuted: false,
  isSpeaker: false,
  callDuration: 0,
  isMinimized: false,
  groupCallState: "idle" as GroupCallState,
  groupCallInfo: null,

  // Placeholder actions — overridden by bridge in CallProvider
  initiateCall: async () => {},
  acceptCall: async () => {},
  declineCall: () => {},
  endCall: () => {},
  toggleMute: () => {},
  toggleSpeaker: () => {},
  toggleMinimize: () => {},
  joinGroupCall: async () => {},
  leaveGroupCall: () => {},
}));
