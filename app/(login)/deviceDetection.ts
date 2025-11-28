import { useEffect } from "react";
import deviceTypeDetector from "@/utils/deviceDetection";

export function useDeviceDetection() {
  useEffect(() => {
    const deviceDetect = async () => {
      try {
      type DeviceProps = "mobile" | "desktop"; // Define the DeviceProps type
      const rawDeviceType = await deviceTypeDetector(); // Get the raw string
      const validDeviceTypes: DeviceProps[] = ["mobile", "desktop"]; // Define valid types

      // Validate the rawDeviceType against the allowed values
      const deviceType = validDeviceTypes.includes(rawDeviceType as DeviceProps)
        ? (rawDeviceType as DeviceProps)
        : "desktop"; // Default to "desktop" if invalid

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
        WebApp.BackButton.hide(); //window?.Telegram?.WebApp.BackButton.hide();
      };
    } catch (error) {
      console.error("Device detection error:", error);
      }
    };
    deviceDetect();
  }, []);
};
