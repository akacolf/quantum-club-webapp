import { getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from "firebase/firestore";
import { Database, getDatabase } from "firebase/database";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getPerformance, FirebasePerformance } from "firebase/performance";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID
};

const currentApps = getApps();
let auth: Auth;
let dbfs: Firestore;
let database: Database;
let analytics: Analytics | undefined;
let perf: FirebasePerformance | undefined;
if (!currentApps.length) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  dbfs = getFirestore(app);
  database = getDatabase(app);
  analytics = typeof window !== "undefined" ? getAnalytics(app) : undefined;
  perf = typeof window !== "undefined" ? getPerformance(app) : undefined;
} else {
  const app = currentApps[0];
  auth = getAuth(app);
  dbfs = getFirestore(app);
  database = getDatabase(app);
  analytics = getAnalytics(app);
  perf = getPerformance(app);
}

export { auth, dbfs, database, analytics, perf };
