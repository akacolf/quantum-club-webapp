import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { decrypt } from '@/utils/session';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request:NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;
    if(!sessionCookie) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Decrypt and validate session - derive telegramId from session, not request
    let sessionData;
    try {
        sessionData = await decrypt(sessionCookie);
    } catch {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const telegramId = sessionData.user?.telegramId;
    if (!telegramId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    const valuesSnapshot = await admin.firestore()
      .collection('userRanks') 
      .orderBy('QuantAmount', 'desc')
      .limit(50)
      .get();

    const allValues = [];

    let rank = 0;
    for (const doc of valuesSnapshot.docs) {
      if(doc.data().userId === telegramId){
        rank = doc.data().rank 
      }
        allValues.push({
          username:doc.data().username,
          QuantAmount: Math.round(doc.data().QuantAmount),
        });
    }
    
    const colsnap = admin.firestore().collectionGroup('miningData');

    const snapshot = await colsnap
    .aggregate({
      totalAmount: admin.firestore.AggregateField.sum('QuantAmount'),
    })
    .get();


    const totalAmount = Math.round(snapshot.data().totalAmount);
    const usersnapshot = await admin.firestore().collection("user").count().get()
    const userCount = usersnapshot.data().count
    return NextResponse.json({allValues,totalAmount,rank,userCount}, { status: 200 });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}