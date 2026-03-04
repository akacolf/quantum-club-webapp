"use client";

import { useEffect, useRef, useState } from "react";
import { dbfs } from "@/app/(firebase)/client";
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

interface PresenceData {
  isOnline: boolean;
  lastSeen: Timestamp | null;
  currentChatId: string | null;
  activeCallId: string | null;
}

/**
 * Manage the current user's online/offline presence.
 * Call once at a high-level layout (e.g. EcosystemLayout).
 *
 * Heartbeat fires every 60s while visible. When the app is backgrounded
 * (browser visibilitychange OR Telegram Mini App viewport events) we
 * immediately mark offline AND pause the heartbeat so it can't accidentally
 * overwrite the offline status.
 */
export function usePresence(telegramId: string | null) {
  const presenceRef = useRef<ReturnType<typeof doc> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!telegramId) return;

    const ref = doc(dbfs, "qc-presence", telegramId);
    presenceRef.current = ref;

    const startHeartbeat = () => {
      if (intervalRef.current) return; // already running
      intervalRef.current = setInterval(() => {
        setDoc(ref, { isOnline: true, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
      }, 60_000);
    };

    const stopHeartbeat = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const goOnline = () => {
      setDoc(ref, { isOnline: true, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
      startHeartbeat();
    };

    const goOffline = () => {
      stopHeartbeat();
      setDoc(ref, { isOnline: false, lastSeen: serverTimestamp(), currentChatId: null }, { merge: true }).catch(() => {});
    };

    const handleVisibility = () => {
      if (document.hidden) goOffline();
      else goOnline();
    };

    // Telegram Mini App viewport visibility
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
    const handleTgViewport = (...args: unknown[]) => {
      // When Telegram collapses the mini app the viewport height drops to 0
      // and isStateStable becomes true once the transition finishes.
      const e = args[0] as { isStateStable?: boolean } | undefined;
      if (e?.isStateStable && tg) {
        if (tg.viewportStableHeight === 0) goOffline();
        else goOnline();
      }
    };

    goOnline();
    window.addEventListener("beforeunload", goOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    tg?.onEvent?.("viewportChanged", handleTgViewport);

    return () => {
      stopHeartbeat();
      window.removeEventListener("beforeunload", goOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      tg?.offEvent?.("viewportChanged", handleTgViewport);
      goOffline();
    };
  }, [telegramId]);

  const setCurrentChat = (chatId: string | null) => {
    if (!presenceRef.current) return;
    setDoc(presenceRef.current, { currentChatId: chatId }, { merge: true }).catch(() => {});
  };

  const setActiveCall = (callId: string | null) => {
    if (!presenceRef.current) return;
    setDoc(presenceRef.current, { activeCallId: callId }, { merge: true }).catch(() => {});
  };

  return { setCurrentChat, setActiveCall, presenceRef };
}

/**
 * Get setCurrentChat for a user whose presence is managed elsewhere (e.g. layout).
 * Does not start heartbeat — just provides a way to update currentChatId.
 */
export function usePresenceActions(telegramId: string | null) {
  const presenceRef = useRef<ReturnType<typeof doc> | null>(null);

  useEffect(() => {
    if (!telegramId) return;
    presenceRef.current = doc(dbfs, "qc-presence", telegramId);
    return () => { presenceRef.current = null; };
  }, [telegramId]);

  const setCurrentChat = (chatId: string | null) => {
    if (!presenceRef.current) return;
    setDoc(presenceRef.current, { currentChatId: chatId }, { merge: true }).catch(() => {});
  };

  return { setCurrentChat };
}

/**
 * Subscribe to another user's presence data.
 * Treats a user as offline if lastSeen is stale (>130s old),
 * since the heartbeat fires every 60s.
 */
const HEARTBEAT_STALE_MS = 75_000; // heartbeat (60s) + 15s buffer

export function useUserPresence(telegramId: string | null): PresenceData | null {
  const [presence, setPresence] = useState<PresenceData | null>(null);

  useEffect(() => {
    if (!telegramId) return;
    const ref = doc(dbfs, "qc-presence", telegramId);

    const evaluatePresence = (d: Record<string, unknown>) => {
      let isOnline = (d.isOnline as boolean) || false;
      const lastSeen: Timestamp | null = (d.lastSeen as Timestamp) || null;

      // If lastSeen is stale, override isOnline to false
      if (isOnline && lastSeen && typeof lastSeen.toDate === "function") {
        const age = Date.now() - lastSeen.toDate().getTime();
        if (age > HEARTBEAT_STALE_MS) isOnline = false;
      }

      return {
        isOnline,
        lastSeen,
        currentChatId: (d.currentChatId as string) || null,
        activeCallId: (d.activeCallId as string) || null,
      };
    };

    let latestData: Record<string, unknown> | null = null;

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        latestData = snap.data();
        setPresence(evaluatePresence(latestData));
      }
    }, () => {
      // Silently handle permission errors
    });

    // Re-evaluate staleness every 15s so stale presence is detected quickly
    const interval = setInterval(() => {
      if (latestData) setPresence(evaluatePresence(latestData));
    }, 15_000);

    return () => { unsub(); clearInterval(interval); };
  }, [telegramId]);

  return presence;
}

