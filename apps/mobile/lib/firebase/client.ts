import { getApps, initializeApp, FirebaseApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { Database, getDatabase } from "firebase/database";
import { FirebaseStorage, getStorage } from "firebase/storage";

// Firebase config - these values should match your web app config
// In production, use expo-constants or a config file
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let dbfs: Firestore;
let database: Database;
let storage: FirebaseStorage;

const currentApps = getApps();

if (!currentApps.length) {
  app = initializeApp(firebaseConfig);
} else {
  app = currentApps[0];
}

auth = getAuth(app);
dbfs = getFirestore(app);
database = getDatabase(app);
storage = getStorage(app);

export { app, auth, dbfs, database, storage };
