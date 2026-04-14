import { createSafeActionClient } from "next-safe-action";
import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { getSession } from "@/utils/session";
import { encryptTelegramId } from "@/utils/encrypt-telegram-id";

/** Base action client — no auth required */
export const actionClient = createSafeActionClient();

/**
 * Authenticated action client — checks Telegram JWT session first,
 * then falls back to Firebase auth cookies as a resilience path for
 * cases where the session cookie is missing/corrupted but the user
 * still has valid Firebase credentials. Mirrors the auth logic in
 * proxy.ts so server actions accept the same credentials the middleware does.
 */
export const authActionClient = createSafeActionClient().use(async ({ next }) => {
  // Primary: Telegram session cookie (JWT)
  const session = await getSession();
  if (session) {
    return next({ ctx: { session } });
  }

  // Fallback: Firebase auth ID token cookie (resilience path).
  // Only accept a non-expired, decodable JWT — a bare refresh token
  // cookie is not sufficient since its value is never validated here.
  const cookieStore = await cookies();
  const firebaseToken = cookieStore.get("firebaseAuthToken")?.value;

  if (firebaseToken) {
    try {
      const decoded = decodeJwt(firebaseToken);
      if (decoded.exp && decoded.exp * 1000 >= Date.now()) {
        return next({ ctx: { session: null } });
      }
    } catch {
      // Invalid/malformed token — reject
    }
  }

  throw new Error("Unauthorized");
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
