import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// Get the API URL from environment or use default
const getBaseURL = () => {
  // In development, use the local dev server
  if (__DEV__) {
    // Get the host machine's IP for Expo Go
    const debuggerHost = Constants.expoConfig?.hostUri?.split(":")[0];
    if (debuggerHost) {
      return `http://${debuggerHost}:3000`;
    }
    return "http://localhost:3000";
  }
  // In production, use the production API
  return process.env.EXPO_PUBLIC_API_URL || "https://quantumclub.app";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    expoClient({
      scheme: "quantumclub",
      storagePrefix: "quantum_club",
      storage: SecureStore,
    }),
  ],
});

// Export commonly used methods
export const { signIn, signUp, signOut, useSession } = authClient;
