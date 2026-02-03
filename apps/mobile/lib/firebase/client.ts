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

// API base URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://quantumclub.space";

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
    // Fetch from our Expo API route
    const response = await fetch(`${API_URL}/api/config`);
    if (response.ok) {
      cachedConfig = await response.json();
      // Cache the config
      await AsyncStorage.setItem("@firebase_config", JSON.stringify(cachedConfig));
      return cachedConfig;
    }
  } catch (e) {
    console.warn("Failed to fetch Firebase config from server");
  }

  // Fallback config (for development)
  return null;
}

let app: FirebaseApp;
let auth: Auth;
let dbfs: Firestore;
let database: Database;
let storage: FirebaseStorage;
let isInitialized = false;

// Initialize Firebase with config from server
export async function initializeFirebase() {
  if (isInitialized) return { app, auth, dbfs, database, storage };

  const firebaseConfig = await fetchFirebaseConfig();
  
  if (!firebaseConfig) {
    throw new Error("Failed to load Firebase configuration");
  }

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

// Synchronous getters (require initializeFirebase() first)
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

// Lazy initialization - will be called when Firebase is first accessed
let initPromise: Promise<any> | null = null;

export function ensureFirebaseInitialized() {
  if (!initPromise) {
    initPromise = initializeFirebase();
  }
  return initPromise;
}

// Export for backwards compatibility (initialize on first import)
// These will be undefined until ensureFirebaseInitialized() completes
export { app, auth, dbfs, database, storage, AsyncStorage, API_URL };
