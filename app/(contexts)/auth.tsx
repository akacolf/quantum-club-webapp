"use client"

import { auth } from "@/app/(firebase)/client";
import { ParsedToken, User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react"
import { removeToken, setToken } from "./actions";
type AuthContextType = {
    currentUser: User | null;
    logout: () => Promise<void>
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
   return ( 
    <AuthContext.Provider 
        value={{
            currentUser,
            logout,
            customClaims,
        }}>
        {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext)