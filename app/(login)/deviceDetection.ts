import { useEffect } from "react";
import { detectDeviceType } from "./detectDeviceType";

export function useDeviceDetection() {
  useEffect(() => {
    const deviceDetect = async () => {
      try {
        const rawDeviceType = await detectDeviceType();
        const deviceType = rawDeviceType === "mobile" ? "mobile" : "desktop";

        if (typeof window !== "undefined") {
          const WebApp = window?.Telegram?.WebApp;
          if (!WebApp) return;
          WebApp.ready();
          WebApp.setHeaderColor("#000000");
          WebApp.setBackgroundColor("#000000");
          WebApp.disableVerticalSwipes();
          if (deviceType === "mobile") {
            WebApp.requestFullscreen();
          }
        }
      } catch (error) {
        console.error("Device detection error:", error);
      }
    };
    deviceDetect();
  }, []);
}
