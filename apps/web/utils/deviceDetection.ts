'use server';
import { userAgent } from 'next/server';
import { headers } from 'next/headers';



const deviceTypeDetector = async () => {
    // Await the headers() function
    const headerValues = await headers();
    const { device } = userAgent({ headers: headerValues });
    const deviceType:string = device?.type === "mobile" ? "mobile" : "desktop";
    return deviceType;
};

export default deviceTypeDetector;