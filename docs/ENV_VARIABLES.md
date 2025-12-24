# QC RocketStart - Environment Variables

## Firebase Configuration
These are required for Firebase Admin SDK and client:

```
FIREBASE_PROJECT_ID=nekoq-875e2
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@nekoq-875e2.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_CLIENT_ID=your-client-id

NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_AUTH_DOMAIN=nekoq-875e2.firebaseapp.com
NEXT_PUBLIC_PROJECT_ID=nekoq-875e2
NEXT_PUBLIC_STORAGE_BUCKET=nekoq-875e2.appspot.com
NEXT_PUBLIC_SENDER_ID=your-sender-id
NEXT_PUBLIC_APP_ID=your-app-id
NEXT_PUBLIC_MEASUREMENT_ID=G-xxxxxxxxxx
```

## Telegram Bot
```
BOT_TOKEN=your-production-bot-token
DEV_BOT_TOKEN=your-dev-bot-token (optional)
```

## Security
```
AES_ENCRYPTION_KEY=32-character-random-key
JWT_SECRET=your-jwt-secret
CRON_SECRET=your-cron-secret
```

## AI Features
```
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
```

## Firebase Functions Config (set via CLI)
```bash
# Platform wallet for LP creation
firebase functions:config:set platform.mnemonic="24 word mnemonic phrase"

# View current config
firebase functions:config:get
```

## Vercel/Production Deployment
Make sure all these variables are set in your Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add each variable for Production environment
3. Redeploy after adding variables

## Notes
- FIREBASE_PRIVATE_KEY must have `\n` escaped as `\\n` in most hosting platforms
- Never commit .env files to git
- Rotate secrets periodically
