"use client";

import { useQueries } from "@tanstack/react-query";
import { useQcUsernameQuery } from "@/app/(hooks)/queries/use-qc-username";
import { useProfilePhoto } from "@/app/(hooks)/useProfilePhoto";
import { resolveQcUsername } from "@/app/ecosystem/chat/actions";
import { getProfilePhoto } from "@/app/(hooks)/actions";

/**
 * Resolve a user's avatar URL, preferring their custom QC profile photo over
 * the Telegram profile photo. Use this anywhere in the chat UI where we want
 * uploaded avatars to take precedence.
 *
 * Both underlying queries are TanStack-cached, so multiple components calling
 * this hook for the same qcId share a single network round-trip.
 */
export function useQcProfilePhoto(qcId: string | null | undefined): string | null {
  const { data: qcData } = useQcUsernameQuery(qcId);
  const tgPhoto = useProfilePhoto(qcId);
  return qcData?.profilePhotoUrl ?? tgPhoto;
}

/**
 * Batch variant for lists of users (e.g. the group info member roster).
 * Fetches the qcUsername doc + Telegram photo for each id in parallel and
 * returns a `qcId -> url | null` map.
 */
export function useQcProfilePhotosBatch(qcIds: string[]): Record<string, string | null> {
  const qcQueries = useQueries({
    queries: qcIds.map((id) => ({
      queryKey: ["qc-username", "by-id", id],
      queryFn: async () => {
        const result = await resolveQcUsername({ qcId: id });
        return {
          username: result?.data?.username ?? null,
          address: result?.data?.address ?? null,
          profilePhotoUrl: result?.data?.profilePhotoUrl ?? null,
        };
      },
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const tgQueries = useQueries({
    queries: qcIds.map((id) => ({
      queryKey: ["profilePhoto", id],
      queryFn: async () => {
        const result = await getProfilePhoto({ telegramId: id });
        return result?.data?.photoUrl ?? null;
      },
      enabled: !!id,
      staleTime: Infinity,
      gcTime: 1000 * 60 * 30,
    })),
  });

  const photos: Record<string, string | null> = {};
  qcIds.forEach((id, index) => {
    photos[id] = qcQueries[index]?.data?.profilePhotoUrl ?? tgQueries[index]?.data ?? null;
  });
  return photos;
}
