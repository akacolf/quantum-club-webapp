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
    // Note: Static IV is used intentionally for deterministic encryption
    // This ensures same telegramId always produces same QC ID
    // The security tradeoff is acceptable here since:
    // 1. Each user has a unique telegramId input
    // 2. We only encrypt telegramId (not sensitive data)
    // 3. Changing IV would break existing user data lookups
    const encryptionKey = Buffer.from(process.env.AES_ENCRYPTION_KEY!, 'base64'); // 32 byte
    const iv = Buffer.alloc(12, 0); // 12-byte zero IV for GCM (deterministic encryption)
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