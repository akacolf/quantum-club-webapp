import telegramAnalytics from '@telegram-apps/analytics';

export function TelegramAnalytics() {
    telegramAnalytics.init({
        token: process.env.NEXT_PUBLIC_TG1,
        appName: process.env.NEXT_PUBLIC_TGAPPNAME,
      });
    
      telegramAnalytics.init({
        token: process.env.NEXT_PUBLIC_TG2,
        appName: process.env.NEXT_PUBLIC_TGAPPNAME,
      });
}