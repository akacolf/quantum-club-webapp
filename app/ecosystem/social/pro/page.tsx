"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BiometricAuth,
  useBiometricAuth,
} from "@/components/ui/biometric-auth";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useAuth } from "@/app/(contexts)/auth";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useSocialProfile } from "@/app/(hooks)/queries/use-social";
import { sendTonFromUserWallet } from "@/lib/user-wallet-send";
import { haptics } from "@/lib/haptics";
import { QC_PRO_USD_PRICE } from "@/lib/validations";
import {
  quoteProSubscription,
  confirmProPayment,
} from "../pro-actions";

const PERKS = [
  {
    icon: "solar:verified-check-bold",
    title: "Verified badge",
    desc: "A blue check on your profile, leaderboard, and chat.",
  },
  {
    icon: "solar:magic-stick-3-bold",
    title: "Higher AI limits",
    desc: "More daily messages with the QC AI assistant.",
  },
  {
    icon: "solar:lock-keyhole-minimalistic-bold",
    title: "Publish gated posts",
    desc: "Charge readers in TON to unlock your premium content.",
  },
];

export default function QcProPage() {
  useTelegramBackButton("/ecosystem/social");
  const router = useRouter();
  const { currentUser } = useAuth();
  const qcId = currentUser?.uid ?? null;
  const { telegramId, walletAddress } = useUserContext();
  const { data: profile } = useSocialProfile(qcId);

  const { isOpen, requestAuth, handleSuccess, handleCancel } =
    useBiometricAuth();
  const [step, setStep] = useState<
    "idle" | "quoting" | "review" | "signing" | "verifying"
  >("idle");
  const [quote, setQuote] = useState<{
    paymentId: string;
    amountTon: number;
    memo: string;
    recipient: string;
  } | null>(null);

  const proExpiresAt = profile?.proExpiresAt ?? null;
  const isPro =
    proExpiresAt != null && proExpiresAt.toMillis() > Date.now();
  const expiresLabel = isPro
    ? new Date(proExpiresAt!.toMillis()).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  async function startQuote() {
    if (!qcId) return;
    setStep("quoting");
    haptics.light();
    const res = await quoteProSubscription();
    if (res?.serverError) {
      toast.error(res.serverError);
      setStep("idle");
      return;
    }
    if (!res?.data) {
      toast.error("Could not get a quote");
      setStep("idle");
      return;
    }
    setQuote({
      paymentId: res.data.paymentId,
      amountTon: res.data.amountTon,
      memo: res.data.memo,
      recipient: res.data.recipient,
    });
    setStep("review");
  }

  async function startPayment() {
    if (!quote) return;
    if (!telegramId || !walletAddress) {
      toast.error("Connect a TON wallet first");
      return;
    }
    const ok = await requestAuth();
    if (!ok) return;
    setStep("signing");
    try {
      await sendTonFromUserWallet({
        telegramId,
        walletAddress,
        recipient: quote.recipient,
        amountTon: quote.amountTon,
        memo: quote.memo,
      });
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "Couldn't send the payment",
      );
      haptics.error();
      setStep("review");
      return;
    }

    setStep("verifying");
    toast.info("Waiting for confirmation on TON…");
    let confirmed = false;
    const startedAt = Date.now();
    while (!confirmed && Date.now() - startedAt < 4 * 60 * 1000) {
      await new Promise((r) => setTimeout(r, 6000));
      const res = await confirmProPayment({ paymentId: quote.paymentId });
      if (res?.serverError) {
        toast.error(res.serverError);
        setStep("review");
        return;
      }
      if (res?.data?.success) {
        confirmed = true;
        break;
      }
    }
    if (!confirmed) {
      toast.error("Still pending — try again from this screen in a minute");
      setStep("review");
      return;
    }
    haptics.success();
    toast.success("You're QC Pro");
    setQuote(null);
    setStep("idle");
    router.refresh();
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Icon
            icon="solar:crown-bold"
            className="w-7 h-7 text-amber-400"
          />
          <h1 className="text-2xl font-bold">QC Pro</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Get the verified badge, raise your AI limits, and unlock gated
          posting on QC Social.
        </p>
      </header>

      <Card className="border-0 p-5 mb-5 bg-gradient-to-br from-amber-500/10 via-primary/5 to-transparent">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-bold">${QC_PRO_USD_PRICE}</span>
          <span className="text-sm text-muted-foreground">/ month</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Paid in TON, deducted from your QC wallet. No middleman fees.
        </p>

        {isPro ? (
          <div className="rounded-xl bg-primary/10 px-4 py-3 mb-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Icon
                icon="solar:check-circle-bold"
                className="w-4 h-4 text-primary"
              />
              You&apos;re Pro until {expiresLabel}
            </p>
          </div>
        ) : null}

        {step === "review" && quote ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-secondary/40 px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">
                  {quote.amountTon.toFixed(2)} TON
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">USD</span>
                <span>${QC_PRO_USD_PRICE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span className="font-mono text-xs">
                  {walletAddress
                    ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
                    : "—"}
                </span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full rounded-full"
              onClick={startPayment}
            >
              Confirm and pay
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setQuote(null);
                setStep("idle");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : step === "signing" || step === "verifying" ? (
          <div className="flex flex-col items-center gap-3 py-3">
            <ButtonLoader size="md" />
            <p className="text-xs text-muted-foreground text-center">
              {step === "signing"
                ? "Sending payment from your wallet…"
                : "Waiting for TON confirmation… this can take ~30 seconds"}
            </p>
          </div>
        ) : (
          <Button
            size="lg"
            className="w-full rounded-full"
            disabled={step === "quoting" || !qcId}
            onClick={startQuote}
          >
            {step === "quoting" ? (
              <ButtonLoader size="sm" />
            ) : isPro ? (
              "Extend by 30 days"
            ) : (
              "Subscribe"
            )}
          </Button>
        )}
      </Card>

      <div className="space-y-3">
        {PERKS.map((p) => (
          <div key={p.title} className="flex gap-3">
            <Icon
              icon={p.icon}
              className="w-6 h-6 text-primary shrink-0 mt-0.5"
            />
            <div>
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="text-xs text-muted-foreground">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-muted-foreground text-center">
        QC Pro renews on demand — there&apos;s no auto-charge. We&apos;ll
        remind you a few days before your membership expires.
      </p>

      <BiometricAuth
        isOpen={isOpen}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
        title="Authorize subscription"
      />
    </div>
  );
}
