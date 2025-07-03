import LoginScreen from "./login/page";
import TelegramAnalytics from "@telegram-apps/analytics";

if (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) {
  TelegramAnalytics.init({
  token: 'eyJhcHBfbmFtZSI6InF1YW50dW1fY2x1YiIsImFwcF91cmwiOiJodHRwczovL3QubWUvUXVhbnR1bUNsdWJCb3QiLCJhcHBfZG9tYWluIjoiaHR0cHM6Ly93d3cucXVhbnR1bWNsdWIuc3BhY2UvIn0=!wCjJY3ya2Il4HWQI21u7rOBSQpz/oFIrPNqdY986AS0=',
  appName: 'quantum_club',
});
};

export default function Page() {
  return (
    <>
      <LoginScreen />
    </>
  );
};
