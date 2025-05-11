import crypto from 'crypto'

export function validateTelegramWebAppData(telegramInitData:string) {
  let BOT_TOKEN = process.env.BOT_TOKEN;
  if(process.env.NEXT_PUBLIC_VERCEL_ENV ==="production"){
    BOT_TOKEN = process.env.BOT_TOKEN
  }else{
    BOT_TOKEN = process.env.DEV_BOT_TOKEN
  }
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