import { getApps, initializeApp, FirebaseApp } from "firebase/app";
import { 
  Auth, 
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  browserSessionPersistence
} from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { Database, getDatabase } from "firebase/database";
import { FirebaseStorage, getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Firebase config - these values should match your web app config
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

// Custom persistence layer using AsyncStorage
const reactNativePersistence = (storage: typeof ReactNativeAsyncStorage) => ({
  type: "LOCAL" as const,
  _isAvailable: async () => {
    try {
      await storage.setItem("__persistence_test__", "test");
      await storage.removeItem("__persistence_test__");
      return true;
    } catch {
      return false;
    }
  },
  _set: async (key: string, value: any) => {
    await storage.setItem(key, JSON.stringify(value));
  },
  _get: async (key: string) => {
    const value = await storage.getItem(key);
    return value ? JSON.parse(value) : null;
  },
  _remove: async (key: string) => {
    await storage.removeItem(key);
  },
  _addListener: (_key: string, _listener: any) => () => {},
  _shouldAllowMigration: true,
});

const currentApps = getApps();

if (!currentApps.length) {
  app = initializeApp(firebaseConfig);
  // Initialize Auth with custom persistence for React Native
  auth = initializeAuth(app, {
    persistence: reactNativePersistence(ReactNativeAsyncStorage) as any,
  });
} else {
  app = currentApps[0];
  auth = getAuth(app);
}

dbfs = getFirestore(app);
database = getDatabase(app);
storage = getStorage(app);

export { app, auth, dbfs, database, storage };
