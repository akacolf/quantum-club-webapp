import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth
} from "firebase/auth";
import { 
  ensureFirebaseInitialized, 
  getFirebaseAuth,
  persistAuthUser, 
  getPersistedUser 
} from "~/lib/firebase/client";
import { useState, useEffect } from "react";

// Get auth instance (async)
async function getAuth(): Promise<Auth> {
  await ensureFirebaseInitialized();
  return getFirebaseAuth();
}

// Sign in with email and password
export async function signInWithEmail(email: string, password: string) {
  try {
    const auth = await getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Persist user data
    await persistAuthUser(userCredential.user);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    let message = "Login failed";
    if (error.code === "auth/user-not-found") {
      message = "No account found with this email";
    } else if (error.code === "auth/wrong-password") {
      message = "Incorrect password";
    } else if (error.code === "auth/invalid-email") {
      message = "Invalid email address";
    } else if (error.code === "auth/too-many-requests") {
      message = "Too many attempts. Please try again later";
    } else if (error.code === "auth/invalid-credential") {
      message = "Invalid email or password";
    }
    return { user: null, error: { message, code: error.code } };
  }
}

// Sign up with email and password
export async function signUpWithEmail(email: string, password: string, name?: string) {
  try {
    const auth = await getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update display name if provided
    if (name && userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
    }
    
    // Persist user data
    await persistAuthUser(userCredential.user);
    
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    let message = "Registration failed";
    if (error.code === "auth/email-already-in-use") {
      message = "An account with this email already exists";
    } else if (error.code === "auth/invalid-email") {
      message = "Invalid email address";
    } else if (error.code === "auth/weak-password") {
      message = "Password is too weak. Use at least 6 characters";
    }
    return { user: null, error: { message, code: error.code } };
  }
}

// Sign out
export async function signOut() {
  try {
    const auth = await getAuth();
    await firebaseSignOut(auth);
    await persistAuthUser(null);
    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
}

// Get current user (async)
export async function getCurrentUser(): Promise<User | null> {
  const auth = await getAuth();
  return auth.currentUser;
}

// Subscribe to auth state changes
export async function onAuthStateChange(callback: (user: User | null) => void) {
  const auth = await getAuth();
  return onAuthStateChanged(auth, callback);
}

// Export for backwards compatibility
export const signIn = {
  email: async ({ email, password }: { email: string; password: string }) => {
    return signInWithEmail(email, password);
  }
};

export const signUp = {
  email: async ({ email, password, name }: { email: string; password: string; name?: string }) => {
    return signUpWithEmail(email, password, name);
  }
};

// useSession hook for React components
export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function init() {
      try {
        // Initialize Firebase first
        await ensureFirebaseInitialized();
        const auth = getFirebaseAuth();
        
        // Check for persisted user on mount
        const persistedUser = await getPersistedUser();
        if (persistedUser && !auth.currentUser) {
          // We have persisted data but no current user - user needs to re-auth
          setLoading(false);
        }

        unsubscribe = onAuthStateChanged(auth, async (user) => {
          setUser(user);
          await persistAuthUser(user);
          setLoading(false);
        });
      } catch (error) {
        console.error("Auth initialization error:", error);
        setLoading(false);
      }
    }

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return {
    data: user ? { user } : null,
    isPending: loading,
    error: null,
  };
}
