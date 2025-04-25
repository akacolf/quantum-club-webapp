import { NextResponse } from "next/server"

export async function GET() {
  // Your manifest data
  const manifest = {
    "url": "https://quantumclub.space",
    "name": "Quantum Club",
    "iconUrl": "https://tomato-select-swordfish-773.mypinata.cloud/ipfs/bafkreigaercjpu4aun7c7arzyw2i3gi7kie2yjljp7sqilgoygka7ijage"
  }

  // Return the manifest as JSON with appropriate headers
  return NextResponse.json(manifest, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  })
}

