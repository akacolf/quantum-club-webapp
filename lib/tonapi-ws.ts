"use client";

/**
 * TONAPI WebSocket Client for real-time blockchain events.
 *
 * Connects to wss://tonapi.io/v2/websocket and subscribes to
 * account transactions filtered by trade opcodes (buy/sell/graduate).
 * When an event fires, the provided callback is invoked with the
 * affected account ID so callers can refetch data instantly.
 */

import { env } from "@/env";
import { ROCKETSTART_TESTNET } from "@/lib/platform-config";

const WS_URL = ROCKETSTART_TESTNET
  ? "wss://testnet.tonapi.io/v2/websocket"
  : "wss://tonapi.io/v2/websocket";

// Trade opcodes
const OP_BUY = "0xaf750d34";
const OP_SELL = "0x7bdd97de";
const OP_GRADUATE = "0x47524144";
const OPERATIONS = `${OP_BUY},${OP_SELL},${OP_GRADUATE}`;

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const HEARTBEAT_TIMEOUT_MS = 15000; // TONAPI sends heartbeat every 5s

type EventCallback = (accountId: string, txHash: string) => void;

export class TonApiWebSocket {
  private ws: WebSocket | null = null;
  private accounts: Set<string> = new Set();
  private onEvent: EventCallback;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private rpcId = 0;

  constructor(onEvent: EventCallback) {
    this.onEvent = onEvent;
  }

  connect() {
    if (this.disposed) return;
    this.cleanup();

    const apiKey = env.NEXT_PUBLIC_TONAPI_KEY;
    const url = apiKey ? `${WS_URL}?token=${apiKey}` : WS_URL;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.resetHeartbeat();

      // Re-subscribe existing accounts
      if (this.accounts.size > 0) {
        this.sendSubscribe([...this.accounts]);
      }
    };

    this.ws.onmessage = (event) => {
      this.resetHeartbeat();

      try {
        const msg = JSON.parse(event.data);

        // JSON-RPC notification for account transaction
        if (msg.method === "account_transaction" && msg.params) {
          const { account_id, tx_hash } = msg.params;
          if (account_id) {
            this.onEvent(account_id, tx_hash || "");
          }
        }
      } catch {
        // Heartbeat or non-JSON message, ignore
      }
    };

    this.ws.onclose = () => {
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  /**
   * Subscribe to transaction events for the given account addresses.
   * Can be called multiple times — new accounts are added incrementally.
   */
  subscribe(addresses: string[]) {
    const newAddresses = addresses.filter((a) => !this.accounts.has(a));
    if (newAddresses.length === 0) return;

    for (const addr of newAddresses) {
      this.accounts.add(addr);
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(newAddresses);
    }
  }

  /**
   * Unsubscribe from specific addresses.
   */
  unsubscribe(addresses: string[]) {
    for (const addr of addresses) {
      this.accounts.delete(addr);
    }

    if (this.ws?.readyState === WebSocket.OPEN && addresses.length > 0) {
      this.rpcId++;
      this.ws.send(
        JSON.stringify({
          id: this.rpcId,
          jsonrpc: "2.0",
          method: "unsubscribe_account",
          params: addresses,
        })
      );
    }
  }

  /**
   * Replace all subscriptions with a new set of addresses.
   */
  setAccounts(addresses: string[]) {
    const newSet = new Set(addresses);
    const toRemove = [...this.accounts].filter((a) => !newSet.has(a));
    const toAdd = addresses.filter((a) => !this.accounts.has(a));

    if (toRemove.length > 0) this.unsubscribe(toRemove);
    if (toAdd.length > 0) this.subscribe(toAdd);
  }

  dispose() {
    this.disposed = true;
    this.cleanup();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private sendSubscribe(addresses: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.rpcId++;
    this.ws.send(
      JSON.stringify({
        id: this.rpcId,
        jsonrpc: "2.0",
        method: "subscribe_account",
        params: addresses.map((addr) => `${addr};operations=${OPERATIONS}`),
      })
    );
  }

  private resetHeartbeat() {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(() => {
      // No heartbeat received — connection is stale
      this.ws?.close();
    }, HEARTBEAT_TIMEOUT_MS);
  }

  private scheduleReconnect() {
    if (this.disposed) return;

    const delay = Math.min(
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_MS
    );
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private cleanup() {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }
}
