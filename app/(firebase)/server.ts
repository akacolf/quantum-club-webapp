import { Firestore, getFirestore } from "firebase-admin/firestore";
import { getApps, ServiceAccount } from "firebase-admin/app";
import admin, { initializeApp } from 'firebase-admin'

// Parse private key - handle escaped newlines from environment variable
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

const serviceAccount = {
  "type": "service_account",
  "project_id": "nekoq-875e2",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": privateKey,
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-k5n4g%40nekoq-875e2.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}


let firestore: Firestore;

try {
  const currentApps = getApps();

  if (!currentApps.length) {
    // Only initialize if we have the required credentials
    if (privateKey && process.env.FIREBASE_CLIENT_EMAIL) {
      const app = initializeApp({
        credential: admin.credential.cert(serviceAccount as ServiceAccount)
      });
      firestore = getFirestore(app);
    } else {
      // During build time, create a dummy firestore reference
      // This will be properly initialized at runtime
      console.warn("Firebase Admin: Missing credentials, using placeholder during build");
      firestore = {} as Firestore;
    }
  } else {
    const app = currentApps[0];
    firestore = getFirestore(app);
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
  // Provide a fallback during build
  firestore = {} as Firestore;
}

export { firestore };
