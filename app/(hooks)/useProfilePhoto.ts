"use client";

import { useQuery, useQueries } from "@tanstack/react-query";

async function fetchProfilePhoto(telegramId: string): Promise<string | null> {
  const res = await fetch("/api/get-profile-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId }),
  });
  const data = await res.json();
  return data.photoUrl || null;
}

/**
 * Fetches a Telegram user's profile photo by their telegramId.
 * TanStack Query handles caching, deduplication, and background refetching.
 */
export function useProfilePhoto(telegramId: string | null | undefined): string | null {
  const { data } = useQuery({
    queryKey: ["profilePhoto", telegramId],
    queryFn: () => fetchProfilePhoto(telegramId!),
    enabled: !!telegramId,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  });

  return data ?? null;
}

/**
 * Fetches profile photos for multiple telegramIds at once.
 * Returns a map of telegramId -> photoUrl.
 */
export function useProfilePhotos(telegramIds: string[]): Record<string, string | null> {
  const results = useQueries({
    queries: telegramIds.map((id) => ({
      queryKey: ["profilePhoto", id],
      queryFn: () => fetchProfilePhoto(id),
      staleTime: Infinity,
      gcTime: 1000 * 60 * 30,
    })),
  });

  const photos: Record<string, string | null> = {};
  telegramIds.forEach((id, index) => {
    photos[id] = results[index]?.data ?? null;
  });
  return photos;
}
