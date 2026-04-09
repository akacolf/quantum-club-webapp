"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useForm, useStore } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useWallet } from "@/app/wallet/WalletContext";
import { toNano, Address } from "@ton/core";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { chatTransferSchema } from "@/lib/validations";
import {
  buildJettonTransferMessage,
  getJettonWalletAddress,
  getContractAdapter,
  parseTokenAmount,
} from "@/lib/jetton-operations";
import type { JettonBalance } from "@/stores/wallet-store";
import { cn } from "@/lib/utils";

type SelectedAsset =
  | { type: "ton" }
  | { type: "jetton"; data: JettonBalance };

export interface TransferSendPayload {
  amount: string;
  txHash: string;
  recipientAddress: string;
  jetton?: {
    master: string;
    symbol: string;
    name: string;
    decimals: number;
    image?: string;
  };
}

interface TransferDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  recipientAddress: string | null;
  onSend: (payload: TransferSendPayload) => void;
  onFailed: (amount: string, error: string) => void;
}

function isValidTonAddress(addr: string): boolean {
  try {
    Address.parse(addr);
    return true;
  } catch {
    return false;
  }
}

export default function TransferDrawer({
  open,
  onOpenChange,
  recipientName,
  recipientAddress,
  onSend,
  onFailed,
}: TransferDrawerProps) {
  const { tonBalance, tonPrice, sendTransaction, walletAddress, jettons, isTestnet } = useWallet();
  const [isSending, setIsSending] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<SelectedAsset>({ type: "ton" });

  // Only show jettons the user actually holds and hasn't hidden
  const visibleJettons = useMemo(
    () => jettons.filter((j) => !j.isHidden && parseFloat(j.balance) > 0 && j.jettonAddress),
    [jettons],
  );

  const form = useForm({
    defaultValues: { amount: "", address: "" },
    validators: { onSubmit: chatTransferSchema },
  });

  // Reset form + asset when drawer opens
  useEffect(() => {
    if (open) {
      form.reset();
      setSelectedAsset({ type: "ton" });
    }
  }, [open]);

  const address = useStore(form.store, (s) => s.values.address);
  const amount = useStore(form.store, (s) => s.values.amount);

  const resolvedAddress = recipientAddress || (isValidTonAddress(address) ? address : null);

  // Asset-dependent balance + limits
  const isJetton = selectedAsset.type === "jetton";
  const assetSymbol = isJetton ? selectedAsset.data.symbol : "TON";
  const assetImage = isJetton ? selectedAsset.data.image : "/svg/ton-logo.svg";
  const assetBalance = isJetton
    ? parseFloat(selectedAsset.data.balance) || 0
    : parseFloat(tonBalance) || 0;
  const FEE_RESERVE = isJetton ? 0 : 0.05;
  const maxSendable = Math.max(0, assetBalance - FEE_RESERVE);
  const numericAmount = parseFloat(amount) || 0;
  const pricePerUnit = isJetton ? (selectedAsset.data.priceUsd ?? 0) : tonPrice;
  const usdValue = numericAmount * pricePerUnit;
  const isValidAmount = numericAmount > 0 && numericAmount <= maxSendable;

  const handleMax = () => {
    form.setFieldValue("amount", maxSendable > 0 ? maxSendable.toString() : "0");
  };

  const handleSelectAsset = (next: SelectedAsset) => {
    if (
      (next.type === "ton" && selectedAsset.type === "ton") ||
      (next.type === "jetton" &&
        selectedAsset.type === "jetton" &&
        next.data.jettonAddress === selectedAsset.data.jettonAddress)
    ) {
      return;
    }
    setSelectedAsset(next);
    form.setFieldValue("amount", "");
    haptics.light();
  };

  const handleSend = async () => {
    if (!isValidAmount || isSending || !walletAddress || !resolvedAddress) return;

    setIsSending(true);
    try {
      if (!isJetton) {
        // --- TON path (original flow) ---
        const result = await sendTransaction({
          to: resolvedAddress,
          value: toNano(amount).toString(),
        });

        if (result.success && result.txHash) {
          haptics.success();
          onSend({ amount, txHash: result.txHash, recipientAddress: resolvedAddress });
          form.reset();
          onOpenChange(false);
          return;
        }

        const errorMsg = result.error || "Transaction failed";
        haptics.error();
        toast.error(errorMsg);
        onFailed(amount, errorMsg);
        return;
      }

      // --- Jetton path (TEP-74 transfer) ---
      const jetton = selectedAsset.data;
      if (!jetton.jettonAddress) {
        throw new Error("Jetton master address unavailable");
      }

      // Derive sender's jetton wallet address (deterministic, cached in the helper)
      const adapter = getContractAdapter(isTestnet);
      const senderJettonWallet = await getJettonWalletAddress(
        jetton.jettonAddress,
        walletAddress,
        adapter,
        isTestnet,
      );
      if (!senderJettonWallet) {
        throw new Error("Could not locate your jetton wallet on-chain");
      }

      // Build TEP-74 transfer body.
      // forwardTonAmount = 0.01 TON → triggers a notification to the recipient's
      // jetton wallet so their UI shows the incoming transfer right away.
      const transferBody = buildJettonTransferMessage({
        jettonAmount: parseTokenAmount(amount, jetton.decimals),
        toOwnerAddress: Address.parse(resolvedAddress),
        responseAddress: Address.parse(walletAddress),
        forwardTonAmount: toNano("0.01"),
      });

      // Send 0.05 TON as gas: covers network fee + the 0.01 TON forward + excesses
      const result = await sendTransaction({
        to: senderJettonWallet,
        value: toNano("0.05").toString(),
        body: transferBody,
      });

      if (result.success && result.txHash) {
        haptics.success();
        onSend({
          amount,
          txHash: result.txHash,
          recipientAddress: resolvedAddress,
          jetton: {
            master: jetton.jettonAddress,
            symbol: jetton.symbol,
            name: jetton.name,
            decimals: jetton.decimals,
            image: jetton.image,
          },
        });
        form.reset();
        onOpenChange(false);
        return;
      }

      const errorMsg = result.error || "Transaction failed";
      haptics.error();
      toast.error(errorMsg);
      onFailed(amount, errorMsg);
    } catch (err: any) {
      const errorMsg = err?.message || "Transaction failed";
      haptics.error();
      toast.error(errorMsg);
      onFailed(amount, errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  const truncatedAddress = resolvedAddress && resolvedAddress.length > 12
    ? `${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)}`
    : resolvedAddress;

  const renderAssetChip = (
    key: string,
    label: string,
    sub: string,
    image: string | undefined,
    isSelected: boolean,
    onClick: () => void,
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors shrink-0",
        isSelected ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/50",
      )}
    >
      {image ? (
        <Image
          src={image}
          alt={label}
          width={24}
          height={24}
          className="rounded-full shrink-0"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
          {label.charAt(0)}
        </div>
      )}
      <div className="text-left">
        <p className="text-[12px] font-semibold leading-none">{label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </button>
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-base flex items-center gap-2">
              {assetImage ? (
                <Image src={assetImage} alt={assetSymbol} width={20} height={20} className="rounded-full" />
              ) : null}
              Send {assetSymbol}
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              Send {assetSymbol} directly in chat
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4">
            {/* Asset picker — horizontal scroll of TON + jettons */}
            <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-2 w-max">
                {renderAssetChip(
                  "ton",
                  "TON",
                  Number(tonBalance).toFixed(2),
                  "/svg/ton-logo.svg",
                  !isJetton,
                  () => handleSelectAsset({ type: "ton" }),
                )}
                {visibleJettons.map((j) =>
                  renderAssetChip(
                    j.jettonAddress || j.symbol,
                    j.symbol,
                    Number(j.balance).toLocaleString("en-US", { maximumFractionDigits: 2 }),
                    j.image,
                    isJetton && selectedAsset.data.jettonAddress === j.jettonAddress,
                    () => handleSelectAsset({ type: "jetton", data: j }),
                  ),
                )}
              </div>
            </div>

            {/* Recipient */}
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">To</p>
              <p className="text-sm font-medium">@{recipientName}</p>
              {recipientAddress ? (
                <p className="text-[11px] text-muted-foreground font-mono">{truncatedAddress}</p>
              ) : (
                <form.Field name="address">
                  {(field) => (
                    <div className="mt-1.5">
                      <Input
                        type="text"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Paste TON address (EQ/UQ...)"
                        className="text-base h-9 rounded-lg font-mono"
                      />
                      {field.state.value && !isValidTonAddress(field.state.value) && (
                        <p className="text-[10px] text-red-500 mt-1">Invalid TON address</p>
                      )}
                      {field.state.meta.errors.length > 0 && (
                        <FieldError errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} className="text-[10px] mt-1" />
                      )}
                    </div>
                  )}
                </form.Field>
              )}
            </div>

            {/* Amount input */}
            <form.Field name="amount">
              {(field) => (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Amount</p>
                    <button
                      onClick={handleMax}
                      className="text-[10px] text-primary font-semibold hover:underline"
                    >
                      MAX ({maxSendable.toLocaleString("en-US", { maximumFractionDigits: 4 })} {assetSymbol})
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="0.00"
                      className="pr-16 text-lg font-semibold h-12 rounded-xl"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                      {assetSymbol}
                    </span>
                  </div>
                  {numericAmount > 0 && pricePerUnit > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      ≈ ${usdValue.toFixed(2)} USD
                    </p>
                  )}
                  {numericAmount > maxSendable && numericAmount > 0 && (
                    <p className="text-[11px] text-red-500 mt-1">
                      Insufficient balance
                    </p>
                  )}
                  {field.state.meta.errors.length > 0 && (
                    <FieldError errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} className="text-[11px] mt-1" />
                  )}
                </div>
              )}
            </form.Field>

            {/* Fee estimate */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>Network fee</span>
              <span>{isJetton ? "~0.05 TON" : "~0.005 TON"}</span>
            </div>

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={!isValidAmount || isSending || !resolvedAddress}
              className="w-full h-11 rounded-xl font-semibold"
            >
              {isSending ? (
                <div className="flex items-center gap-2">
                  <ButtonLoader size="sm" />
                  Sending...
                </div>
              ) : (
                `Send ${numericAmount > 0 ? `${amount} ${assetSymbol}` : ""}`
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
