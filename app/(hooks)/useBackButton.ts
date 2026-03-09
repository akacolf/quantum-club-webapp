import type { Route } from "next";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useTelegramBackButton(path: Route | (string & {}) = "/home") {
    const router = useRouter();
    useEffect(() => {
        router.prefetch(path as Route);

        const tg = window.Telegram?.WebApp;
        tg?.ready();

        const handleBackButtonClick = () => {
            try {
                router.replace(path as Route);
            } catch {
                window.location.href = path;
            }
        };

        tg?.BackButton.show();
        tg?.BackButton.onClick(handleBackButtonClick);

        return () => {
            tg?.BackButton.offClick(handleBackButtonClick);
            tg?.BackButton.hide();
        };

    }, [router, path]);
}
