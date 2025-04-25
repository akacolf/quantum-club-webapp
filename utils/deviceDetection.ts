'use server';
import { userAgent } from 'next/server';
import { headers } from 'next/headers';
import React from 'react';

interface Device {
  type: string;
}

interface DeviceProps {
  device?: Device; // device opsiyonel
}
const deviceTypeDetector: React.FC<DeviceProps> = async () => {
    // Await the headers() function
    const headerValues = await headers();
    const { device } = userAgent({ headers: headerValues });
    const deviceType = device?.type === "mobile" ? "mobile" : "desktop";
    return deviceType;
};

export default deviceTypeDetector;