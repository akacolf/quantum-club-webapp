import {NextResponse,NextRequest} from 'next/server';

export async function POST(request) {
    
    const {userId, referrerId} = await request.json();
    if(!userId || !referrerId){
        return NextResponse.json({error: 'Missing userId or referrerId'},{status:400});
    }
    return NextResponse.json({succes:true});
}

export async function GET(request) {
    const userId = request.nextUrl.searchParams.get('userId');
    if(!userId){
        return NextResponse.json({error:'Missing userId'}, {status:400});
    }

    const referrals = []; // Example: Initialize referrals as an empty array
    const referrer = null; // Example: Initialize referrer as null
    return NextResponse.json({referrals, referrer}); // return NextResponse.json({referrals,referrer});//
}