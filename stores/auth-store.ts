"use client";

import { create } from "zustand";
import { env } from "@/env";
import { auth, dbfs } from "@/app/(firebase)/client";
import { doc, onSnapshot } from "firebase/firestore";
import {
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithCredential,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithCredential,
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
  loginWithEmail: (email: string, password: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<void>;
  linkEmailToAccount: (email: string, password: string) => Promise<void>;
  linkGoogleToAccount: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

/**
 * Flag to prevent onAuthStateChanged from signing out the user
 * during an active login flow when keepLoggedIn is false.
 * Stored outside the Zustand store because it's a synchronization
 * primitive, not UI state.
 */
let isExplicitLogin = false;

/** Track the last token sent to setToken to avoid redundant cookie writes.
 *  Each cookie write triggers a Next.js router refresh, so duplicates cause
 *  visible "double loader" flashes. */
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

  loginWithEmail: async (email, password) => {
    isExplicitLogin = true;
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  signUpWithEmail: async (email, password) => {
    isExplicitLogin = true;
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  loginWithGoogle: async () => {
    isExplicitLogin = true;
    return new Promise<void>((resolve, reject) => {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/userinfo.profile",
        callback: async (tokenResponse: any) => {
          try {
            const credential = GoogleAuthProvider.credential(
              null,
              tokenResponse.access_token
            );
            await signInWithCredential(auth, credential);
            resolve();
          } catch (error) {
            console.error("Google sign-in error:", error);
            reject(error);
          }
        },
      });
      client.requestAccessToken();
    });
  },

  linkEmailToAccount: async (email, password) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No user signed in");
    const credential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(user, credential);
    // Reload the user so currentUser.email is populated immediately
    await user.reload();
    set({ currentUser: { ...auth.currentUser! } as User });
  },

  linkGoogleToAccount: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("No user signed in");
    return new Promise<void>((resolve, reject) => {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/userinfo.profile",
        callback: async (tokenResponse: any) => {
          try {
            const credential = GoogleAuthProvider.credential(
              null,
              tokenResponse.access_token
            );
            await linkWithCredential(user, credential);
            await user.reload();
            set({ currentUser: { ...auth.currentUser! } as User });
            resolve();
          } catch (error) {
            reject(error);
          }
        },
      });
      client.requestAccessToken();
    });
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
    // Capture before reset — we need to know if this was triggered by
    // an explicit login or a cached session restore.
    const wasExplicitLogin = isExplicitLogin;
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

        // Only write the auth cookie on EXPLICIT logins (user clicked sign-in).
        // On cached session restores the cookie from the previous login is still
        // valid (30-day expiry). Writing cookies via server actions triggers a
        // Next.js router refresh, which causes a visible "double loader" flash
        // when it races with the redirect to /home.
        if (token && refreshToken && wasExplicitLogin && token !== lastSetTokenValue) {
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
