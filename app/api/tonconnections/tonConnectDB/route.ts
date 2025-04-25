import { NextResponse } from 'next/server';
import admin from "firebase-admin"
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(req) {
  try {
    const session = req.cookies.get('session')?.value
    if(!session) {
        return NextResponse.json("Session invalid",{status:400})
    }
      const body=await req.json();
      const {
    userId,
    walletAddress,
    address
    } = body
      console.log(userId);
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 400 });
    }  
    const walletData = await admin.firestore().collection("userAddresses").doc(userId)
  if((await walletData.get()).data()){
    walletData.update({
      address: address,
      walletAddress: walletAddress,
    })
  }else{
    console.log("Created new wallet")
    walletData.set({
      address: address,
      walletAddress: walletAddress,
    })
  }
      console.log("Wallet setted in firestore");
      return NextResponse.json(walletAddress,{status:200})
  } catch (error) {
    console.error('Cron job hatası:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}