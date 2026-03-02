"use client";

import { useEffect, useRef } from "react";
import { useUserStore } from "@/stores/user-store";
import { doc, updateDoc } from "firebase/firestore";
import { dbfs } from "@/app/(firebase)/client";

/**
 * On every app session init, compare the Telegram WebApp username
 * with the stored username. If different, update Firestore and the store.
 */
export function useTgUsernameSync() {
  const telegramId = useUserStore((s) => s.telegramId);
  const storedUsername = useUserStore((s) => s.username);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!telegramId || hasChecked.current) return;
    hasChecked.current = true;

    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser?.username) return;

    const tgUsername = tgUser.username;
    if (tgUsername === storedUsername) return;

    // Username changed — update store and Firestore
    useUserStore.getState().setUsername(tgUsername);

    updateDoc(doc(dbfs, "user", telegramId), {
      username: tgUsername,
    }).catch((err) => {
      console.warn("[TgUsernameSync] Failed to update username in Firestore:", err);
    });
  }, [telegramId, storedUsername]);
}
