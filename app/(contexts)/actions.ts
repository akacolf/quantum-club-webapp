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