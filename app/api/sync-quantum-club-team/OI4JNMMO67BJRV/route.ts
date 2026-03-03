import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { env } from '@/env';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export async function GET(req:NextRequest) {
  try {
      if (req.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json(
          { error: 'Unauthorized' }, // next response will handle the error //
          { status: 401 }
        );
      }
    
    // Tüm kullanıcıları QuantAmount'a göre sırala
    const usersSnapshot = await admin.firestore()
      .collection('userRanks')
      .orderBy('QuantAmount', 'desc')
      .get();

    // Kullanıcı sıralamasını hesapla ve userRanks koleksiyonuna kaydet
    let rank = 1;
    const batch = admin.firestore().batch(); // Toplu işlem (batch) başlat
    for (const doc of usersSnapshot.docs) {
      const userId = doc.ref.path.split('/')[1]; // /user/{userId}/miningData/{docId}
      // userRanks koleksiyonuna sıralamayı kaydet
      const userRankRef = admin.firestore().collection('userRanks').doc(userId);
      batch.update(userRankRef, {
        rank,
      });

      rank++;
    }

    // Toplu işlemi tamamla
    await batch.commit();

    return NextResponse.json(
      { message: 'User ranks have been updated successfully' },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}