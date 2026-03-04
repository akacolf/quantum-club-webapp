import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { registerQcUsername, updateQcUsernameAddress, resolveQcUsername } from "@/app/ecosystem/chat/actions";

interface QcUsernameByIdResult {
  username: string | null;
  address: string | null;
}

interface QcUsernameByNameResult {
  username: string;
  available: boolean;
  resolved: boolean;
  address?: string | null;
  owner?: string | null;
}

/** Lookup a user's QC username by their telegramId / qcId */
export function useQcUsernameQuery(qcId: string | undefined | null) {
  return useQuery<QcUsernameByIdResult>({
    queryKey: ["qc-username", "by-id", qcId],
    queryFn: async () => {
      const result = await resolveQcUsername({ qcId: qcId! });
      if (!result?.data) throw new Error("Failed to fetch username");
      return { username: result.data.username ?? null, address: result.data.address ?? null };
    },
    enabled: !!qcId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Resolve a QC username to check availability / get address */
export function useQcUsernameResolveQuery(username: string | undefined | null) {
  return useQuery<QcUsernameByNameResult>({
    queryKey: ["qc-username", "by-name", username?.toLowerCase()],
    queryFn: async () => {
      const result = await resolveQcUsername({ username: username! });
      if (!result?.data) throw new Error("Failed to check username");
      return result.data as QcUsernameByNameResult;
    },
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
            const result = await resolveQcUsername({ qcId: id });
            if (result?.data?.username) results[id] = result.data.username;
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
      const result = await registerQcUsername(data);
      if (result?.serverError) throw new Error(result.serverError);
      if (!result?.data) throw new Error("Failed to register username");
      return result.data as { success: boolean; username: string };
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
      const result = await updateQcUsernameAddress(data);
      if (result?.serverError) throw new Error(result.serverError);
      if (!result?.data) throw new Error("Failed to update address");
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["qc-username", "by-id", variables.qcId] });
    },
  });
}
