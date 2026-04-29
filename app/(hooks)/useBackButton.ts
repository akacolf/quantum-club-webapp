import type { Route } from "next";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useTelegramBackButton(path: Route | (string & {}) = "/home", options?: { closeConfirmation?: boolean }) {
    const router = useRouter();
    useEffect(() => {
        const backParam = new URLSearchParams(window.location.search).get("back");
        const targetPath = backParam?.startsWith("/") && !backParam.startsWith("//") ? backParam : path;

        router.prefetch(targetPath as Route);

        const tg = window.Telegram?.WebApp;
        tg?.ready();
        if (options?.closeConfirmation) {
            tg?.enableClosingConfirmation();
        }

        const handleBackButtonClick = () => {
            try {
                router.replace(targetPath as Route);
            } catch {
                window.location.href = targetPath;
            }
        };

        tg?.BackButton.show();
        tg?.BackButton.onClick(handleBackButtonClick);

        return () => {
            tg?.BackButton.offClick(handleBackButtonClick);
            tg?.BackButton.hide();
            if (options?.closeConfirmation) {
                (tg as any)?.disableClosingConfirmation?.();
            }
        };

    }, [router, path, options?.closeConfirmation]);
}
