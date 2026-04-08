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

// =====================================================
// Store
// =====================================================

interface AuthState {
  currentUser: User | null;
  authLoading: boolean;
  customClaims: ParsedToken | null;
}

interface AuthActions {
  loginWithToken: (customToken: string) => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

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

export const useAuthStore = create<AuthStore>()(() => ({
  currentUser: null,
  authLoading: true,
  customClaims: null,

  loginWithToken: async (customToken) => {
    const cred = await signInWithCustomToken(auth, customToken);
    await cred.user.getIdToken(true);
  },
}));

// =====================================================
// Firebase Auth listener (called once by AuthProvider)
// =====================================================

export function initAuthListener() {
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
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
