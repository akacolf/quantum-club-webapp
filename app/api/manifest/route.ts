import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "My App",
    short_name: "App",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon-192x192.png",
        type: "image/png",
        sizes: "192x192"
      },
      {
        src: "/icon-512x512.png",
        type: "image/png",
        sizes: "512x512"
      }
    ]
  });
}
