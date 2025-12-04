import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST() {

  const users = await admin.firestore().collection("user").get()
  let value = 1;
  for(const doc of users.docs) {
    if(value ===60) {
      return;
    }
    const userId = doc.ref.path.split('/')[1];
    const userRef = admin.firestore().collection("user").doc("qYsmB7MknlLJQ").collection("referrals").doc(userId)
    await userRef.set({
      telegramId: userId
    })
    value++
  }
  return NextResponse.json("Completely")
  
}