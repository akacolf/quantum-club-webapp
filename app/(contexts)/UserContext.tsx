"use client";

import { useUserStore } from "@/stores/user-store";
import { useShallow } from "zustand/shallow";

/**
 * Compatibility wrapper — all 58 consumers continue importing useUserContext()
 * as before. The backing store is now Zustand (stores/user-store.ts).
 *
 * useShallow ensures this selector only triggers a re-render when one of the
 * returned values actually changes (same behaviour as the previous useMemo).
 */
export const useUserContext = () =>
  useUserStore(
    useShallow((s) => ({
      username: s.username,
      setUsername: s.setUsername,
      telegramId: s.telegramId,
      setTelegramId: s.setTelegramId,
      miningActive: s.miningActive,
      setMiningActive: s.setMiningActive,
      lastActiveTime: s.lastActiveTime,
      setLastActiveTime: s.setLastActiveTime,
      miningTimestamp: s.miningTimestamp,
      setMiningTimestamp: s.setMiningTimestamp,
      MainQuantAmount: s.MainQuantAmount,
      SetMainQuantAmount: s.SetMainQuantAmount,
      jointext: s.jointext,
      setJoinButtonText: s.setJoinButtonText,
      rank: s.rank,
      setRank: s.setRank,
      telegramIdNM: s.telegramIdNM,
      setTelegramIdNm: s.setTelegramIdNm,
      daily: s.daily,
      setDaily: s.setDaily,
      remainingSolveToEarn: s.remainingSolveToEarn,
      setRemainingSolveToEarn: s.setRemainingSolveToEarn,
      walletAddress: s.walletAddress,
      setWalletAddress: s.setWalletAddress,
      qcUsername: s.qcUsername,
      setQcUsername: s.setQcUsername,
      _hasHydrated: s._hasHydrated,
    }))
  );

