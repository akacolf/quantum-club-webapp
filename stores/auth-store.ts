"use client";

import { create } from "zustand";
import { auth } from "@/app/(firebase)/client";
import {
  signInWithCustomToken,
  type User,
} from "firebase/auth";
import { removeToken, setToken } from "@/app/(contexts)/actions";

// =====================================================
// Store
// =====================================================

interface AuthState {
  currentUser: User | null;
  authLoading: boolean;
}

interface AuthActions {
  loginWithToken: (customToken: string) => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

/**
 * Set to true by loginWithToken before signInWithCustomToken, then captured
 * and reset by the onAuthStateChanged listener. Gates the setToken cookie
 * write: only explicit logins refresh the Firebase auth cookie. On cached
 * session restores (cold start with Firebase IndexedDB intact) the existing
 * cookie is still valid and writing it again would trigger a Next.js router
 * refresh, causing a visible double-loader on /home.
 */
let isExplicitLogin = false;

export const useAuthStore = create<AuthStore>()(() => ({
  currentUser: null,
  authLoading: true,

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
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    // Capture before reset — the setToken gate below needs to distinguish
    // between an explicit login (user just called loginWithToken) and a
    // cached session restore (Firebase restored the user from IndexedDB).
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
        // Only write the Firebase auth cookie on EXPLICIT logins. On cached
        // session restores the existing cookie is still valid, and writing
        // it via a server action would trigger a Next.js router refresh,
        // causing a visible double-loader flash on /home.
        if (wasExplicitLogin) {
          const tokenResult = await user.getIdTokenResult();
          const token = tokenResult.token;
          const refreshToken = user.refreshToken;

          if (token && refreshToken) {
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
            }
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
      try { await removeToken(); } catch {}
    }
    useAuthStore.setState({ authLoading: false });
  });

  // Safety timeout: if onAuthStateChanged never fires (Firebase broken or
  // offline), stop loading after 1.5s. Firebase normally fires the listener
  // within ~50ms of subscription, so 1.5s is a ~30x margin.
  const timeout = setTimeout(
    () => useAuthStore.setState({ authLoading: false }),
    1500
  );

  return () => {
    unsubscribe();
    clearTimeout(timeout);
  };
}
