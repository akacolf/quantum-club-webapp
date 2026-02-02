import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth } from "~/lib/firebase/client";

// Sign in with email and password
export async function signInWithEmail(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update display name if provided
    if (name && userCredential.user) {
      await updateProfile(userCredential.user, { displayName: name });
    }
    
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
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
}

// Get current user
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// Subscribe to auth state changes
export function onAuthStateChange(callback: (user: User | null) => void) {
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
import { useState, useEffect } from "react";

export function useSession() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    data: user ? { user } : null,
    isPending: loading,
    error: null,
  };
}
