"use client";

import {
    Omniston,
    OmnistonProvider,
    WebSocketTransport,
} from "@ston-fi/omniston-sdk-react";
import { useEffect, useState } from "react";

const OMNISTON_WS_URL = "wss://omni-ws.ston.fi";

// Module-level singletons so we never create more than one
let _transport: WebSocketTransport | null = null;
let _omniston: Omniston | null = null;

function getOmniston(): Omniston {
    if (_omniston) return _omniston;
    _transport = new WebSocketTransport(OMNISTON_WS_URL);
    _omniston = new Omniston({
        apiUrl: OMNISTON_WS_URL,
        transport: _transport,
    });
    return _omniston;
}

export function OmnistonClientProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        queueMicrotask(() => setIsClient(true));
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            _transport?.close();
            _transport = null;
            _omniston = null;
        };
    }, []);

    // Don't render provider on server or before client mount
    if (!isClient) {
        return <>{children}</>;
    }

    const omniston = getOmniston();

    return (
        <OmnistonProvider omniston={omniston}>
            {children}
        </OmnistonProvider>
    );
}
