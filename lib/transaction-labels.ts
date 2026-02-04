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
export function getTransactionLabels(telegramId: string): Record<string, TransactionLabel> {
    if (typeof window === "undefined") return {};
    
    try {
        const stored = localStorage.getItem(`${STORAGE_KEY}_${telegramId}`);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

/**
 * Get label for a specific transaction
 */
export function getTransactionLabel(txHash: string, telegramId: string): TransactionLabel | null {
    const labels = getTransactionLabels(telegramId);
    return labels[txHash] || null;
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
 * Search transactions by label or tag
 */
export function searchTransactionLabels(
    query: string,
    telegramId: string
): TransactionLabel[] {
    const labels = getTransactionLabels(telegramId);
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) return Object.values(labels);
    
    return Object.values(labels).filter(label => {
        // Search in label text
        if (label.label.toLowerCase().includes(normalizedQuery)) {
            return true;
        }
        // Search in tags
        if (label.tags.some(tag => tag.includes(normalizedQuery))) {
            return true;
        }
        // Search in tx hash
        if (label.txHash.toLowerCase().includes(normalizedQuery)) {
            return true;
        }
        return false;
    });
}

/**
 * Get all unique tags across all transactions
 */
export function getAllTags(telegramId: string): string[] {
    const labels = getTransactionLabels(telegramId);
    const tagSet = new Set<string>();
    
    Object.values(labels).forEach(label => {
        label.tags.forEach(tag => tagSet.add(tag));
    });
    
    return Array.from(tagSet).sort();
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
