"use client"
import LoginScreen from "./login/page";
import TelegramAnalytics from "@telegram-apps/analytics";
//telegram analytics//
if(typeof window !== "undefined" && window.Telegram?.WebApp.initDataUnsafe.user) {
TelegramAnalytics.init({
  token: process.env.NEXT_PUBLIC_TG1!,
  appName: process.env.NEXT_PUBLIC_TGAPPNAME!,
});
TelegramAnalytics.init({
  token: process.env.NEXT_PUBLIC_TG2!,
  appName: process.env.NEXT_PUBLIC_TGAPPNAME!,
});

}
export default function Page() {
  
  return (
  <>
    <LoginScreen />
  </>
  );
}
