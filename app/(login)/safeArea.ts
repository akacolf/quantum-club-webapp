import { useEffect } from "react";

function updateSafeArea() {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    const WebApp = window.Telegram.WebApp;
    
    // Update safe area insets
    const { top, bottom, left, right } = WebApp.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
    document.documentElement.style.setProperty("--safe-area-top", `${top}px`);
    document.documentElement.style.setProperty("--safe-area-bottom", `${bottom}px`);
    document.documentElement.style.setProperty("--safe-area-left", `${left}px`);
    document.documentElement.style.setProperty("--safe-area-right", `${right}px`);
    
    // Update content safe area insets
    const contentSafeArea = WebApp.contentSafeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
    document.documentElement.style.setProperty("--content-safe-area-top", `${contentSafeArea.top}px`);
    document.documentElement.style.setProperty("--content-safe-area-bottom", `${contentSafeArea.bottom}px`);
    document.documentElement.style.setProperty("--content-safe-area-left", `${contentSafeArea.left}px`);
    document.documentElement.style.setProperty("--content-safe-area-right", `${contentSafeArea.right}px`);
  }
}

export function useSafeArea() {
  useEffect(() => {
    // Initial update
    updateSafeArea();
    
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const WebApp = window.Telegram.WebApp;
      
      // Listen for safe area changes (e.g., orientation change)
      WebApp.onEvent("safeAreaChanged", updateSafeArea);
      WebApp.onEvent("contentSafeAreaChanged", updateSafeArea);
      
      // Also update on viewport changes
      WebApp.onEvent("viewportChanged", updateSafeArea);
      
      // Listen for activated event (when app comes back from background)
      WebApp.onEvent("activated", updateSafeArea);
      
      return () => {
        WebApp.offEvent("safeAreaChanged", updateSafeArea);
        WebApp.offEvent("contentSafeAreaChanged", updateSafeArea);
        WebApp.offEvent("viewportChanged", updateSafeArea);
        WebApp.offEvent("activated", updateSafeArea);
      };
    }
  }, []);
}
