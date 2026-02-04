import {NextRequest, NextResponse} from 'next/server';
import { getSession } from '@/utils/session';

export async function POST(request:NextRequest) {
    // Validate session
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const {userId, referrerId} = await request.json();
    
    // Only allow users to set their own referrer
    const authenticatedUserId = String(session.user?.telegramId || "");
    if (userId !== authenticatedUserId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if(!userId || !referrerId){
        return NextResponse.json({error: 'Missing userId or referrerId'},{status:400});
    }
    return NextResponse.json({succes:true});
}
interface Ireferrals {
    id:number,
    username:string
}
export async function GET(request:NextRequest) {
    // Validate session
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only allow users to view their own referrals
    const authenticatedUserId = String(session.user?.telegramId || "");
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (userId !== authenticatedUserId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if(!userId){
        return NextResponse.json({error:'Missing userId'}, {status:400});
    }

    const referrals:Array<Ireferrals> = []; // Example: Initialize referrals as an empty array
    const referrer = null; // Example: Initialize referrer as null
    return NextResponse.json({referrals, referrer}); // return NextResponse.json({referrals,referrer});//
}