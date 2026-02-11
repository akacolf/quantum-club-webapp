"use client"

import { auth } from "@/app/(firebase)/client";
import { GoogleAuthProvider, EmailAuthProvider, ParsedToken, signInWithCredential, signInWithCustomToken, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, linkWithCredential, User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react"
import { removeToken, setToken } from "./actions";
type AuthContextType = {
    currentUser: User | null;
    authLoading: boolean;
    logout: () => Promise<void>
    loginWithToken: (customToken:string) => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<User>;
    signUpWithEmail: (email: string, password: string) => Promise<User>;
    loginWithGoogle: () => Promise<void>;
    linkEmailToAccount: (email: string, password: string) => Promise<void>;
    linkGoogleToAccount: () => Promise<void>;
    customClaims: ParsedToken|null;
    keepLoggedIn: boolean;
    setKeepLoggedIn: (value: boolean) => void;
}
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({children}:    {children: React.ReactNode}) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [customClaims,setCustomClaims] = useState<ParsedToken | null>(null)
    const [keepLoggedIn, setKeepLoggedInState] = useState(true);

    const setKeepLoggedIn = (value: boolean) => {
        setKeepLoggedInState(value);
        if (typeof window !== "undefined") {
            localStorage.setItem("keepLoggedIn", JSON.stringify(value));
        }
    };

    useEffect(() =>{
        // Load keepLoggedIn preference from localStorage
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("keepLoggedIn");
            if (stored !== null) {
                setKeepLoggedInState(JSON.parse(stored));
            }
        }

        const storedKeep = typeof window !== "undefined" ? localStorage.getItem("keepLoggedIn") : null;
        const shouldKeep = storedKeep !== null ? JSON.parse(storedKeep) : true;

        const unsubscribe = auth.onAuthStateChanged(async(user) => {
            if (user && !shouldKeep) {
                // User chose not to stay logged in — sign them out
                await auth.signOut();
                try { await removeToken(); } catch {}
                setCurrentUser(null);
                setAuthLoading(false);
                return;
            }
            setCurrentUser(user ?? null);
            if(user){
                try {
                    const tokenResult = await user.getIdTokenResult();
                    const token = tokenResult.token;
                    const refreshToken = user.refreshToken;
                    const claims = tokenResult.claims;
                    setCustomClaims(claims ?? null);
                    if(token && refreshToken){
                        await setToken({ token, refreshToken });
                    }
                } catch {
                    // Token verification may fail on preview — don't block auth
                }
            }else{
                try { await removeToken(); } catch {}
            }
            setAuthLoading(false);
        });

        // Safety timeout: if onAuthStateChanged never fires, stop loading after 5s
        const timeout = setTimeout(() => setAuthLoading(false), 5000);

        return () => {
            unsubscribe();
            clearTimeout(timeout);
        };
    },[])

    const logout = async () =>{
        await auth.signOut();
    }
    const loginWithToken = async(customToken:string) =>{
      await signInWithCustomToken(auth, customToken);
    }
    const loginWithEmail = async(email: string, password: string): Promise<User> => {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    }
    const signUpWithEmail = async(email: string, password: string): Promise<User> => {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(result.user);
      return result.user;
    }
    const loginWithGoogle = async() =>{
    const client = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/userinfo.profile',
    callback: (tokenResponse: any) => {
      const credential = GoogleAuthProvider.credential(null,tokenResponse.access_token);
      signInWithCredential(auth, credential)
        .then((result) => {
          console.error("Firebase'e giriş yapıldı:", result.user);
        })
        .catch((error) => {
          console.error("Hata:", error);
        });
    },
  });

  // Giriş akışını başlat (Doğrudan Google Popup açar)
    client.requestAccessToken();
    }
    const linkEmailToAccount = async(email: string, password: string): Promise<void> => {
      const user = auth.currentUser;
      if (!user) throw new Error("No user signed in");
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(user, credential);
      await sendEmailVerification(user);
    }
    const linkGoogleToAccount = async(): Promise<void> => {
      const user = auth.currentUser;
      if (!user) throw new Error("No user signed in");
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/userinfo.profile',
        callback: async (tokenResponse: any) => {
          const credential = GoogleAuthProvider.credential(null, tokenResponse.access_token);
          await linkWithCredential(user, credential);
        },
      });
      client.requestAccessToken();
    }
   return ( 
    <AuthContext.Provider 
        value={{
            currentUser,
            authLoading,
            logout,
            customClaims,
            loginWithToken,
            loginWithEmail,
            signUpWithEmail,
            loginWithGoogle,
            linkEmailToAccount,
            linkGoogleToAccount,
            keepLoggedIn,
            setKeepLoggedIn,
        }}>
        {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext)