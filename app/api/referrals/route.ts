import {NextRequest, NextResponse} from 'next/server';

export async function POST(request:NextRequest) {
    
    const {userId, referrerId} = await request.json();
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
    
    const userId = request.nextUrl.searchParams.get('userId');
    if(!userId){
        return NextResponse.json({error:'Missing userId'}, {status:400});
    }

    const referrals:Array<Ireferrals> = []; // Example: Initialize referrals as an empty array
    const referrer = null; // Example: Initialize referrer as null
    return NextResponse.json({referrals, referrer}); // return NextResponse.json({referrals,referrer});//
}