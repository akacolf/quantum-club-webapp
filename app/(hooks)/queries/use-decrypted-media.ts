import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { decryptBlob } from "@/lib/chat-crypto";

interface DecryptParams {
  url: string;
  mimeType: string;
  encrypted?: boolean;
  participantIds?: string[];
  chatId?: string;
  senderId?: string;
  isGroup?: boolean;
  epochNonce?: string;
  epochCounter?: number;
}

async function fetchAndDecrypt({
  url,
  mimeType,
  participantIds,
  chatId,
  senderId,
  isGroup,
  epochNonce,
  epochCounter,
}: DecryptParams): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const encryptedData = await res.arrayBuffer();
  const decryptedData = await decryptBlob(
    encryptedData,
    participantIds!,
    chatId!,
    senderId,
    isGroup,
    epochNonce,
    epochCounter,
  );
  const blob = new Blob([decryptedData], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * TanStack Query hook for decrypting media (audio/files/images).
 * Replaces manual useEffect + fetch + Map cache patterns.
 * Query cache handles deduplication, caching, and retry automatically.
 */
export function useDecryptedMedia(params: DecryptParams & { enabled?: boolean }) {
  const { url, encrypted, participantIds, chatId, enabled = true } = params;
  const queryClient = useQueryClient();

  const needsDecryption = encrypted && participantIds && chatId;

  // Revoke blob URLs when their query cache entries are garbage-collected
  useEffect(() => {
    const cache = queryClient.getQueryCache();
    const unsubscribe = cache.subscribe((event) => {
      if (
        event.type === "removed" &&
        Array.isArray(event.query.queryKey) &&
        event.query.queryKey[0] === "decrypted-media" &&
        event.query.queryKey[1] === url
      ) {
        const data = event.query.state.data as string | undefined;
        if (data?.startsWith("blob:")) {
          URL.revokeObjectURL(data);
        }
      }
    });
    return unsubscribe;
  }, [queryClient, url]);

  return useQuery({
    queryKey: ["decrypted-media", url],
    queryFn: () => fetchAndDecrypt(params),
    enabled: enabled && !!needsDecryption,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 min
    retry: 1,
    // If not encrypted, just return the URL directly
    ...((!needsDecryption && enabled) ? { initialData: url } : {}),
  });
}
