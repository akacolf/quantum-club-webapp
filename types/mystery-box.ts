export interface MysteryBox {
    id: string;
    name: string;
    description: string;
    image: string;
    price: {
        ton: number;
        qntm?: number;
    };
    totalAvailable: number;
    remaining: number;
    status: "active" | "sold_out" | "expired";
    createdAt: string;
    expiresAt?: string;
}

export interface MysteryBoxClaim {
    id: string;
    boxId: string;
    userId: string;
    claimedAt: string;
    revealedNft?: {
        address: string;
        name: string;
        image?: string;
        collectionName?: string;
    };
    paymentMethod: "ton" | "qntm";
    paymentAmount: number;
}
