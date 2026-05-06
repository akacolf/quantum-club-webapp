"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  BiometricAuth,
  useBiometricAuth,
} from "@/components/ui/biometric-auth";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useAuth } from "@/app/(contexts)/auth";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { sendTonFromUserWallet } from "@/lib/user-wallet-send";
import { haptics } from "@/lib/haptics";
import {
  quotePostUnlock,
  confirmPostUnlock,
} from "../pro-actions";

interface Props {
  authorQcId: string;
  postId: string;
  priceTon: number;
}

/**
 * Renders the paywall pill that replaces the body of a gated post the
 * reader has not yet unlocked. Handles the full quote → sign → confirm flow.
 */
export function LockedPost({ authorQcId, postId, priceTon }: Props) {
  const { currentUser } = useAuth();
  const { telegramId, walletAddress } = useUserContext();
  const isOwner = currentUser?.uid === authorQcId;

  const [busy, setBusy] = useState(false);
  const { isOpen, requestAuth, handleSuccess, handleCancel } =
    useBiometricAuth();

  async function unlock(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (!currentUser) {
      toast.error("Sign in to unlock");
      return;
    }
    if (!telegramId || !walletAddress) {
      toast.error("Connect a TON wallet first");
      return;
    }

    setBusy(true);
    haptics.light();
    const quote = await quotePostUnlock({ authorQcId, postId });
    if (quote?.serverError) {
      toast.error(quote.serverError);
      setBusy(false);
      return;
    }
    if (!quote?.data) {
      toast.error("Could not get a quote");
      setBusy(false);
      return;
    }
    if (quote.data.alreadyUnlocked) {
      setBusy(false);
      toast.success("Already unlocked");
      return;
    }
    const { paymentId, amountTon, recipient, memo } = quote.data;

    const ok = await requestAuth();
    if (!ok) {
      setBusy(false);
      return;
    }

    try {
      await sendTonFromUserWallet({
        telegramId,
        walletAddress,
        recipient,
        amountTon,
        memo,
      });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Couldn't send TON");
      haptics.error();
      setBusy(false);
      return;
    }

    toast.info("Waiting for TON confirmation…");
    let confirmed = false;
    const startedAt = Date.now();
    while (!confirmed && Date.now() - startedAt < 4 * 60 * 1000) {
      await new Promise((r) => setTimeout(r, 6000));
      const res = await confirmPostUnlock({ paymentId });
      if (res?.serverError) {
        toast.error(res.serverError);
        setBusy(false);
        return;
      }
      if (res?.data?.success) {
        confirmed = true;
        break;
      }
    }
    setBusy(false);
    if (confirmed) {
      haptics.success();
      toast.success("Unlocked");
    } else {
      toast.error("Still pending — refresh in a minute");
    }
  }

  if (isOwner) {
    return (
      <div className="mt-1 rounded-2xl bg-secondary/40 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
        <Icon
          icon="solar:lock-keyhole-minimalistic-bold"
          className="w-4 h-4 text-primary"
        />
        <span>
          Locked — readers pay {priceTon} TON to unlock.
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="mt-1 rounded-2xl bg-secondary/40 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon
            icon="solar:lock-keyhole-minimalistic-bold"
            className="w-4 h-4 text-primary shrink-0"
          />
          <p className="text-sm text-muted-foreground truncate">
            Premium post
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-full shrink-0"
          onClick={unlock}
          disabled={busy}
        >
          {busy ? <ButtonLoader size="sm" /> : `Unlock for ${priceTon} TON`}
        </Button>
      </div>
      <BiometricAuth
        isOpen={isOpen}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        title="Authorize unlock"
      />
    </>
  );
}
