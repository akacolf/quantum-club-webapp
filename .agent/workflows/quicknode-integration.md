# QuickNode Integration for Real-Time Blockchain Data

## Overview

QuickNode provides TON blockchain support with Streams and Webhooks for real-time blockchain event notifications.

## Features Available

- **Webhooks**: Real-time blockchain events to HTTP endpoints
- **Streams**: Real-time and historical blockchain data with flexible filtering
- **Guaranteed delivery** and **custom JavaScript logic**
- **Built-in reorg handling**

## Use Cases for Quantum Club

1. **Real-Time Trade Monitoring**: Get instant notifications when trades happen on-chain
2. **Analytics Dashboard**: Stream blockchain data for trading analytics
3. **Notification Systems**: Alert users when price targets are hit
4. **Wallet/Contract Tracking**: Monitor specific wallets or contracts

## Implementation Steps

### 1. Create QuickNode Account

1. Sign up at https://www.quicknode.com/
2. Create a new TON endpoint (Mainnet or Testnet)
3. Get your HTTP endpoint URL

### 2. Set Up Webhooks

1. Go to QuickNode Dashboard → Webhooks
2. Create a new webhook for TON
3. Configure the webhook URL to point to your API endpoint (e.g., `/api/webhooks/quicknode`)
4. Set up filters for specific events (buys, sells, transfers)

### 3. Create Webhook Handler API Route

```typescript
// app/api/webhooks/quicknode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { firestore as adminDb } from "@/app/(firebase)/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook signature (QuickNode provides a secret)
    const signature = request.headers.get("x-quicknode-signature");
    // Verify signature...

    // Process blockchain events
    const { event_type, data } = body;

    if (event_type === "transaction") {
      // Handle transaction events
      // Update trade data in Firestore
      // Send notifications
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
```

### 4. Set Up Streams for Historical Data

```typescript
// lib/quicknode-streams.ts
const QUICKNODE_API_KEY = process.env.QUICKNODE_API_KEY;

export async function setupStream(contractAddress: string) {
  const response = await fetch("https://api.quicknode.com/streams/v1/streams", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QUICKNODE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      network: "ton-mainnet",
      dataset: "transactions",
      filter: {
        address: contractAddress,
      },
      destination: {
        type: "webhook",
        url: "https://your-app.com/api/webhooks/quicknode",
      },
    }),
  });

  return response.json();
}
```

## Environment Variables Required

```
QUICKNODE_ENDPOINT=https://your-ton-endpoint.quiknode.pro/...
QUICKNODE_API_KEY=your-api-key
QUICKNODE_WEBHOOK_SECRET=your-webhook-secret
```

## Integration with GlobalLiveTrades

Replace Firebase polling with QuickNode webhook-driven updates:

1. Webhook receives trade events
2. Write to Firestore with verified on-chain data
3. GlobalLiveTrades component listens to Firestore in real-time
4. No more fake trades - all data is verified on-chain

## Notes

- QuickNode has a free tier with limited requests
- Paid plans offer higher rate limits and more features
- TON support may have different pricing than EVM chains
