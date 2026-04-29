import type { Route } from "next";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useTelegramBackButton(path: Route | (string & {}) = "/home") {
    const router = useRouter();
    useEffect(() => {
        const backParam = new URLSearchParams(window.location.search).get("back");
        const targetPath = backParam?.startsWith("/") && !backParam.startsWith("//") ? backParam : path;

        router.prefetch(targetPath as Route);

        const tg = window.Telegram?.WebApp;
        tg?.ready();

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
        };

    }, [router, path]);
}
