'use client';

export function useSafeArea() {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const { top, bottom, left, right } = window.Telegram.WebApp.safeAreaInset;
      document.documentElement.style.setProperty("--safe-area-top", `${top}px`);
      document.documentElement.style.setProperty(
        "--safe-area-bottom",
        `${bottom}px`
      );
      document.documentElement.style.setProperty(
        "--safe-area-left",
        `${left}px`
      );
      document.documentElement.style.setProperty(
        "--safe-area-right",
        `${right}px`
      );
    };
};
