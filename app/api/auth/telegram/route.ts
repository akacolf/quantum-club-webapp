import admin from 'firebase-admin';
import { NextRequest } from 'next/server';


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
        
        const body = await req.json();
        const { telegramId } = body;
        if (!telegramId) {
            return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 400 });
        }

        // Custom token oluşturma
        const customToken = await admin.auth().createCustomToken(telegramId);
        return new Response(JSON.stringify({ customToken }), { status: 200 });
    } catch (error) {
        if(error instanceof Error) {
            console.error('Error creating custom token:', error);
            return new Response(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), { status: 500 });
       
        }
    }
}
