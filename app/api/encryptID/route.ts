// app/api/encrypt/route.js
import { NextRequest, NextResponse } from 'next/server';
import { createCipheriv } from 'node:crypto';

export async function POST(request:NextRequest) {
  try {
    const session = request.cookies.get('session')?.value
    if(!session) {
        return NextResponse.json("Session timeout",{status:400})
    }
    // 1. Receive the ID from request
    const {input} = await request.json();
    if (!input) {
      return NextResponse.json(
        { error: "Telegram ID is requested" },
        { status: 400 }
      );
    }

    if (!input) {
      return NextResponse.json(
        { error: "Could not find Telegram ID" },
        { status: 400 }
      ); 
    }

    // 5. Encryption with AES-256-GCM
    const encryptionKey = Buffer.from(process.env.AES_ENCRYPTION_KEY!, 'base64'); // 32 byte
    const iv = Buffer.from("00000000000000000000000000000000",'utf8') // GCM için 12 byte IV
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