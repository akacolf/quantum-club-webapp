"use server"

import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "../(firebase)/server";
import { authActionClient, authWithQcIdClient } from "@/lib/safe-action";
import { env } from "@/env";

export const confirmTask = authWithQcIdClient
    .schema(z.object({
        taskId: z.string().min(1),
        platform: z.string().min(1),
    }))
    .action(async ({ parsedInput: { taskId, platform }, ctx: { qcId } }) => {
        // Look up reward amount from server-side task definition — never trust client
        const taskDoc = await firestore.collection("tasks").doc(taskId).get();
        if (!taskDoc.exists) {
            return { error: true, message: "Task not found" };
        }
        const quantReward = taskDoc.data()?.quantReward;
        if (typeof quantReward !== "number" || quantReward <= 0) {
            return { error: true, message: "Invalid task reward" };
        }

        // Check if task already completed
        const existingTask = await firestore.collection("user").doc(qcId).collection("tasks").doc(taskId).get();
        if (existingTask.exists && existingTask.data()?.completed) {
            return { error: true, message: "Task already completed" };
        }

        const date = new Date(Date.now());
        const formattedDate = `${date
            .getDate()
            .toString()
            .padStart(2, "0")}/${(date.getMonth() + 1)
            .toString()
            .padStart(2, "0")}/${date.getFullYear()}`;

        await firestore.collection("user").doc(qcId).collection("tasks").doc(taskId).set({
            completed: true,
            platform,
            quant: quantReward,
            date: formattedDate,
        });

        await firestore.collection("user").doc(qcId).collection("miningData").doc("values").update({
            QuantAmount: FieldValue.increment(quantReward),
        });

        return { error: false, message: "Task confirmed", quant: quantReward };
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
        if (!data.ok || !data.result?.status) {
            throw new Error("Invalid Telegram API response");
        }

        const status = data.result.status;
        const isMember = ["creator", "administrator", "member"].includes(status);
        return { isMember };
    });
