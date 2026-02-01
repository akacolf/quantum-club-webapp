"use client";

/**
 * TON Connect Session Management
 * Handles storage and management of connected dApp sessions
 */

import { Address } from "@ton/core";

export interface TonConnectSession {
    id: string;
    dAppName: string;
    dAppUrl: string;
    dAppIconUrl?: string;
    walletAddress: string;
    connectedAt: number;
    lastActivityAt: number;
    permissions: {
        sendTransaction: boolean;
        signData: boolean;
    };
}

export interface PendingRequest {
    id: string;
    sessionId: string;
    type: "sendTransaction" | "signData";
    payload: unknown;
    createdAt: number;
    status: "pending" | "approved" | "rejected";
}

const SESSIONS_STORAGE_KEY = "quantum_tonconnect_sessions";
const REQUESTS_STORAGE_KEY = "quantum_tonconnect_requests";

/**
 * Get all TON Connect sessions
 */
export function getSessions(telegramId: string): TonConnectSession[] {
    if (typeof window === "undefined") return [];
    
    try {
        const stored = localStorage.getItem(`${SESSIONS_STORAGE_KEY}_${telegramId}`);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Get a specific session by ID
 */
export function getSession(sessionId: string, telegramId: string): TonConnectSession | null {
    const sessions = getSessions(telegramId);
    return sessions.find(s => s.id === sessionId) || null;
}

/**
 * Create a new TON Connect session
 */
export function createSession(
    dAppName: string,
    dAppUrl: string,
    walletAddress: string,
    telegramId: string,
    dAppIconUrl?: string
): TonConnectSession {
    const sessions = getSessions(telegramId);
    
    // Check if session already exists for this dApp
    const existingIndex = sessions.findIndex(s => s.dAppUrl === dAppUrl);
    
    const now = Date.now();
    const newSession: TonConnectSession = {
        id: `session_${now}_${Math.random().toString(36).slice(2)}`,
        dAppName,
        dAppUrl,
        dAppIconUrl,
        walletAddress,
        connectedAt: now,
        lastActivityAt: now,
        permissions: {
            sendTransaction: true,
            signData: true,
        },
    };
    
    if (existingIndex >= 0) {
        // Update existing session
        sessions[existingIndex] = { ...newSession, id: sessions[existingIndex].id, connectedAt: sessions[existingIndex].connectedAt };
    } else {
        // Add new session
        sessions.unshift(newSession);
    }
    
    localStorage.setItem(`${SESSIONS_STORAGE_KEY}_${telegramId}`, JSON.stringify(sessions));
    return newSession;
}

/**
 * Update session activity timestamp
 */
export function updateSessionActivity(sessionId: string, telegramId: string): void {
    const sessions = getSessions(telegramId);
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex >= 0) {
        sessions[sessionIndex].lastActivityAt = Date.now();
        localStorage.setItem(`${SESSIONS_STORAGE_KEY}_${telegramId}`, JSON.stringify(sessions));
    }
}

/**
 * Disconnect a session
 */
export function disconnectSession(sessionId: string, telegramId: string): boolean {
    const sessions = getSessions(telegramId);
    const filtered = sessions.filter(s => s.id !== sessionId);
    
    if (filtered.length !== sessions.length) {
        localStorage.setItem(`${SESSIONS_STORAGE_KEY}_${telegramId}`, JSON.stringify(filtered));
        return true;
    }
    return false;
}

/**
 * Disconnect all sessions
 */
export function disconnectAllSessions(telegramId: string): void {
    localStorage.removeItem(`${SESSIONS_STORAGE_KEY}_${telegramId}`);
}

/**
 * Get pending transaction requests
 */
export function getPendingRequests(telegramId: string): PendingRequest[] {
    if (typeof window === "undefined") return [];
    
    try {
        const stored = localStorage.getItem(`${REQUESTS_STORAGE_KEY}_${telegramId}`);
        const requests: PendingRequest[] = stored ? JSON.parse(stored) : [];
        // Return only pending requests
        return requests.filter(r => r.status === "pending");
    } catch {
        return [];
    }
}

/**
 * Add a pending request
 */
export function addPendingRequest(
    sessionId: string,
    type: PendingRequest["type"],
    payload: unknown,
    telegramId: string
): PendingRequest {
    const requests = getAllRequests(telegramId);
    
    const newRequest: PendingRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        sessionId,
        type,
        payload,
        createdAt: Date.now(),
        status: "pending",
    };
    
    requests.unshift(newRequest);
    localStorage.setItem(`${REQUESTS_STORAGE_KEY}_${telegramId}`, JSON.stringify(requests));
    return newRequest;
}

/**
 * Update request status
 */
export function updateRequestStatus(
    requestId: string,
    status: "approved" | "rejected",
    telegramId: string
): void {
    const requests = getAllRequests(telegramId);
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex >= 0) {
        requests[requestIndex].status = status;
        localStorage.setItem(`${REQUESTS_STORAGE_KEY}_${telegramId}`, JSON.stringify(requests));
    }
}

/**
 * Get all requests (including non-pending)
 */
function getAllRequests(telegramId: string): PendingRequest[] {
    if (typeof window === "undefined") return [];
    
    try {
        const stored = localStorage.getItem(`${REQUESTS_STORAGE_KEY}_${telegramId}`);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Clean up old requests (older than 24 hours)
 */
export function cleanupOldRequests(telegramId: string): void {
    const requests = getAllRequests(telegramId);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = requests.filter(r => r.createdAt > cutoff || r.status === "pending");
    localStorage.setItem(`${REQUESTS_STORAGE_KEY}_${telegramId}`, JSON.stringify(filtered));
}

/**
 * Format wallet address for display in dApps
 */
export function formatAddressForConnect(address: string, testnet: boolean = false): string {
    try {
        const parsed = Address.parse(address);
        return parsed.toString({ bounceable: false, testOnly: testnet });
    } catch {
        return address;
    }
}

/**
 * Validate that a dApp URL is legitimate
 */
export function validateDAppUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        // Must be HTTPS
        if (parsed.protocol !== "https:") return false;
        // Block common phishing patterns
        const blockedPatterns = [
            /^data:/i,
            /^javascript:/i,
            /\.(exe|msi|bat|cmd|scr)$/i,
        ];
        if (blockedPatterns.some(p => p.test(url))) return false;
        return true;
    } catch {
        return false;
    }
}
