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

// External dependencies injected by CallProvider
export interface CallDeps {
  telegramId: string | null;
  qcUsername: string | null;
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
  // Deps
  _deps: CallDeps;
}

interface CallStoreActions {
  setDeps: (deps: Partial<CallDeps>) => void;
  // Actions — set by CallProvider (depend on WebRTC refs)
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

const defaultDeps: CallDeps = {
  telegramId: null,
  qcUsername: null,
};

export const useCallStore = create<CallStore>()((set, get) => ({
  // State defaults
  callState: "idle" as CallState,
  callInfo: null,
  isMuted: false,
  isSpeaker: false,
  callDuration: 0,
  isMinimized: false,
  groupCallState: "idle" as GroupCallState,
  groupCallInfo: null,
  _deps: defaultDeps,

  setDeps: (deps) => set((s) => ({ _deps: { ...s._deps, ...deps } })),

  toggleMinimize: () => set((s) => ({ isMinimized: !s.isMinimized })),

  // Placeholder actions — overridden by CallProvider (depend on WebRTC refs)
  initiateCall: async () => {},
  acceptCall: async () => {},
  declineCall: () => {},
  endCall: () => {},
  toggleMute: () => {},
  toggleSpeaker: () => {},
  joinGroupCall: async () => {},
  leaveGroupCall: () => {},
}));
