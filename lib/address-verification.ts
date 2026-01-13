"use client";

/**
 * Address Verification Utility
 * Checks addresses against known scam lists and provides risk assessment
 */

import { Address } from "@ton/core";

export interface AddressVerification {
    address: string;
    isVerified: boolean;
    isScam: boolean;
    riskLevel: "low" | "medium" | "high" | "critical";
    warnings: string[];
    labels: string[];
    source?: string;
}

// Known scam patterns and addresses
// This is a basic implementation - in production, this should be fetched from a centralized API
const KNOWN_SCAM_ADDRESSES = new Set<string>([
    // Add known scam addresses here (raw format)
    // These are example patterns - real implementation should use TonAPI labels
]);

// Known exchange and verified service addresses
const KNOWN_VERIFIED_ADDRESSES: Record<string, string> = {
    // Format: raw_address -> label
    // These should be fetched from TonAPI or a centralized service
};

// Suspicious patterns in memo/comment fields
const SUSPICIOUS_PATTERNS = [
    /claim.*prize/i,
    /free.*ton/i,
    /airdrop.*urgent/i,
    /verify.*account.*now/i,
    /double.*your.*crypto/i,
    /guaranteed.*return/i,
    /investment.*opportunity/i,
];

/**
 * Normalize an address to raw format for consistent comparison
 */
export function normalizeAddress(address: string): string | null {
    try {
        return Address.parse(address).toRawString();
    } catch {
        return null;
    }
}

/**
 * Verify an address and return risk assessment
 */
export async function verifyAddress(address: string, isTestnet = false): Promise<AddressVerification> {
    const warnings: string[] = [];
    const labels: string[] = [];
    let isScam = false;
    let isVerified = false;
    let riskLevel: AddressVerification["riskLevel"] = "low";
    
    // Try to normalize the address
    const rawAddress = normalizeAddress(address);
    if (!rawAddress) {
        return {
            address,
            isVerified: false,
            isScam: false,
            riskLevel: "critical",
            warnings: ["Invalid address format"],
            labels: ["Invalid"],
        };
    }

    // Check against known scam addresses
    if (KNOWN_SCAM_ADDRESSES.has(rawAddress)) {
        isScam = true;
        riskLevel = "critical";
        warnings.push("This address has been flagged as a scam");
        labels.push("Scam");
    }

    // Check against known verified addresses
    if (KNOWN_VERIFIED_ADDRESSES[rawAddress]) {
        isVerified = true;
        labels.push(KNOWN_VERIFIED_ADDRESSES[rawAddress]);
    }

    // Try to get labels from TonAPI (if available)
    try {
        const { tonApiGet } = await import("@/lib/tonapi-client");
        const accountInfo = await tonApiGet<{
            is_scam?: boolean;
            is_wallet?: boolean;
            name?: string;
            icon?: string;
            memo_required?: boolean;
            interfaces?: string[];
        }>(
            `/v2/accounts/${encodeURIComponent(rawAddress)}`,
            { testnet: isTestnet }
        );

        // Check TonAPI scam flag
        if (accountInfo.is_scam) {
            isScam = true;
            riskLevel = "critical";
            warnings.push("This address is marked as scam by TonAPI");
            if (!labels.includes("Scam")) labels.push("Scam");
        }

        // Add account name if available
        if (accountInfo.name) {
            isVerified = true;
            if (!labels.includes(accountInfo.name)) {
                labels.unshift(accountInfo.name);
            }
        }

        // Check if memo is required (exchanges)
        if (accountInfo.memo_required) {
            warnings.push("This address requires a memo/comment for deposits");
            labels.push("Memo Required");
            if (riskLevel === "low") riskLevel = "medium";
        }

        // Check interfaces for contract type
        if (accountInfo.interfaces) {
            if (accountInfo.interfaces.includes("dex")) {
                labels.push("DEX");
                isVerified = true;
            }
            if (accountInfo.interfaces.includes("nft_collection")) {
                labels.push("NFT Collection");
            }
        }
    } catch {
        // TonAPI lookup failed - continue with local checks only
    }

    // Check for new/suspicious addresses (no activity)
    // This is a heuristic - addresses with no history might be risky
    if (!isVerified && !isScam && labels.length === 0) {
        // Address has no known labels
        if (riskLevel === "low") {
            riskLevel = "medium";
        }
        warnings.push("This address has no verification labels");
    }

    return {
        address: rawAddress,
        isVerified,
        isScam,
        riskLevel,
        warnings,
        labels,
        source: "TonAPI + Local",
    };
}

/**
 * Check if a memo/comment appears suspicious
 */
export function checkMemoForScam(memo: string): { isSuspicious: boolean; reason?: string } {
    if (!memo || memo.length === 0) {
        return { isSuspicious: false };
    }

    for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(memo)) {
            return {
                isSuspicious: true,
                reason: "This message contains patterns commonly used in scams",
            };
        }
    }

    return { isSuspicious: false };
}

/**
 * Format address risk level for display
 */
export function formatRiskLevel(level: AddressVerification["riskLevel"]): {
    label: string;
    color: string;
    bgColor: string;
} {
    switch (level) {
        case "low":
            return { label: "Low Risk", color: "text-green-500", bgColor: "bg-green-500/10" };
        case "medium":
            return { label: "Medium Risk", color: "text-yellow-500", bgColor: "bg-yellow-500/10" };
        case "high":
            return { label: "High Risk", color: "text-orange-500", bgColor: "bg-orange-500/10" };
        case "critical":
            return { label: "Critical Risk", color: "text-red-500", bgColor: "bg-red-500/10" };
    }
}

/**
 * Quick check if address should trigger a warning modal
 */
export function shouldShowWarning(verification: AddressVerification): boolean {
    return (
        verification.isScam ||
        verification.riskLevel === "critical" ||
        verification.riskLevel === "high" ||
        verification.warnings.length > 0
    );
}

/**
 * Add an address to the local scam list (user-reported)
 */
export function reportScamAddress(address: string, telegramId: string): void {
    const rawAddress = normalizeAddress(address);
    if (!rawAddress) return;

    const storageKey = `quantum_reported_scams_${telegramId}`;
    let reported: string[] = [];
    
    try {
        const stored = localStorage.getItem(storageKey);
        reported = stored ? JSON.parse(stored) : [];
    } catch {
        reported = [];
    }

    if (!reported.includes(rawAddress)) {
        reported.push(rawAddress);
        localStorage.setItem(storageKey, JSON.stringify(reported));
    }
}

/**
 * Check if an address was reported by this user
 */
export function isUserReported(address: string, telegramId: string): boolean {
    const rawAddress = normalizeAddress(address);
    if (!rawAddress) return false;

    try {
        const stored = localStorage.getItem(`quantum_reported_scams_${telegramId}`);
        const reported: string[] = stored ? JSON.parse(stored) : [];
        return reported.includes(rawAddress);
    } catch {
        return false;
    }
}
