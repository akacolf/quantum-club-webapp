"use client";

import { useQueries } from "@tanstack/react-query";
import { useQcUsernameQuery } from "@/app/(hooks)/queries/use-qc-username";
import { resolveQcUsername } from "@/app/ecosystem/chat/actions";

/**
 * Resolve a user's avatar URL from their custom QC profile photo.
 *
 * Returns `null` when the user hasn't uploaded one — callers should render an
 * initials `AvatarFallback` for that case. We deliberately do NOT fall back to
 * the Telegram Bot API photo: QC identity is the source of truth, and pulling
 * Telegram avatars sends each viewed user's id to Telegram's servers.
 */
export function useQcProfilePhoto(qcId: string | null | undefined): string | null {
  const { data } = useQcUsernameQuery(qcId);
  return data?.profilePhotoUrl ?? null;
}

/**
 * Batch variant for lists of users (group info member roster, frens list).
 * Returns a `qcId -> url | null` map — `null` means "render initials".
 */
export function useQcProfilePhotosBatch(qcIds: string[]): Record<string, string | null> {
  const queries = useQueries({
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

  const photos: Record<string, string | null> = {};
  qcIds.forEach((id, index) => {
    photos[id] = queries[index]?.data?.profilePhotoUrl ?? null;
  });
  return photos;
}
