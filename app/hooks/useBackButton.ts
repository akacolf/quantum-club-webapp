import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useTelegramBackButton(path: string = "/home") {
    const router = useRouter();
    useEffect(() => {
        router.prefetch(path);
        
        const tg = window.Telegram?.WebApp;
        tg?.ready();

        const handleBackButtonClick = () => {
            router.replace(path);
        };
        tg?.BackButton.show();
        tg?.BackButton.onClick(handleBackButtonClick);

        return () => {
            tg?.BackButton.offClick(handleBackButtonClick);
        };

    }, [router, path]);
}