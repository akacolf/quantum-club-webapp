import { encrypt, SESSION_DURATION } from "@/utils/session"
import { validateTelegramWebAppData } from "@/utils/telegramAuth"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request:NextRequest) {
    const {initData} =await request.json()
    if(!initData) {
        return NextResponse.json({message:'No initData provided'},{status:400})
    }
    const validationResult = validateTelegramWebAppData(initData)
    if(validationResult.validatedData) {
        const user = {telegramId: (validationResult.user as { id: string }).id} // id should be explicitly defined cuz it returns an empty object //
        //const user = {telegramId:validationResult.user.id}//
        const expires = new Date(Date.now() + SESSION_DURATION)
        const session = await encrypt({ user, expires })

        // Save the session in a cookie
        const sessionCookie = await cookies()
        sessionCookie.set("session", session, { expires, httpOnly: true })
    

        return NextResponse.json({message:'Authentication succesful'})
    } else{
        console.log(validationResult.message)
        return NextResponse.json({message:validationResult.message,user:validationResult.user},{status:401})
    }
}