import { getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { Database, getDatabase } from "firebase/database";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { env } from "@/env";

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_SENDER_ID,
  appId: env.NEXT_PUBLIC_APP_ID,
  measurementId: env.NEXT_PUBLIC_MEASUREMENT_ID
};

const currentApps = getApps();
let auth: Auth;
let dbfs: Firestore;
let database: Database;
let storage: FirebaseStorage;

if (!currentApps.length) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  dbfs = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  database = getDatabase(app);
  storage = getStorage(app);
} else {
  const app = currentApps[0];
  auth = getAuth(app);
  dbfs = getFirestore(app);
  database = getDatabase(app);
  storage = getStorage(app);
}

// Lazy-load analytics and performance monitoring after initial paint
let analyticsPromise: Promise<import("firebase/analytics").Analytics | undefined> | undefined;
let perfPromise: Promise<import("firebase/performance").FirebasePerformance | undefined> | undefined;

function initAnalyticsLazy() {
  if (!analyticsPromise && typeof window !== "undefined") {
    analyticsPromise = import("firebase/analytics").then(({ getAnalytics }) => {
      const app = getApps()[0];
      return app ? getAnalytics(app) : undefined;
    }).catch(() => undefined);
  }
  return analyticsPromise;
}

function initPerfLazy() {
  if (!perfPromise && typeof window !== "undefined") {
    perfPromise = import("firebase/performance").then(({ getPerformance }) => {
      const app = getApps()[0];
      return app ? getPerformance(app) : undefined;
    }).catch(() => undefined);
  }
  return perfPromise;
}

// Start lazy init after idle (non-blocking)
if (typeof window !== "undefined") {
  const startLazyInit = () => {
    initAnalyticsLazy();
    initPerfLazy();
  };
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(startLazyInit);
  } else {
    setTimeout(startLazyInit, 3000);
  }
}

export { auth, dbfs, database, storage, initAnalyticsLazy, initPerfLazy };
