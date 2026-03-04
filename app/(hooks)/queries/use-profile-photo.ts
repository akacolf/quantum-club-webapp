import { useQuery } from "@tanstack/react-query";
import { getProfilePhoto } from "@/app/(hooks)/actions";

async function fetchProfilePhoto(telegramId: string): Promise<string | null> {
    const result = await getProfilePhoto({ telegramId });
    return result?.data?.photoUrl || null;
}

export function useProfilePhotoQuery(telegramId: string | null | undefined) {
    return useQuery({
        queryKey: ["profile-photo", telegramId],
        queryFn: () => fetchProfilePhoto(telegramId!),
        enabled: !!telegramId,
        staleTime: 5 * 60_000,
    });
}
