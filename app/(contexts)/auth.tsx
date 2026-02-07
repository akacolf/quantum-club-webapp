"use client"

import { auth } from "@/app/(firebase)/client";
import { getAuth, GoogleAuthProvider, isSignInWithEmailLink, ParsedToken, sendSignInLinkToEmail, signInWithCredential, signInWithCustomToken, signInWithEmailLink, signInWithPopup, signInWithRedirect, updateEmail, User  } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react"
import { removeToken, setToken, updateUserPassword } from "./actions";
type AuthContextType = {
    currentUser: User | null;
    logout: () => Promise<void>
    loginWithToken: (customToken:string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    customClaims: ParsedToken|null;
    configPassword:(customToken:string) =>Promise<void>;
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
        const tokenResult = await auth?.currentUser?.getIdTokenResult()
        const token = tokenResult?.token
        if(!token) return;
        updateUserPassword(token)
    }
   return ( 
    <AuthContext.Provider 
        value={{
            currentUser,
            logout,
            customClaims,
            loginWithToken,
            loginWithGoogle,
            configPassword
        }}>
        {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext)