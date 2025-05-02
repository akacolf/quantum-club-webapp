import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request:NextRequest) {
  try {
    const session = request.cookies.get('session')?.value
    if(!session) {
        return NextResponse.json("Session invalid",{status:400})
    }
    const body = await request.json();
    const {telegramId,userName,QuantAmount} = body;
    if (!telegramId) {
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 400 });
    }
        const userRank = await admin.firestore()
      .collection('userRanks')
      .where('QuantAmount', '>', QuantAmount)
      .count()
      .get();

    const rank = userRank.data().count + 1;     
    const userRankRef = admin.firestore().collection('userRanks').doc(telegramId);
    await userRankRef.set( {
        userId:telegramId,
        rank:rank,
        QuantAmount:QuantAmount,
        username:userName,
      },{merge:true});
    console.log(rank);
    return NextResponse.json({rank}, { status: 200 });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}