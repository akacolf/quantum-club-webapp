"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { fromNano } from "@ton/core";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Icon } from "@iconify/react";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { getSecureMnemonic } from "@/lib/secure-mnemonic";
import { getTonStakersInfo, stakeTon } from "@/lib/tonstakers-integration";
import { formatCompactAmount, formatTruncatedAmount } from "@/lib/format";
import { stakeAmountSchema } from "@/lib/validations";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";

const TON_GAS_RESERVE = 0.5;

export default function StakingPage() {
  useTelegramBackButton("/wallet/more");

  const { tonBalance, tonPrice, walletAddress, fetchWalletAssets } = useWallet();
  const { telegramId } = useUserContext();
  const [isStaking, setIsStaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastStakeAmount, setLastStakeAmount] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);

  const {
    isOpen: isAuthOpen,
    requestAuth,
    handleSuccess: handleAuthSuccess,
    handleCancel: handleAuthCancel,
  } = useBiometricAuth();

  const form = useForm({
    defaultValues: { amount: "" },
    validators: { onSubmit: stakeAmountSchema },
  });

  const tonBalanceNum = Number.parseFloat(tonBalance) || 0;
  const stakeAmount = form.getFieldValue("amount");
  const stakeAmountNum = Number.parseFloat(stakeAmount) || 0;

  const tonstakersQuery = useQuery({
    queryKey: ["tonstakers-info", telegramId, walletAddress],
    queryFn: async () => {
      if (!telegramId) return null;

      const storedMnemonic = await getSecureMnemonic(telegramId);
      const storedAddress =
        walletAddress || localStorage.getItem(`quantum_wallet_address_${telegramId}`);

      if (!storedMnemonic || !storedAddress) return null;

      return getTonStakersInfo(storedAddress, storedMnemonic.split(" "), false, telegramId);
    },
    enabled: !!telegramId,
    staleTime: 60_000,
  });

  const stakingInfo = tonstakersQuery.data;
  const maxStakeAmount = Math.max(
    0,
    tonBalanceNum - TON_GAS_RESERVE,
  );
  const currentApy = stakingInfo?.apy ?? 0;
  const yearlyRewards = stakeAmountNum * (currentApy / 100);
  const estimatedTsTon = stakingInfo?.rates?.tsTONTON
    ? stakeAmountNum / stakingInfo.rates.tsTONTON
    : stakeAmountNum;

  const validation = (() => {
    if (stakeAmountNum <= 0) return { valid: false, error: "Enter amount" };
    if (stakeAmountNum > maxStakeAmount) return { valid: false, error: "Insufficient balance" };
    return { valid: true, error: "" };
  })();

  useEffect(() => {
    if (!isCalculating) return;

    const timeout = window.setTimeout(() => setIsCalculating(false), 450);
    return () => window.clearTimeout(timeout);
  }, [isCalculating, stakeAmount, stakingInfo]);

  const isButtonCalculating =
    stakeAmountNum > 0 && (isCalculating || tonstakersQuery.isLoading || tonstakersQuery.isFetching);

  const handleMax = () => {
    form.setFieldValue("amount", formatTruncatedAmount(maxStakeAmount, 2));
    setIsCalculating(maxStakeAmount > 0);
  };

  const handleStake = async () => {
    if (!telegramId || !validation.valid || isStaking) return;

    const authenticated = await requestAuth();
    if (!authenticated) {
      toast.error("Authentication required");
      return;
    }

    setIsStaking(true);
    setIsSuccess(false);

    try {
      const storedMnemonic = await getSecureMnemonic(telegramId);
      const storedAddress =
        walletAddress || localStorage.getItem(`quantum_wallet_address_${telegramId}`);

      if (!storedMnemonic || !storedAddress) {
        throw new Error("Wallet not found");
      }

      const result = await stakeTon(stakeAmount, storedAddress, storedMnemonic.split(" "), false, telegramId);

      if (!result.success) {
        throw new Error(result.error || "Staking failed");
      }

      setLastStakeAmount(stakeAmount);
      setIsSuccess(true);
      haptics.success();
      toast.success(`Staked ${stakeAmount} TON`, {
        description: `Estimated ${formatTruncatedAmount(estimatedTsTon, 2)} tsTON`,
      });

      window.setTimeout(() => {
        fetchWalletAssets();
        tonstakersQuery.refetch();
      }, 3000);
    } catch (error) {
      haptics.error();
      toast.error("Stake failed", {
        description: error instanceof Error ? error.message : "Transaction failed",
      });
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-black px-4 pt-6 pb-28 text-white">
      <div className="mx-auto max-w-md space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Stake</h1>
            <p className="text-sm text-neutral-500">
              Powered by{" "}
              <a
                href="https://tonstakers.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                Tonstakers
              </a>
            </p>
          </div>
          <button
            type="button"
            onClick={() => tonstakersQuery.refetch()}
            disabled={tonstakersQuery.isFetching}
            className="flex h-10 w-10 items-center justify-center rounded-full outline-none active:bg-white/10 focus-visible:outline-none focus-visible:ring-0"
            aria-label="Refresh staking stats"
          >
            <Icon icon="lucide:refresh-cw" className={`h-5 w-5 text-neutral-400 ${tonstakersQuery.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        <section className="grid grid-cols-2 gap-3">
          <Stat label="APY" value={currentApy ? `${formatTruncatedAmount(currentApy, 2)}%` : "--"} />
          <Stat label="TVL" value={stakingInfo ? `${formatCompactAmount(Number(fromNano(stakingInfo.tvl)), 2)} TON` : "--"} />
          <Stat label="Stakers" value={stakingInfo ? formatCompactAmount(stakingInfo.stakersCount, 2) : "--"} />
          <Stat label="Instant liquidity" value={stakingInfo ? `${formatCompactAmount(Number(fromNano(stakingInfo.instantLiquidity)), 2)} TON` : "--"} />
          <Stat label="tsTON rate" value={stakingInfo?.rates?.tsTONTON ? `1 tsTON = ${formatTruncatedAmount(stakingInfo.rates.tsTONTON, 2)} TON` : "--"} />
        </section>

        <section className="rounded-2xl bg-secondary p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-neutral-400">Amount to stake</Label>
            <button type="button" onClick={handleMax} className="text-xs text-primary">
              Max: {formatTruncatedAmount(maxStakeAmount, 2)} TON
            </button>
          </div>

          <form.Field name="amount">
            {(field) => (
              <>
                <div className="flex items-center gap-2 rounded-2xl bg-black px-3 py-2">
                  <Image src="/svg/ton-logo.svg" alt="TON" width={24} height={24} className="h-6 w-6" />
                  <span className="font-semibold text-white">TON</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={field.state.value}
                    onChange={(event) => {
                      const value = event.target.value.replace(",", ".");
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        field.handleChange(value);
                        setIsSuccess(false);
                        setIsCalculating(value !== "");
                      }
                    }}
                    className="h-12 flex-1 border-0 bg-transparent text-right text-2xl font-bold text-white focus-visible:ring-0"
                  />
                </div>
                {field.state.meta.errors.length > 0 && (
                  <FieldError errors={field.state.meta.errors.map((error) => ({ message: typeof error === "string" ? error : String(error) }))} />
                )}
              </>
            )}
          </form.Field>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Wallet balance</span>
              <span>{formatTruncatedAmount(tonBalanceNum, 2)} TON</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Estimated receive</span>
              <span>{formatTruncatedAmount(estimatedTsTon, 2)} tsTON</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Yearly rewards</span>
              <span className="text-green-500">+{formatTruncatedAmount(yearlyRewards, 2)} TON</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Value</span>
              <span>${(stakeAmountNum * tonPrice).toFixed(2)}</span>
            </div>
          </div>

          <Button
            onClick={handleStake}
            disabled={!validation.valid || isStaking || tonstakersQuery.isLoading || isButtonCalculating}
            className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground"
          >
            {isStaking ? <ButtonLoader /> : isButtonCalculating ? "Calculating..." : validation.valid ? `Stake ${formatTruncatedAmount(stakeAmountNum, 2)} TON` : validation.error}
          </Button>

          {isSuccess && (
            <p className="text-center text-sm text-green-500">
              Staked {lastStakeAmount} TON. Balance will refresh shortly.
            </p>
          )}
        </section>

        <Link href="/wallet/unstake" className="flex items-center justify-between rounded-2xl bg-secondary p-4 active:scale-[0.99]">
          <div className="flex items-center gap-3">
            <Icon icon="lucide:arrow-up-right" className="h-5 w-5 text-neutral-400" />
            <div>
              <p className="text-sm font-semibold text-white">Unstake tsTON</p>
              <p className="text-xs text-neutral-500">Convert tsTON back to TON</p>
            </div>
          </div>
          <Icon icon="lucide:chevron-right" className="h-4 w-4 text-neutral-500" />
        </Link>

        <BiometricAuth
          isOpen={isAuthOpen}
          onSuccess={handleAuthSuccess}
          onCancel={handleAuthCancel}
          title="Confirm stake"
          description="Authenticate to stake your TON"
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
