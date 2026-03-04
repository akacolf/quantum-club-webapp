"use server"

import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { auth, firestore } from "../(firebase)/server";
import { actionClient, authActionClient } from "@/lib/safe-action";
import { env } from "@/env";

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

// ---------------------------------------------------------------------------
// checkMembership — authenticated, checks Telegram channel membership
// ---------------------------------------------------------------------------

const checkMembershipSchema = z.object({
    tgIdNumerical: z.union([z.string(), z.number()]).pipe(
        z.coerce.string().min(1, "telegramId is required")
    ),
    channelUsername: z.string().min(1, "channelUsername is required"),
});

export const checkMembership = authActionClient
    .schema(checkMembershipSchema)
    .action(async ({ parsedInput: { tgIdNumerical, channelUsername } }) => {
        const botToken = env.BOT_TOKEN;

        let formattedChatId = channelUsername;
        if (!channelUsername.startsWith("@") && !channelUsername.startsWith("-100")) {
            formattedChatId = "@" + channelUsername;
        }

        const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(
            formattedChatId
        )}&user_id=${tgIdNumerical}`;

        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Telegram API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        if (!data.ok) {
            throw new Error(`Telegram API returned false: ${JSON.stringify(data)}`);
        }

        const status = data.result.status;
        const isMember = ["creator", "administrator", "member"].includes(status);
        return { isMember };
    });
