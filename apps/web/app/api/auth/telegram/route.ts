import admin from 'firebase-admin';
import { NextRequest } from 'next/server';
import { decrypt } from '@/utils/session';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID!,
            privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        }),
    }); 
}

export async function POST(req:NextRequest) {
    try {
        // Validate session
        const sessionCookie = req.cookies.get('session')?.value;
        if (!sessionCookie) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        let sessionData;
        try {
            sessionData = await decrypt(sessionCookie);
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
        }

        // Get the authenticated telegramId from session (source of truth)
        const telegramId = String(sessionData.user.telegramId);
        if (!telegramId) {
            return new Response(JSON.stringify({ error: 'User not authenticated' }), { status: 401 });
        }

        // Create custom token using the validated telegramId from session
        const customToken = await admin.auth().createCustomToken(telegramId);
        return new Response(JSON.stringify({ customToken }), { status: 200 });
    } catch (error) {
        console.error('Error creating custom token:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
