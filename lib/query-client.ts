import { QueryClient } from "@tanstack/react-query";

/** Shared QueryClient singleton — used by ClientProviders and auth-store */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            staleTime: 60_000,
            refetchOnWindowFocus: false,
        },
    },
});
