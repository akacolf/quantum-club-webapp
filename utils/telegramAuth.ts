import crypto from 'crypto'
import { env } from '@/env'

export function validateTelegramWebAppData(telegramInitData:string) {
  const BOT_TOKEN = env.NEXT_PUBLIC_VERCEL_ENV === "production"
    ? env.BOT_TOKEN
    : env.DEV_BOT_TOKEN || env.BOT_TOKEN;
  let validatedData = null;
  let user = {};
  let message = '';

  if (!BOT_TOKEN) {
    return { message: 'BOT_TOKEN is not set', validatedData: null, user: {} };
  }

  const initData = new URLSearchParams(telegramInitData);
  const hash = initData.get('hash');
  if (!hash) {
    return { message: 'Hash is missing from initData', validatedData: null, user: {} };
  }

  initData.delete('hash');

  const authDate = initData.get('auth_date');
  if (!authDate) {
    return { message: 'auth_date is missing from initData', validatedData: null, user: {} };
  }
  
  // Telegram initData may legitimately be reused within the same app session.
  // Keep a bounded window to reduce false negatives while preserving replay protection.
  const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // 24 hours
  const authTimestamp = parseInt(authDate, 10);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  
  if (isNaN(authTimestamp) || currentTimestamp - authTimestamp > MAX_AUTH_AGE_SECONDS) {
    return { message: 'initData has expired (auth_date too old)', validatedData: null, user: {} };
  }
  
  const dataCheckString = Array.from(initData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (calculatedHash === hash) {
    validatedData = Object.fromEntries(initData.entries());
    message = 'Validation successful';
    const userString = validatedData['user'];
    if (userString) {
      try {
        user = JSON.parse(userString);
      } catch (error) {
        console.error('Error parsing user data:', error);
        message = 'Error parsing user data';
        validatedData = null;
      }
    } else {
      message = 'User data is missing';
      validatedData = null;
    }
  } else {
    message = 'Hash validation failed';
  }

  return { validatedData, user, message };
}
