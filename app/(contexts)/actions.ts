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
    const verifiedToken = await auth.verifyIdToken(token);
    if(!verifiedToken){
        throw new Error("Token verification failed");
    }

    const userRecord = await auth.getUser(verifiedToken.uid)
    if(!userRecord.uid){
        throw new Error("User record not found");
    }
    const expiresIn = 30 * 24 * 60 * 60; // 30 days in seconds
    const cookieStore = await cookies();
    cookieStore.set("firebaseAuthToken",token,{
        httpOnly:true,
        secure:process.env.NODE_ENV ==="production",
        sameSite:"strict",
        path:"/",
        maxAge:expiresIn,
    });
    cookieStore.set("firebaseAuthRefreshToken",refreshToken,{
        httpOnly:true,
        secure:process.env.NODE_ENV ==="production",
        sameSite:"strict",
        path:"/",
        maxAge:expiresIn,
    });
}
export const updateUserPassword = async(token:string, newPassword: string)=>{
    if (!newPassword || newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
    }
    const verifiedToken = await auth.verifyIdToken(token)
    const userRecord = await auth.getUser(verifiedToken.uid)
    if(!userRecord) return;
    await auth.updateUser(verifiedToken.uid,{
         password: newPassword
    }).then((userRecord)=>{
        console.log('Successfully updated user',userRecord.toJSON())
    }).catch((error)=>{
        console.log(error)
    })
}