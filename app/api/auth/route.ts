import { encrypt, SESSION_DURATION } from "@/utils/session"
import { validateTelegramWebAppData } from "@/utils/telegramAuth"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const authSchema = z.object({
    initData: z.string().min(1, "initData is required"),
})

export async function POST(request:NextRequest) {
    const body = await request.json()
    const parsed = authSchema.safeParse(body)
    if(!parsed.success) {
        return NextResponse.json({message: parsed.error.errors[0]?.message || 'Invalid request body'},{status:400})
    }
    const { initData } = parsed.data
    const validationResult = validateTelegramWebAppData(initData)
    if(validationResult.validatedData) {
        const user = {telegramId: (validationResult.user as { id: string }).id}
        const expires = new Date(Date.now() + SESSION_DURATION)
        const session = await encrypt({ user, expires })

        // Save the session in a cookie
        const sessionCookie = await cookies()
        sessionCookie.set("session", session, { 
            expires, 
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
        })
    

        return NextResponse.json({message:'Authentication succesful'}, {
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
        })
    } else{
        return NextResponse.json({message:validationResult.message,user:validationResult.user},{
            status:401,
            headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
        })
    }
}