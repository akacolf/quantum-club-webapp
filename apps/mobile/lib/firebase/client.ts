import { getApps, initializeApp, FirebaseApp } from "firebase/app";
import { 
  Auth, 
  initializeAuth,
  getAuth,
  inMemoryPersistence
} from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { Database, getDatabase } from "firebase/database";
import { FirebaseStorage, getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase config
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
  // Use in-memory persistence and manually handle with AsyncStorage
  auth = initializeAuth(app, {
    persistence: inMemoryPersistence,
  });
} else {
  app = currentApps[0];
  auth = getAuth(app);
}

dbfs = getFirestore(app);
database = getDatabase(app);
storage = getStorage(app);

// Helper to persist auth state manually
export async function persistAuthUser(user: any) {
  if (user) {
    await AsyncStorage.setItem("@auth_user", JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    }));
  } else {
    await AsyncStorage.removeItem("@auth_user");
  }
}

export async function getPersistedUser() {
  const data = await AsyncStorage.getItem("@auth_user");
  return data ? JSON.parse(data) : null;
}

export { app, auth, dbfs, database, storage, AsyncStorage };
