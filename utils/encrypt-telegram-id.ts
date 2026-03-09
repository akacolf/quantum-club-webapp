import "server-only";
import { createCipheriv } from "node:crypto";
import { env } from "@/env";

/** Encrypt a raw Telegram ID into the deterministic QC ID used as Firestore document key. */
export function encryptTelegramId(telegramId: string): string {
  const encryptionKey = Buffer.from(env.AES_ENCRYPTION_KEY, "base64");
  const iv = Buffer.from("00000000000000000000000000000000", "utf8");
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);

  let encrypted = cipher.update(telegramId, "utf8", "base64");
  encrypted += cipher.final("base64");

  return encrypted.replace(/['"]+/g, "").replace(/[^a-zA-Z0-9]/g, "");
}
