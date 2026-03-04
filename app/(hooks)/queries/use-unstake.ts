import { useQuery } from "@tanstack/react-query";
import {
    getTonStakersInfo,
    getActiveWithdrawals,
    type TonStakersInfo,
} from "@/lib/tonstakers-integration";
import { getSecureMnemonic } from "@/lib/secure-mnemonic";

export interface UnstakeData {
    stakingInfo: TonStakersInfo | null;
    withdrawals: Array<{ amount: number; estimatedTime: number }>;
}

/**
 * TanStack Query hook that fetches staking info and active withdrawals
 * needed by the unstake page.
 *
 * Retrieves the stored mnemonic and wallet address, then fetches
 * `getTonStakersInfo` and `getActiveWithdrawals` in parallel.
 */
export function useUnstakeDataQuery(
    telegramId: string | null | undefined,
) {
    return useQuery<UnstakeData>({
        queryKey: ["unstake", telegramId],
        queryFn: async () => {
            if (!telegramId) {
                throw new Error("telegramId is required");
            }

            const storedMnemonic = await getSecureMnemonic(telegramId);
            const storedAddress = localStorage.getItem(
                `quantum_wallet_address_${telegramId}`,
            );

            if (!storedMnemonic || !storedAddress) {
                return { stakingInfo: null, withdrawals: [] };
            }

            const mnemonic = storedMnemonic.split(" ");
            const [info, activeWithdrawals] = await Promise.all([
                getTonStakersInfo(storedAddress, mnemonic),
                getActiveWithdrawals(storedAddress, mnemonic),
            ]);

            return {
                stakingInfo: info,
                withdrawals: activeWithdrawals.map((w) => ({
                    amount: w.tsTONAmount || 0,
                    estimatedTime: w.estimatedPayoutDateTime || 0,
                })),
            };
        },
        enabled: !!telegramId,
        staleTime: 60_000,
    });
}
