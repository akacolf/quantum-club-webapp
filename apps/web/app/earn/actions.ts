"use server"

import { FieldValue } from "firebase-admin/firestore";
import { auth, firestore } from "../(firebase)/server";

export const confirmTask = async(task:{
    id:string;
    completed:boolean;
    platform:string;
    quant:number;
},telegramId:string,authToken:string
) => {
    const verifiedToken = await auth.verifyIdToken(authToken);
    if(!verifiedToken.uid){
        return {
            error:true,
            message:"Unauthorized"
        }
    }
    const date = new Date(Date.now());
    const formattedDate = `${date
        .getDate()
        .toString()
        .padStart(2, "0")}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${date.getFullYear()}`;
        await firestore.collection("user").doc(telegramId).collection("tasks").doc(task.id).set({
            completed:true,
            platform:task.platform,
            quant:task.quant,
            date:formattedDate,
        })
        await firestore.collection("user").doc(telegramId).collection("miningData").doc("values").update({
        QuantAmount: FieldValue.increment(task.quant)
    })
    
    return {
        error:false,
        message:"Task confirmed"
    };
}