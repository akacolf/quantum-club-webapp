import { createSafeActionClient } from "next-safe-action";
import { getSession } from "@/utils/session";
import { encryptTelegramId } from "@/utils/encrypt-telegram-id";

/** Base action client — no auth required */
export const actionClient = createSafeActionClient();

/** Authenticated action client — checks JWT session, passes session to handler via ctx */
export const authActionClient = createSafeActionClient().use(async ({ next }) => {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return next({ ctx: { session } });
});

/** Authenticated action client that also provides the encrypted QC ID derived from the session's telegramId */
export const authWithQcIdClient = createSafeActionClient().use(async ({ next }) => {
  const session = await getSession();
  if (!session?.user?.telegramId) {
    throw new Error("Unauthorized");
  }
  const telegramId = String(session.user.telegramId);
  const qcId = encryptTelegramId(telegramId);
  return next({ ctx: { session, qcId, telegramId } });
});
