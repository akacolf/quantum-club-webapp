"use client"

import { auth } from "@/app/(firebase)/client";
import { GoogleAuthProvider, ParsedToken, signInWithCredential, signInWithCustomToken, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react"
import { removeToken, setToken } from "./actions";
type AuthContextType = {
    currentUser: User | null;
    logout: () => Promise<void>
    loginWithToken: (customToken:string) => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<User>;
    signUpWithEmail: (email: string, password: string) => Promise<User>;
    loginWithGoogle: () => Promise<void>;
    customClaims: ParsedToken|null;
}
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({children}:    {children: React.ReactNode}) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [customClaims,setCustomClaims] = useState<ParsedToken | null>(null)
    useEffect(() =>{
        const unsubscribe = auth.onAuthStateChanged(async(user) => {
            setCurrentUser(user ?? null);
            if(user){
                const tokenResult = await user.getIdTokenResult();
                const token = tokenResult.token;
                const refreshToken = user.refreshToken;
                const claims = tokenResult.claims;
                setCustomClaims(claims ?? null);
                if(token &&refreshToken){
                    await setToken({
                        token,refreshToken
                    });
                }
            }else{
                await removeToken();
            }
        });

        return () =>unsubscribe();
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
    const client = window.google.accounts.oauth2.initTokenClient({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/userinfo.profile',
    callback: (tokenResponse) => {
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
    const configPassword = async()=>{
        // Password configuration handled via Firebase password reset email
    }
   return ( 
    <AuthContext.Provider 
        value={{
            currentUser,
            logout,
            customClaims,
            loginWithToken,
            loginWithEmail,
            signUpWithEmail,
            loginWithGoogle,
        }}>
        {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext)