import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface QcUsernameByIdResult {
  username: string | null;
  address: string | null;
}

interface QcUsernameByNameResult {
  username: string;
  available: boolean;
  resolved: boolean;
  address?: string | null;
  owner?: string;
}

async function fetchQcUsernameById(qcId: string): Promise<QcUsernameByIdResult> {
  const res = await fetch(`/api/qc-username?qcId=${encodeURIComponent(qcId)}`);
  if (!res.ok) throw new Error("Failed to fetch username");
  return res.json();
}

async function fetchQcUsernameByName(username: string): Promise<QcUsernameByNameResult> {
  const res = await fetch(`/api/qc-username?username=${encodeURIComponent(username)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to check username");
  return res.json();
}

/** Lookup a user's QC username by their telegramId / qcId */
export function useQcUsernameQuery(qcId: string | undefined | null) {
  return useQuery({
    queryKey: ["qc-username", "by-id", qcId],
    queryFn: () => fetchQcUsernameById(qcId!),
    enabled: !!qcId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Resolve a QC username to check availability / get address */
export function useQcUsernameResolveQuery(username: string | undefined | null) {
  return useQuery({
    queryKey: ["qc-username", "by-name", username?.toLowerCase()],
    queryFn: () => fetchQcUsernameByName(username!),
    enabled: !!username && username.length >= 3,
    staleTime: 30_000,
  });
}

/** Batch-resolve multiple qcIds to usernames (for participant lists) */
export function useQcUsernamesBatch(qcIds: string[]) {
  return useQuery({
    queryKey: ["qc-username", "batch", qcIds.sort().join(",")],
    queryFn: async () => {
      const results: Record<string, string> = {};
      await Promise.all(
        qcIds.map(async (id) => {
          try {
            const data = await fetchQcUsernameById(id);
            if (data.username) results[id] = data.username;
          } catch {
            // skip failed lookups
          }
        })
      );
      return results;
    },
    enabled: qcIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/** Register a new QC username */
export function useRegisterUsernameMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { username: string; qcId: string; address?: string }) => {
      const res = await fetch("/api/qc-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to register username");
      }
      return res.json() as Promise<{ success: boolean; username: string }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["qc-username", "by-id", variables.qcId] });
      queryClient.invalidateQueries({ queryKey: ["qc-username", "by-name"] });
    },
  });
}

/** Update wallet address linked to username */
export function useUpdateUsernameAddressMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { qcId: string; address: string }) => {
      const res = await fetch("/api/qc-username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update address");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["qc-username", "by-id", variables.qcId] });
    },
  });
}
