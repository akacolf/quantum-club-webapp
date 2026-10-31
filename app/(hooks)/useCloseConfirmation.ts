import { useEffect } from "react";

export function useTelegramCloseConfirmation() {
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        try {
            tg?.enableClosingConfirmation();
        } catch {}

        return () => {
            try {
                tg?.disableClosingConfirmation();
            } catch {}
        };
    }, []);
}