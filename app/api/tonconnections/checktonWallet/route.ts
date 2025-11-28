import admin from "firebase-admin"
import { NextRequest, NextResponse } from "next/server";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}
export async function POST(req:NextRequest) {
    const body = await req.json()
    const { telegramIdEncrypted } = body;
    const session = req.cookies.get('session')?.value
    if(!session) {
        return NextResponse.json("Session invalid",{status:400})
    }
    if(!telegramIdEncrypted) {
        return NextResponse.json("Data error",{status:400})
    }
    const wallet = await admin.firestore().collection("userAddresses").doc(telegramIdEncrypted).get()
    if(wallet.data() &&wallet.data()?.address !=="") {
        const walletAddressDB = wallet.data()?.address
        return NextResponse.json({haveWallet:true,address:walletAddressDB})
    }else{
        return NextResponse.json({haveWallet:false,address:""})
    }
}