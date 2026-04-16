"use client";

import { create } from "zustand";

interface BroadcastsUIState {
  reactionPickerPostId: string | null;
}

interface BroadcastsUIActions {
  openReactionPicker: (postId: string) => void;
  closeReactionPicker: () => void;
}

export type BroadcastsStore = BroadcastsUIState & BroadcastsUIActions;

export const useBroadcastsStore = create<BroadcastsStore>()((set) => ({
  reactionPickerPostId: null,
  openReactionPicker: (postId) => set({ reactionPickerPostId: postId }),
  closeReactionPicker: () => set({ reactionPickerPostId: null }),
}));
