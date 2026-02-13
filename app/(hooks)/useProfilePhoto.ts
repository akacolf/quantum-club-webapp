"use client";

import { useState, useEffect } from "react";

const photoCache = new Map<string, string | null>();

/**
 * Fetches a Telegram user's profile photo by their telegramId.
 * Results are cached in-memory to avoid duplicate API calls.
 */
export function useProfilePhoto(telegramId: string | null | undefined): string | null {
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    telegramId ? (photoCache.get(telegramId) ?? null) : null
  );

  useEffect(() => {
    if (!telegramId) return;

    if (photoCache.has(telegramId)) {
      setPhotoUrl(photoCache.get(telegramId) ?? null);
      return;
    }

    let cancelled = false;

    fetch("/api/get-profile-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          const url = data.photoUrl || null;
          photoCache.set(telegramId, url);
          setPhotoUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          photoCache.set(telegramId, null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [telegramId]);

  return photoUrl;
}

/**
 * Fetches profile photos for multiple telegramIds at once.
 * Returns a map of telegramId -> photoUrl.
 */
export function useProfilePhotos(telegramIds: string[]): Record<string, string | null> {
  const [photos, setPhotos] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    for (const id of telegramIds) {
      if (photoCache.has(id)) {
        initial[id] = photoCache.get(id) ?? null;
      }
    }
    return initial;
  });

  useEffect(() => {
    if (telegramIds.length === 0) return;

    let cancelled = false;
    const uncached = telegramIds.filter((id) => !photoCache.has(id));

    if (uncached.length === 0) {
      const result: Record<string, string | null> = {};
      for (const id of telegramIds) {
        result[id] = photoCache.get(id) ?? null;
      }
      setPhotos(result);
      return;
    }

    Promise.all(
      uncached.map((id) =>
        fetch("/api/get-profile-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegramId: id }),
        })
          .then((res) => res.json())
          .then((data) => {
            const url = data.photoUrl || null;
            photoCache.set(id, url);
            return { id, url };
          })
          .catch(() => {
            photoCache.set(id, null);
            return { id, url: null };
          })
      )
    ).then((results) => {
      if (cancelled) return;
      const result: Record<string, string | null> = {};
      for (const id of telegramIds) {
        result[id] = photoCache.get(id) ?? null;
      }
      for (const { id, url } of results) {
        result[id] = url;
      }
      setPhotos(result);
    });

    return () => {
      cancelled = true;
    };
  }, [telegramIds.join(",")]);

  return photos;
}
