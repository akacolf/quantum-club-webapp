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

// API base URL - this is the only env var we need
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://quantumclub.app";

// Cache for Firebase config
let cachedConfig: any = null;

// Fetch Firebase config from server
export async function fetchFirebaseConfig() {
  if (cachedConfig) return cachedConfig;
  
  try {
    // Try to get from cache first
    const cached = await AsyncStorage.getItem("@firebase_config");
    if (cached) {
      cachedConfig = JSON.parse(cached);
      return cachedConfig;
    }
  } catch (e) {
    // Ignore cache errors
  }

  try {
    const response = await fetch(`${API_URL}/api/mobile/auth`);
    if (response.ok) {
      cachedConfig = await response.json();
      // Cache the config
      await AsyncStorage.setItem("@firebase_config", JSON.stringify(cachedConfig));
      return cachedConfig;
    }
  } catch (e) {
    console.warn("Failed to fetch Firebase config from server");
  }

  // Fallback to env vars if server is unavailable
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_APP_ID,
  };
}

let app: FirebaseApp;
let auth: Auth;
let dbfs: Firestore;
let database: Database;
let storage: FirebaseStorage;
let isInitialized = false;

// Initialize Firebase with config
export async function initializeFirebase() {
  if (isInitialized) return { app, auth, dbfs, database, storage };

  const firebaseConfig = await fetchFirebaseConfig();
  const currentApps = getApps();

  if (!currentApps.length) {
    app = initializeApp(firebaseConfig);
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
  isInitialized = true;

  return { app, auth, dbfs, database, storage };
}

// Synchronous getters (will use cached/initialized values)
// These require initializeFirebase() to be called first
export function getFirebaseApp() { return app; }
export function getFirebaseAuth() { return auth; }
export function getFirebaseFirestore() { return dbfs; }
export function getFirebaseDatabase() { return database; }
export function getFirebaseStorage() { return storage; }

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

// Initialize immediately for backwards compatibility
// This uses fallback env vars initially, then updates when server config is fetched
const fallbackConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_APP_ID,
};

const currentApps = getApps();
if (!currentApps.length) {
  app = initializeApp(fallbackConfig);
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

export { app, auth, dbfs, database, storage, AsyncStorage, API_URL };
