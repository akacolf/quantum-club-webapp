export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    icon: string; // Solar icon name
    color: string; // Tailwind color class
    rarity: BadgeRarity;
    criteria: string; // Human-readable unlock criteria
}

export interface UserBadge {
    badgeId: string;
    earnedAt: Date;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
    {
        id: "early_adopter",
        name: "Early Adopter",
        description: "Joined Quantum Club during the early access period",
        icon: "solar:star-bold",
        color: "text-yellow-500",
        rarity: "rare",
        criteria: "Join during early access",
    },
    {
        id: "first_trade",
        name: "First Trade",
        description: "Completed your first token trade on QC RocketStart",
        icon: "solar:rocket-bold",
        color: "text-blue-500",
        rarity: "common",
        criteria: "Complete 1 trade",
    },
    {
        id: "diamond_hands",
        name: "Diamond Hands",
        description: "Held a token for over 30 days without selling",
        icon: "solar:diamond-bold",
        color: "text-cyan-400",
        rarity: "uncommon",
        criteria: "Hold a token for 30+ days",
    },
    {
        id: "social_butterfly",
        name: "Social Butterfly",
        description: "Started 5 or more direct chats with other users",
        icon: "solar:chat-round-dots-bold",
        color: "text-pink-500",
        rarity: "common",
        criteria: "Start 5+ chats",
    },
    {
        id: "nft_collector",
        name: "NFT Collector",
        description: "Own 10 or more NFTs in your wallet",
        icon: "solar:gallery-bold",
        color: "text-purple-500",
        rarity: "uncommon",
        criteria: "Own 10+ NFTs",
    },
    {
        id: "whale",
        name: "Whale",
        description: "Hold over 100,000 QNTM tokens",
        icon: "solar:water-bold",
        color: "text-blue-600",
        rarity: "epic",
        criteria: "Hold 100K+ QNTM",
    },
    {
        id: "referral_king",
        name: "Referral King",
        description: "Referred 10 or more friends to Quantum Club",
        icon: "solar:users-group-rounded-bold",
        color: "text-green-500",
        rarity: "rare",
        criteria: "Refer 10+ friends",
    },
    {
        id: "group_leader",
        name: "Group Leader",
        description: "Created and manage an active group",
        icon: "solar:crown-bold",
        color: "text-amber-500",
        rarity: "uncommon",
        criteria: "Create a group",
    },
    {
        id: "marketplace_seller",
        name: "Marketplace Seller",
        description: "Successfully sold an NFT on the QC Marketplace",
        icon: "solar:tag-price-bold",
        color: "text-green-400",
        rarity: "uncommon",
        criteria: "Sell 1 NFT on marketplace",
    },
    {
        id: "power_user",
        name: "Power User",
        description: "Logged in for 30 consecutive days",
        icon: "solar:bolt-bold",
        color: "text-orange-500",
        rarity: "epic",
        criteria: "30-day login streak",
    },
];

export const RARITY_COLORS: Record<BadgeRarity, string> = {
    common: "bg-gray-500/20 text-gray-400",
    uncommon: "bg-green-500/20 text-green-400",
    rare: "bg-blue-500/20 text-blue-400",
    epic: "bg-purple-500/20 text-purple-400",
    legendary: "bg-amber-500/20 text-amber-400",
};

export function getBadgeDefinition(id: string): BadgeDefinition | undefined {
    return BADGE_DEFINITIONS.find((b) => b.id === id);
}
