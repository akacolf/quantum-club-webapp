"use server"

import { auth } from "@/app/(firebase)/server";
import { cookies } from "next/headers";

export const removeToken = async () =>{
    const cookieStore = await cookies();
    cookieStore.delete("firebaseAuthToken");
    cookieStore.delete("firebaseAuthRefreshToken");

}

export const setToken = async ({
token,refreshToken
}:{
    token:string;
    refreshToken:string;
})=>{
    try{
    const verifiedToken = await auth.verifyIdToken(token);
    if(!verifiedToken){
        return;
    }

    const userRecord = await auth.getUser(verifiedToken.uid)
    if(!userRecord.uid){
        return;
    }
    const cookieStore = await cookies();
    cookieStore.set("firebaseAuthToken",token,{
        httpOnly:true,
        secure:process.env.NODE_ENV ==="production",
    });
    cookieStore.set("firebaseAuthRefreshToken",refreshToken,{
        httpOnly:true,
        secure:process.env.NODE_ENV ==="production",
    });
    }catch(e) {
        console.error("Failed to set auth cookies:", e);
    }
}