import { createSafeActionClient } from "next-safe-action";
import { getSession } from "@/utils/session";

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
