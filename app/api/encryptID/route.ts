// app/api/encrypt/route.js
import { NextRequest, NextResponse } from 'next/server';
import { createCipheriv } from 'node:crypto';
import { decrypt } from '@/utils/session';

export async function POST(request:NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;
    if(!sessionCookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Decrypt and validate session
    let sessionData;
    try {
        sessionData = await decrypt(sessionCookie);
    } catch {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    // Only encrypt the authenticated user's own telegramId - ignore any input
    const telegramId = sessionData.user?.telegramId;
    if (!telegramId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    const input = String(telegramId);

    // 5. Encryption with AES-256-GCM
    // Security: Use deterministic IV derived from input to ensure same input = same output
    // while still providing cryptographic security (no static IV vulnerability)
    const encryptionKey = Buffer.from(process.env.AES_ENCRYPTION_KEY!, 'base64'); // 32 byte
    const { createHash } = await import('node:crypto');
    // Derive IV from hash of input - deterministic but unique per user
    const ivHash = createHash('sha256').update(input + process.env.AES_ENCRYPTION_KEY!).digest();
    const iv = ivHash.subarray(0, 12); // GCM requires 12 byte IV
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
    
    let encrypted = cipher.update(input, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const telegramIdEncrypted = encrypted
                .replace(/['"]+/g, "")
                .replace(/[^a-zA-Z0-9]/g, "");
    return NextResponse.json(
      {encryptedBase64:telegramIdEncrypted },
      { status: 200 }
    );

  } catch (error) {
    console.error("Encryption error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}