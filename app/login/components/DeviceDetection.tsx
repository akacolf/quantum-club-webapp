"use client";
import { useEffect } from "react";
import { useRegisterAndAuth } from "../hooks/registerAndAuth";
import deviceTypeDetector from "@/utils/deviceDetection";
import { authenticateUser } from "@/app/components/telegramAuth";

export default function DeviceDetection() {
  const { registerAndAuth } = useRegisterAndAuth();
  useEffect(() => {
    const deviceDetect = async () => {
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
        const authenticated = await authenticateUser();
        if (authenticated) {
          await registerAndAuth();
        }
        window?.Telegram?.WebApp.BackButton.hide();
      }
    };
    deviceDetect();
  }, []);

  return null;
};
