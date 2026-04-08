"use client";

import { create } from "zustand";
import { auth, dbfs } from "@/app/(firebase)/client";
import { doc, onSnapshot } from "firebase/firestore";
import {
  signInWithCustomToken,
  type User,
  type ParsedToken,
} from "firebase/auth";
import { removeToken, setToken } from "@/app/(contexts)/actions";
import { clearMnemonicCache } from "@/lib/secure-mnemonic";
import { useUserStore } from "@/stores/user-store";
import { useWalletStore } from "@/stores/wallet-store";
import { useGroupsStore } from "@/stores/groups-store";
import { useTradingStore } from "@/stores/trading-store";
import { useLeaderboardStore } from "@/stores/leaderboard-store";
import { useFrensStore } from "@/stores/frens-store";
import { useCallStore } from "@/stores/call-store";
import { queryClient } from "@/lib/query-client";

// =====================================================
// Helpers
// =====================================================

/** Clear user-specific localStorage keys to prevent stale data across accounts.
 *  `keepLoggedIn` is intentionally preserved so the auth listener can detect
 *  that the user explicitly signed out (value "false") vs a fresh install
 *  (value absent → defaults to true). */
function clearUserLocalStorage() {
  if (typeof window === "undefined") return;
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (
      key.startsWith("QAmount_") ||
      key.startsWith("daily_") ||
      key.startsWith("rank_") ||
      key.startsWith("walletAddress_") ||
      key.startsWith("qcUsername_") ||
      key === "username" ||
      key === "telegramId" ||
      key === "telegramIdNM" ||
      key === "lastactivetime" ||
      key === "miningTime"
    ) {
      localStorage.removeItem(key);
    }
  }
  sessionStorage.clear();
  useUserStore.getState().reset();
}

// =====================================================
// Store
// =====================================================

interface AuthState {
  currentUser: User | null;
  authLoading: boolean;
  customClaims: ParsedToken | null;
  keepLoggedIn: boolean;
}

interface AuthActions {
  setKeepLoggedIn: (value: boolean) => void;
  logout: () => Promise<void>;
  loginWithToken: (customToken: string) => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

/**
 * Flag to prevent onAuthStateChanged from signing out the user
 * during an active login flow when keepLoggedIn is false.
 * Stored outside the Zustand store because it's a synchronization
 * primitive, not UI state.
 */
let isExplicitLogin = false;

/** Track the last token sent to setToken to dedup cookie writes — each one
 *  triggers a Next.js router refresh. */
let lastSetTokenValue: string | null = null;

// =====================================================
// Force re-auth listener (real-time via Firestore onSnapshot)
// =====================================================

let forceAuthUnsubscribe: (() => void) | null = null;

function teardownForceAuthListener() {
  forceAuthUnsubscribe?.();
  forceAuthUnsubscribe = null;
}

function setupForceAuthListener() {
  teardownForceAuthListener();

  const settingsRef = doc(dbfs, "set", "settings");
  forceAuthUnsubscribe = onSnapshot(settingsRef, (snap) => {
    const remoteVersion = snap.data()?.forceAuthVersion;
    if (!remoteVersion) return;

    const localVersion = localStorage.getItem("forceAuthVersion");
    if (localVersion === null) {
      // First time seeing this — store it without forcing logout
      localStorage.setItem("forceAuthVersion", String(remoteVersion));
      return;
    }

    if (String(remoteVersion) !== localVersion) {
      localStorage.setItem("forceAuthVersion", String(remoteVersion));
      teardownForceAuthListener();
      // Clear auth cookies + sign out, then hard redirect.
      // Don't reset Zustand/localStorage here — it triggers re-renders
      // that flash zeroed data. The full page reload handles cleanup.
      Promise.all([
        auth.signOut(),
        removeToken().catch(() => {}),
      ]).finally(() => {
        window.location.href = "/";
      });
    }
  }, () => {}); // Silently ignore snapshot errors (offline, permissions)
}

export const useAuthStore = create<AuthStore>()((set) => ({
  currentUser: null,
  authLoading: true,
  customClaims: null,
  keepLoggedIn: true,

  setKeepLoggedIn: (value) => {
    set({ keepLoggedIn: value });
    if (typeof window !== "undefined") {
      localStorage.setItem("keepLoggedIn", JSON.stringify(value));
    }
  },

  logout: async () => {
    clearUserLocalStorage();
    clearMnemonicCache();
    teardownForceAuthListener();
    // Reset all user-specific stores to prevent stale data on re-login
    useWalletStore.getState().resetBalances();
    useTradingStore.setState({
      trendingTokens: [], newTokens: [], graduatedTokens: [],
      searchResults: [], myTokens: [], positions: [], selectedToken: null,
    });
    useGroupsStore.setState({ groups: [], myGroupIds: new Set<string>(), loading: false });
    useLeaderboardStore.setState({ leaderboardContext: [], userRank: null, totalUsers: null, totalQuant: "" });
    useFrensStore.setState({ referralsContext: [], referralsNum: 0 });
    useCallStore.setState({ callState: "idle", callInfo: null, groupCallState: "idle", groupCallInfo: null });
    queryClient.clear();
    lastSetTokenValue = null;
    try { await removeToken(); } catch {}
    await auth.signOut();
  },

  loginWithToken: async (customToken) => {
    isExplicitLogin = true;
    const cred = await signInWithCustomToken(auth, customToken);
    await cred.user.getIdToken(true);
  },
}));

// =====================================================
// Firebase Auth listener (called once by AuthProvider)
// =====================================================

export function initAuthListener() {
  // Load keepLoggedIn preference from localStorage
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("keepLoggedIn");
    if (stored !== null) {
      useAuthStore.setState({ keepLoggedIn: JSON.parse(stored) });
    }
  }

  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    const storedKeep =
      typeof window !== "undefined"
        ? localStorage.getItem("keepLoggedIn")
        : null;
    const shouldKeep = storedKeep !== null ? JSON.parse(storedKeep) : true;

