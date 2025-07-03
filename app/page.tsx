import LoginScreen from "./login/page";
import TelegramAnalyticsInit from "./components/TelegramAnalyticsInit";

export default function Page() {
  return (
    <>
    <TelegramAnalyticsInit />
    <LoginScreen />
    </>
  )
}
