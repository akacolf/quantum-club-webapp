import admin from 'firebase-admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { decrypt, encrypt, SESSION_DURATION } from '@/utils/session';
import { validateTelegramWebAppData } from '@/utils/telegramAuth';
import { createCipheriv } from 'node:crypto';
import { env } from '@/env';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: env.FIREBASE_PROJECT_ID,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
        }),
    });
}

function encryptTelegramId(telegramId: string): string {
    const encryptionKey = Buffer.from(env.AES_ENCRYPTION_KEY, 'base64');
    const iv = Buffer.from("00000000000000000000000000000000", 'utf8');
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
    let encrypted = cipher.update(telegramId, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted.replace(/['"]+/g, "").replace(/[^a-zA-Z0-9]/g, "");
}

export async function POST(req:NextRequest) {
    try {
        let rawTelegramId: string | null = null;
        let sessionSetFromInitData = false;

        const body = await req.json().catch(() => ({}));
        const initData = typeof body?.initData === "string" ? body.initData : "";

        // 1) Preferred: existing session cookie
        const sessionCookie = req.cookies.get('session')?.value;
        if (sessionCookie) {
            try {
                const sessionData = await decrypt(sessionCookie);
                rawTelegramId = String(sessionData.user.telegramId);
            } catch {
                rawTelegramId = null;
            }
        }

        // 2) Fallback: validate initData directly and bootstrap session
        if (!rawTelegramId && initData) {
            const validationResult = validateTelegramWebAppData(initData);
            const user = validationResult.user as { id?: string | number };
            if (!validationResult.validatedData || user?.id == null) {
                return NextResponse.json(
                    { error: validationResult.message || "Invalid Telegram initData" },
                    { status: 401 }
                );
            }
            rawTelegramId = String(user.id);

            const expires = new Date(Date.now() + SESSION_DURATION);
            const session = await encrypt({ user: { telegramId: rawTelegramId }, expires });
            const cookieStore = await cookies();
            cookieStore.set("session", session, {
                expires,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
            });
            sessionSetFromInitData = true;
        }

        if (!rawTelegramId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Create token from validated raw Telegram ID and return deterministic QC ID
        const customToken = await admin.auth().createCustomToken(rawTelegramId);
        const telegramIdEncrypted = encryptTelegramId(rawTelegramId);

        return NextResponse.json(
            { customToken, telegramIdEncrypted, sessionSetFromInitData },
            {
                status: 200,
                headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
            }
        );
    } catch (error) {
        console.error('Error creating custom token:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
