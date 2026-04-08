"use client"

/**
 * Auth Provider (thin wrapper)
 *
 * All state and action logic lives in stores/auth-store.ts.
 * This Provider only initializes the Firebase Auth listener on mount.
 */

import { useEffect } from "react"
import { initAuthListener, useAuthStore } from "@/stores/auth-store"
import { useShallow } from "zustand/shallow"

export { type AuthStore } from "@/stores/auth-store"

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
        const cleanup = initAuthListener();
        return cleanup;
    }, []);

    return <>{children}</>;
}

export const useAuth = () =>
    useAuthStore(
        useShallow((s) => ({
            currentUser: s.currentUser,
            authLoading: s.authLoading,
            customClaims: s.customClaims,
            keepLoggedIn: s.keepLoggedIn,
            setKeepLoggedIn: s.setKeepLoggedIn,
            logout: s.logout,
            loginWithToken: s.loginWithToken,
        }))
    );
