"use server"

import { z } from "zod";
import { auth } from "@/app/(firebase)/server";
import { cookies } from "next/headers";
import { actionClient, authActionClient } from "@/lib/safe-action";

export const removeToken = actionClient.action(async () => {
    const cookieStore = await cookies();
    cookieStore.delete("firebaseAuthToken");
    cookieStore.delete("firebaseAuthRefreshToken");
    cookieStore.delete("session");
});

export const setToken = actionClient
    .schema(z.object({
        token: z.string().min(1),
        refreshToken: z.string().min(1),
    }))
    .action(async ({ parsedInput: { token, refreshToken } }) => {
        const verifiedToken = await auth.verifyIdToken(token);
        if (!verifiedToken) {
            throw new Error("Token verification failed");
        }

        const userRecord = await auth.getUser(verifiedToken.uid);
        if (!userRecord.uid) {
            throw new Error("User record not found");
        }

        // Cap cookie lifetime to token expiry (Firebase ID tokens live ~1 hour,
        // but client refreshes them — the refresh token cookie keeps the session alive)
        const tokenExpirySeconds = Math.max(0, verifiedToken.exp - Math.floor(Date.now() / 1000));
        const maxAge = 30 * 24 * 60 * 60; // 30 days for refresh token
        const cookieStore = await cookies();
        cookieStore.set("firebaseAuthToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: tokenExpirySeconds, // Scoped to actual token expiry
        });
        cookieStore.set("firebaseAuthRefreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge,
        });
    });

export const updateUserPassword = authActionClient
    .schema(z.object({
        token: z.string().min(1),
        newPassword: z.string().min(6, "Password must be at least 6 characters"),
    }))
    .action(async ({ parsedInput: { token, newPassword } }) => {
        const verifiedToken = await auth.verifyIdToken(token);
        const userRecord = await auth.getUser(verifiedToken.uid);
        if (!userRecord) return;
        await auth.updateUser(verifiedToken.uid, {
            password: newPassword,
        });
    });
