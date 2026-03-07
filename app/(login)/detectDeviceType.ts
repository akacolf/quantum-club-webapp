"use server";

import { userAgent } from "next/server";
import { headers } from "next/headers";

export async function detectDeviceType() {
  const headerValues = await headers();
  const { device } = userAgent({ headers: headerValues });
  return device?.type === "mobile" ? "mobile" : "desktop";
}