/**
 * Format presence into human-readable text.
 * If currentChatId is provided and matches the user's currentChatId, treat as online.
 */
export function formatLastSeen(presence: PresenceData | null, currentChatId?: string): string {
  if (!presence) return "";
  if (presence.isOnline) return "online";
  // If the user is in the same chat, treat as online even if staleness says otherwise
  if (currentChatId && presence.currentChatId === currentChatId) return "online";
  if (!presence.lastSeen) return "";

  const date = presence.lastSeen.toDate();
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);

  if (mins < 1) return "last seen just now";
  if (mins < 60) return `last seen ${mins}m ago`;
  if (hours < 24) return `last seen ${hours}h ago`;
  return `last seen ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

/**
 * Subscribe to presence data for multiple users at once.
 * Returns a map of userId -> PresenceData.
 */
export function useMultiplePresence(telegramIds: string[]): Map<string, PresenceData> {
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceData>>(new Map());
  const latestDataRef = useRef<Map<string, Record<string, unknown>>>(new Map());

  useEffect(() => {
    if (telegramIds.length === 0) return;

    const unsubs: (() => void)[] = [];

    const evaluateUser = (d: Record<string, unknown>) => {
      let isOnline = (d.isOnline as boolean) || false;
      const lastSeen: Timestamp | null = (d.lastSeen as Timestamp) || null;
      if (isOnline && lastSeen && typeof lastSeen.toDate === "function") {
        const age = Date.now() - lastSeen.toDate().getTime();
        if (age > HEARTBEAT_STALE_MS) isOnline = false;
      }
      return {
        isOnline,
        lastSeen,
        currentChatId: (d.currentChatId as string) || null,
        activeCallId: (d.activeCallId as string) || null,
      };
    };

    for (const id of telegramIds) {
      const ref = doc(dbfs, "qc-presence", id);
      const unsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          latestDataRef.current.set(id, d);
          setPresenceMap((prev) => {
            const next = new Map(prev);
            next.set(id, evaluateUser(d));
            return next;
          });
        }
      }, () => {});
      unsubs.push(unsub);
    }

    // Re-evaluate staleness every 15s
    const interval = setInterval(() => {
      setPresenceMap((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const [id, d] of latestDataRef.current) {
          const evaluated = evaluateUser(d);
          const existing = prev.get(id);
          if (existing?.isOnline !== evaluated.isOnline) {
            next.set(id, evaluated);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 15_000);

    const dataRef = latestDataRef.current;
    return () => {
      unsubs.forEach((u) => u());
      clearInterval(interval);
      dataRef.clear();
    };
  }, [telegramIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return presenceMap;
}
