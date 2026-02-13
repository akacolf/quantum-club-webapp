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

  return { setCurrentChat };
}

/**
 * Subscribe to another user's presence data.
 */
export function useUserPresence(telegramId: string | null): PresenceData | null {
  const [presence, setPresence] = useState<PresenceData | null>(null);

  useEffect(() => {
    if (!telegramId) return;
    const ref = doc(dbfs, "qc-presence", telegramId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setPresence({
          isOnline: d.isOnline || false,
          lastSeen: d.lastSeen || null,
          currentChatId: d.currentChatId || null,
        });
      }
    }, () => {
      // Silently handle permission errors (e.g. auth not yet ready)
    });
    return () => unsub();
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
