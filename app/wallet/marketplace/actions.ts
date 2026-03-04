"use server";

import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import { firestore } from "@/app/(firebase)/server";

// ---------------------------------------------------------------------------
// getMysteryBoxes — get active mystery boxes
// ---------------------------------------------------------------------------

export const getMysteryBoxes = authActionClient
    .schema(z.object({}))
    .action(async () => {
        const snapshot = await firestore
            .collection("mystery_boxes")
            .where("status", "==", "active")
            .get();

        const boxes = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        return { success: true, boxes };
    });

// ---------------------------------------------------------------------------
// claimMysteryBox — claim a mystery box
// ---------------------------------------------------------------------------

const claimMysteryBoxSchema = z.object({
    boxId: z.string().min(1),
    paymentMethod: z.enum(["ton", "qntm"]),
});

export const claimMysteryBox = authActionClient
    .schema(claimMysteryBoxSchema)
    .action(async ({ ctx: { session }, parsedInput: { boxId, paymentMethod } }) => {
        const authenticatedTelegramId = String(session.user.telegramId);

        const result = await firestore.runTransaction(async (transaction) => {
            const boxRef = firestore.collection("mystery_boxes").doc(boxId);
            const boxDoc = await transaction.get(boxRef);

            if (!boxDoc.exists) {
                throw new Error("Mystery box not found");
            }

            const boxData = boxDoc.data()!;
            if (boxData.status !== "active") {
                throw new Error("Mystery box is no longer active");
            }
            if (boxData.remaining <= 0) {
                throw new Error("Mystery box is sold out");
            }

            const newRemaining = boxData.remaining - 1;
            transaction.update(boxRef, {
                remaining: newRemaining,
                ...(newRemaining === 0 ? { status: "sold_out" } : {}),
            });

            const claimRef = firestore.collection("mystery_box_claims").doc();
            transaction.set(claimRef, {
                boxId,
                userId: authenticatedTelegramId,
                claimedAt: new Date().toISOString(),
                paymentMethod,
                paymentAmount: paymentMethod === "ton" ? boxData.price?.ton : boxData.price?.qntm,
                revealedNft: null,
            });

            return { claimId: claimRef.id, remaining: newRemaining };
        });

        return { success: true, ...result };
    });
