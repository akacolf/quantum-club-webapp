"use client";

import { create } from "zustand";
import { env } from "@/env";
import { auth, dbfs } from "@/app/(firebase)/client";
import { doc, getDoc } from "firebase/firestore";
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
import { useUserStore } from "@/stores/user-store";
import { queryClient } from "@/lib/query-client";

// =====================================================
// Helpers
// =====================================================

/** Clear user-specific localStorage keys to prevent stale data across accounts. */
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
      key === "keepLoggedIn" ||
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

    // Deferred: check force re-auth version
    if (user) {
      (async () => {
        try {
          const settingsRef = doc(dbfs, "set", "settings");
          const settingsSnap = await getDoc(settingsRef);
          const remoteVersion = settingsSnap.data()?.forceAuthVersion;
          const localVersion = localStorage.getItem("forceAuthVersion");
          if (remoteVersion && localVersion === null) {
            localStorage.setItem("forceAuthVersion", String(remoteVersion));
          }
          if (
            remoteVersion &&
            localVersion !== null &&
            String(remoteVersion) !== localVersion
          ) {
            localStorage.setItem("forceAuthVersion", String(remoteVersion));
            clearUserLocalStorage();
            await auth.signOut();
            try { await removeToken(); } catch {}
            useAuthStore.setState({ currentUser: null });
          }
        } catch {}
      })();
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
