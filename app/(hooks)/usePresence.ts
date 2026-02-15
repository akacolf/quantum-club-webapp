"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
}

/**
 * Manage the current user's online/offline presence.
 * Call once at a high-level layout (e.g. EcosystemLayout).
 */
export function usePresence(telegramId: string | null) {
  const presenceRef = useRef<ReturnType<typeof doc> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!telegramId) return;

    const ref = doc(dbfs, "qc-presence", telegramId);
    presenceRef.current = ref;

    const goOnline = () => {
      setDoc(ref, { isOnline: true, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    };

    const goOffline = () => {
      setDoc(ref, { isOnline: false, lastSeen: serverTimestamp(), currentChatId: null }, { merge: true }).catch(() => {});
    };

    const handleVisibility = () => {
      if (document.hidden) goOffline();
      else goOnline();
    };

    goOnline();
    intervalRef.current = setInterval(goOnline, 60_000);
    window.addEventListener("beforeunload", goOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", goOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      goOffline();
    };
  }, [telegramId]);

  const setCurrentChat = useCallback(
    (chatId: string | null) => {
      if (!presenceRef.current) return;
      setDoc(presenceRef.current, { currentChatId: chatId }, { merge: true }).catch(() => {});
    },
    []
  );

  return { setCurrentChat, presenceRef };
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

  const setCurrentChat = useCallback(
    (chatId: string | null) => {
      if (!presenceRef.current) return;
      setDoc(presenceRef.current, { currentChatId: chatId }, { merge: true }).catch(() => {});
    },
    []
  );

  return { setCurrentChat };
}

/**
 * Subscribe to another user's presence data.
 * Treats a user as offline if lastSeen is stale (>130s old),
 * since the heartbeat fires every 60s.
 */
const HEARTBEAT_STALE_MS = 130_000; // 2× heartbeat + buffer

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

    // Re-evaluate staleness every 30s (heartbeat may not trigger a snapshot update)
    const interval = setInterval(() => {
      if (latestData) setPresence(evaluatePresence(latestData));
    }, 30_000);

    return () => { unsub(); clearInterval(interval); };
  }, [telegramId]);

  return presence;
}

/**
 * Format presence into human-readable text.
 */
export function formatLastSeen(presence: PresenceData | null): string {
  if (!presence) return "";
  if (presence.isOnline) return "online";
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
