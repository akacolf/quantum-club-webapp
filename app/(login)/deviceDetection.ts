import { useEffect } from "react";
import { detectDeviceType } from "./detectDeviceType";

export function useDeviceDetection() {
  useEffect(() => {
    const deviceDetect = async () => {
      try {
        await detectDeviceType();

        if (typeof window !== "undefined") {
          const WebApp = window?.Telegram?.WebApp;
          if (!WebApp) return;
          WebApp.ready();
          // Colors, fullscreen, and swipe behavior are handled globally
          // by ClientProviders — no need to duplicate here.
        }
      } catch (error) {
        console.error("Device detection error:", error);
      }
    };
    deviceDetect();
  }, []);
}
