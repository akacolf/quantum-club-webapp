"use client";

/**
 * Transaction label management
 * Stores labels in localStorage for user-added notes/tags on transactions
 */

export interface TransactionLabel {
    txHash: string;
    label: string;
    tags: string[];
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = "quantum_transaction_labels";

/**
 * Get all transaction labels from storage
 */
function getTransactionLabels(telegramId: string): Record<string, TransactionLabel> {
    if (typeof window === "undefined") return {};
    
    try {
        const stored = localStorage.getItem(`${STORAGE_KEY}_${telegramId}`);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

/**
 * Save or update a transaction label
 */
export function saveTransactionLabel(
    txHash: string,
    label: string,
    tags: string[],
    telegramId: string
): TransactionLabel {
    const labels = getTransactionLabels(telegramId);
    const now = Date.now();
    
    const existingLabel = labels[txHash];
    const newLabel: TransactionLabel = {
        txHash,
        label: label.trim(),
        tags: tags.map(t => t.trim().toLowerCase()).filter(t => t.length > 0),
        createdAt: existingLabel?.createdAt || now,
        updatedAt: now,
    };
    
    labels[txHash] = newLabel;
    
    try {
        localStorage.setItem(`${STORAGE_KEY}_${telegramId}`, JSON.stringify(labels));
    } catch (error) {
        console.error("Failed to save transaction label:", error);
    }
    
    return newLabel;
}

/**
 * Delete a transaction label
 */
export function deleteTransactionLabel(txHash: string, telegramId: string): boolean {
    const labels = getTransactionLabels(telegramId);
    
    if (!labels[txHash]) return false;
    
    delete labels[txHash];
    
    try {
        localStorage.setItem(`${STORAGE_KEY}_${telegramId}`, JSON.stringify(labels));
        return true;
    } catch {
        return false;
    }
}

/**
 * Predefined tag suggestions for common transaction types
 */
export const SUGGESTED_TAGS = [
    "swap",
    "send",
    "receive",
    "stake",
    "unstake",
    "nft",
    "personal",
    "business",
    "fee",
    "refund",
    "airdrop",
    "dapp",
    "contract",
    "test",
] as const;

/**
 * Format tag for display (capitalize first letter)
 */
export function formatTag(tag: string): string {
    return tag.charAt(0).toUpperCase() + tag.slice(1);
}
