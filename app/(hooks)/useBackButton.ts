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

        const navigateBack = () => {
            try {
                router.replace(targetPath as Route);
            } catch {
                window.location.href = targetPath;
            }
        };

        const handleBackButtonClick = () => {
            const showConfirm = (tg as { showConfirm?: (message: string, callback: (confirmed: boolean) => void) => void } | undefined)?.showConfirm;
            if (options?.closeConfirmation && showConfirm) {
                showConfirm("Are you sure you want to leave? Your current progress will be lost.", (confirmed: boolean) => {
                    if (confirmed) navigateBack();
                });
                return;
            }

            if (options?.closeConfirmation && !window.confirm("Are you sure you want to leave? Your current progress will be lost.")) {
                return;
            }

            navigateBack();
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
