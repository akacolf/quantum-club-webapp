/**
 * QC — Firebase Cloud Functions
 *
 * Broadcast push notifications via Telegram Bot API.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// ===========================================================================
// QC Broadcasts — push notifications
// ===========================================================================

interface BroadcastPostNotification {
    broadcastId: string;
    postId: string;
    broadcastName: string;
    broadcastHandle: string;
    preview: string;
    hasImage: boolean;
}

function getBroadcastBotToken(): string | undefined {
    // Match existing functions pattern: functions.config() for v1 config.
    // Set via: firebase functions:config:set bot.token=xxx [bot.username=xxx]
    return functions.config().bot?.token || process.env.BOT_TOKEN;
}

function getBroadcastBotUsername(): string {
    return (
        functions.config().bot?.username ||
        process.env.BOT_USERNAME ||
        "QuantumClubBot"
    );
}

function resolveNumericalTelegramId(data: admin.firestore.DocumentData | undefined): string | null {
    if (!data) return null;
    if (data.numericalTelegramId) return String(data.numericalTelegramId);
    const userArray = data.userArray;
    if (typeof userArray === "string") {
        const match = userArray.match(/telegramId=(\d+)/);
        return match ? match[1] : null;
    }
    return null;
}

function buildPostPreview(post: admin.firestore.DocumentData): {
    preview: string;
    hasImage: boolean;
} {
    const content = typeof post.content === "string" ? post.content.trim() : "";
    const media = Array.isArray(post.media) ? post.media : [];
    const hasImage = media.length > 0;

    if (content) {
        return {
            preview: content.length > 140 ? content.slice(0, 140) + "…" : content,
            hasImage,
        };
    }
    if (hasImage) return { preview: "📷 Shared a new image", hasImage };
    return { preview: "New post", hasImage };
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

async function sendBroadcastNotification(
    botToken: string,
    telegramId: string,
    notif: BroadcastPostNotification,
    deepLink: string,
    channelLink: string,
): Promise<void> {
    // Wrapping the @handle in a hyperlink prevents Telegram from auto-linking
    // it to an unrelated Telegram account with the same username.
    const message =
        `<b>${escapeHtml(notif.broadcastName)}</b> ` +
        `(<a href="${channelLink}">@${escapeHtml(notif.broadcastHandle)}</a>) ` +
        `has published a post in their broadcast`;

    try {
        const res = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: telegramId,
                    text: message,
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: [[{ text: "Open broadcast", url: deepLink }]],
                    },
                }),
            },
        );
        if (!res.ok) {
            const body = await res.text();
            functions.logger.warn(
                `[onBroadcastPostCreate] Telegram API ${res.status} for ${telegramId}: ${body}`,
            );
        }
    } catch (err) {
        functions.logger.error(
            `[onBroadcastPostCreate] fetch failed for ${telegramId}:`,
            err,
        );
    }
}

/**
 * Fires when a new post lands under broadcasts/{broadcastId}/posts/{postId}.
 * Reads non-muted subscribers and fans out a Telegram notification to each.
 * Subscriber identity stays private — the function looks up numerical
 * Telegram IDs server-side and never surfaces them to the admin.
 */
export const onBroadcastPostCreate = functions.firestore
    .document("broadcasts/{broadcastId}/posts/{postId}")
    .onCreate(async (snap: functions.firestore.DocumentSnapshot, context: functions.EventContext) => {
        const { broadcastId, postId } = context.params as {
            broadcastId: string;
            postId: string;
        };
        const post = snap.data();
        if (!post) return null;

        const botToken = getBroadcastBotToken();
        if (!botToken) {
            functions.logger.warn(
                "[onBroadcastPostCreate] BOT_TOKEN not configured — skipping fan-out",
            );
            return null;
        }

        const broadcastSnap = await db.doc(`broadcasts/${broadcastId}`).get();
        const broadcast = broadcastSnap.data();
        if (!broadcast) {
            functions.logger.warn(
                `[onBroadcastPostCreate] broadcast ${broadcastId} missing`,
            );
            return null;
        }

        const { preview, hasImage } = buildPostPreview(post);
        const botUsername = getBroadcastBotUsername();
        const handle = String(broadcast.handle ?? broadcastId);
        const deepLink = `https://t.me/${botUsername}/app?startapp=bcast-${handle}-${postId}`;
        const channelLink = `https://t.me/${botUsername}/app?startapp=bcast-${handle}`;

        const notif: BroadcastPostNotification = {
            broadcastId,
            postId,
            broadcastName: String(broadcast.name ?? "Broadcast"),
            broadcastHandle: handle,
            preview,
            hasImage,
        };

        // Load all non-muted subscribers.
        const subsSnap = await db
            .collection(`broadcasts/${broadcastId}/subscribers`)
            .where("muted", "==", false)
            .get();

        functions.logger.info(
            `[onBroadcastPostCreate] fanning out broadcast=${broadcastId} post=${postId} to ${subsSnap.size} subscribers`,
        );

        const tasks = subsSnap.docs.map(async (subDoc) => {
            const qcId = subDoc.id;
            try {
                const userSnap = await db.doc(`user/${qcId}`).get();
                if (!userSnap.exists) return;
                const telegramId = resolveNumericalTelegramId(userSnap.data());
                if (!telegramId) return;
                await sendBroadcastNotification(
                    botToken,
                    telegramId,
                    notif,
                    deepLink,
                    channelLink,
                );
            } catch (err) {
                functions.logger.error(
                    `[onBroadcastPostCreate] error for ${qcId}:`,
                    err,
                );
            }
        });

        await Promise.allSettled(tasks);
        return null;
    });
