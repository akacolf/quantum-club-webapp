import { useEffect } from "react";

export function useTelegramCloseConfirmation() {
    useEffect(() => {
        const tg = window.Telegram?.WebApp;

        tg?.enableClosingConfirmation();
    }, []);
}