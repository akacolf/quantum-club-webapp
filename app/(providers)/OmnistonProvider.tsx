"use client";

import {
    Omniston,
    OmnistonProvider,
    WebSocketTransport,
} from "@ston-fi/omniston-sdk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useEffect, useState, useRef } from "react";

const OMNISTON_WS_URL = "wss://omni-ws.ston.fi";

// Create a stable QueryClient instance
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            staleTime: 10000,
            refetchOnWindowFocus: false,
        },
    },
});

export function OmnistonClientProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isClient, setIsClient] = useState(false);
    const transportRef = useRef<WebSocketTransport | null>(null);
    const omnistonRef = useRef<Omniston | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const omniston = useMemo(() => {
        // Only create on client side
        if (typeof window === "undefined" || !isClient) {
            return null;
        }

        // Reuse existing instances if available
        if (omnistonRef.current) {
            return omnistonRef.current;
        }

        const transport = new WebSocketTransport(OMNISTON_WS_URL);
        transportRef.current = transport;

        const instance = new Omniston({
            apiUrl: OMNISTON_WS_URL,
            transport,
        });
        omnistonRef.current = instance;

        return instance;
    }, [isClient]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            transportRef.current?.close();
            transportRef.current = null;
            omnistonRef.current = null;
        };
    }, []);

    // Don't render provider on server or before client mount
    if (!isClient || !omniston) {
        return <>{children}</>;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <OmnistonProvider omniston={omniston}>
                {children}
            </OmnistonProvider>
        </QueryClientProvider>
    );
}
