"use server"

import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { auth, firestore } from "../(firebase)/server";
import { actionClient } from "@/lib/safe-action";

export const confirmTask = actionClient
    .schema(z.object({
        task: z.object({
            id: z.string(),
            completed: z.boolean(),
            platform: z.string(),
            quant: z.number(),
        }),
        telegramId: z.string().min(1),
        authToken: z.string().min(1),
    }))
    .action(async ({ parsedInput: { task, telegramId, authToken } }) => {
        const verifiedToken = await auth.verifyIdToken(authToken);
        if (!verifiedToken.uid) {
            return { error: true, message: "Unauthorized" };
        }

        const date = new Date(Date.now());
        const formattedDate = `${date
            .getDate()
            .toString()
            .padStart(2, "0")}/${(date.getMonth() + 1)
            .toString()
            .padStart(2, "0")}/${date.getFullYear()}`;

        await firestore.collection("user").doc(telegramId).collection("tasks").doc(task.id).set({
            completed: true,
            platform: task.platform,
            quant: task.quant,
            date: formattedDate,
        });

        await firestore.collection("user").doc(telegramId).collection("miningData").doc("values").update({
            QuantAmount: FieldValue.increment(task.quant),
        });

        return { error: false, message: "Task confirmed" };
    });
