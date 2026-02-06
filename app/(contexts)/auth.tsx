"use client"

import { auth } from "@/app/(firebase)/client";
import { isSignInWithEmailLink, ParsedToken, sendSignInLinkToEmail, signInWithCustomToken, signInWithEmailLink, updateEmail, User  } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react"
import { removeToken, setToken, updateUserPassword } from "./actions";
import { updatePassword } from "firebase/auth";
type AuthContextType = {
    currentUser: User | null;
    logout: () => Promise<void>
    loginWithToken: (customToken:string) => Promise<void>;
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
            configPassword
        }}>
        {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext)