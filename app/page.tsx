import LoginScreen from "./login/page";
import TelegramAnalytics from "@telegram-apps/analytics";

TelegramAnalytics.init({
  token: process.env.TG_ANALYTICS_SDKAUTH || '',
  appName: process.env.TG_ANALYTICS_IDENTIFIER || '',
});

export default function Page() {
  return (
    <>
      <LoginScreen />
    </>
  );
};
