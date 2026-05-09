"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/app/(contexts)/UserContext";
import Loader from "@/app/(components)/Loader";
import { confirmBotLink } from "../actions";

interface PageProps {
  params: Promise<{ tokenId: string }>;
}

// Resolves a bot-issued `link_<id>` deep-link. The session cookie identifies
// the QC user (Telegram ID) — the server action validates it matches the
// token, then writes botUserBindings/{telegramId}. We pass walletAddress in
// from client state because it's stored client-side only (mnemonic security).
export default function LinkResolverPage({ params }: PageProps) {
  const { tokenId } = use(params);
  const router = useRouter();
  const { walletAddress, _hasHydrated } = useUserContext();
  const [serverError, setServerError] = useState<string | null>(null);
  const submitted = useRef(false);

  // Derive the no-wallet error at render time rather than stashing it in
  // state via the effect — avoids a setState-in-effect cascade and keeps
  // the effect responsible only for the async network round-trip.
  const noWallet = _hasHydrated && !walletAddress;
  const error = noWallet
    ? "No wallet found — open Quantum Club once before linking."
    : serverError;

  useEffect(() => {
    if (!_hasHydrated || !walletAddress || submitted.current) return;
    submitted.current = true;

    (async () => {
      const res = await confirmBotLink({ tokenId, walletAddress });
      if (res?.serverError) {
        setServerError(res.serverError);
        return;
      }
      if (res?.validationErrors) {
        setServerError("Invalid link payload");
        return;
      }
      router.replace("/home?linked=1");
    })();
  }, [_hasHydrated, walletAddress, tokenId, router]);

  if (error) {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-background p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/home")}
            className="text-sm underline"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return <Loader />;
}
