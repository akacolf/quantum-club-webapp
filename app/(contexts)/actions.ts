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

        const expiresIn = 30 * 24 * 60 * 60; // 30 days in seconds
        const cookieStore = await cookies();
        cookieStore.set("firebaseAuthToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: expiresIn,
        });
        cookieStore.set("firebaseAuthRefreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: expiresIn,
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