    if (user && !shouldKeep && !isExplicitLogin) {
      await auth.signOut();
      try { await removeToken(); } catch {}
      useAuthStore.setState({
        currentUser: null,
        authLoading: false,
      });
      return;
    }
    isExplicitLogin = false;

    // Only set authLoading on the INITIAL auth check (when currentUser is null).
    // Subsequent onAuthStateChanged calls (token refresh) should NOT flash loading.
    const isInitialAuth = useAuthStore.getState().currentUser === null;
    if (user && isInitialAuth) {
      useAuthStore.setState({ authLoading: true });
    }
    useAuthStore.setState({ currentUser: user ?? null });

    if (user) {
      try {
        const tokenResult = await user.getIdTokenResult();
        const token = tokenResult.token;
        const refreshToken = user.refreshToken;
        const claims = tokenResult.claims;
        useAuthStore.setState({ customClaims: claims ?? null });

        // Keep the Firebase token cookie in sync with the live token. The
        // dedup on lastSetTokenValue prevents redundant cookie writes (each
        // write triggers a Next.js router refresh).
        if (token && refreshToken && token !== lastSetTokenValue) {
          const result = await setToken({ token, refreshToken });
          if (result?.serverError) {
            const freshResult = await user.getIdTokenResult(true);
            const retryResult = await setToken({
              token: freshResult.token,
              refreshToken: user.refreshToken,
            });
            if (retryResult?.serverError) {
              console.error(
                "Failed to set auth cookie after retry — signing out"
              );
              await auth.signOut();
              try { await removeToken(); } catch {}
              useAuthStore.setState({
                currentUser: null,
                authLoading: false,
              });
              return;
            }
            lastSetTokenValue = freshResult.token;
          } else {
            lastSetTokenValue = token;
          }
        }
      } catch {
        console.error("Failed to retrieve auth token — signing out");
        await auth.signOut();
        try { await removeToken(); } catch {}
        useAuthStore.setState({
          currentUser: null,
          authLoading: false,
        });
        return;
      }
    } else {
      lastSetTokenValue = null;
      try { await removeToken(); } catch {}
    }
    useAuthStore.setState({ authLoading: false });

    // Real-time force re-auth listener — logs user out immediately
    // when forceAuthVersion is bumped in Firestore
    if (user) {
      setupForceAuthListener();
    }
  });

  // Safety timeout: if onAuthStateChanged never fires, stop loading after 5s
  const timeout = setTimeout(
    () => useAuthStore.setState({ authLoading: false }),
    5000
  );

  return () => {
    unsubscribe();
    clearTimeout(timeout);
  };
}
