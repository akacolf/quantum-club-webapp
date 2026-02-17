"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useWallet } from "@/app/wallet/WalletContext";
import { toNano } from "@ton/core";
import { toast } from "sonner";

interface TransferDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  recipientAddress: string;
  onSend: (amount: string, txHash: string) => void;
  onFailed: (amount: string, error: string) => void;
}

export default function TransferDrawer({
  open,
  onOpenChange,
  recipientName,
  recipientAddress,
  onSend,
  onFailed,
}: TransferDrawerProps) {
  const { tonBalance, tonPrice, sendTransaction, walletAddress } = useWallet();
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);

  const numericBalance = parseFloat(tonBalance) || 0;
  const FEE_RESERVE = 0.05;
  const maxSendable = Math.max(0, numericBalance - FEE_RESERVE);
  const numericAmount = parseFloat(amount) || 0;
  const usdValue = numericAmount * tonPrice;
  const isValidAmount = numericAmount > 0 && numericAmount <= maxSendable;

  const handleMax = () => {
    setAmount(maxSendable > 0 ? maxSendable.toFixed(4) : "0");
  };

  const handleSend = async () => {
    if (!isValidAmount || isSending || !walletAddress) return;

    setIsSending(true);
    try {
      const result = await sendTransaction({
        to: recipientAddress,
        value: toNano(amount).toString(),
      });

      if (result.success && result.txHash) {
        onSend(amount, result.txHash);
        setAmount("");
        onOpenChange(false);
      } else {
        const errorMsg = result.error || "Transaction failed";
        toast.error(errorMsg);
        onFailed(amount, errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Transaction failed";
      toast.error(errorMsg);
      onFailed(amount, errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  const truncatedAddress =
    recipientAddress.length > 12
      ? `${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`
      : recipientAddress;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-base flex items-center gap-2">
              <Icon icon="token:ton" className="w-5 h-5 text-[#0098EA]" />
              Send TON
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              Send TON directly in chat
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4">
            {/* Recipient */}
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">To</p>
              <p className="text-sm font-medium">@{recipientName}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{truncatedAddress}</p>
            </div>

            {/* Amount input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Amount</p>
                <button
                  onClick={handleMax}
                  className="text-[10px] text-primary font-semibold hover:underline"
                >
                  MAX ({maxSendable.toFixed(4)} TON)
                </button>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pr-14 text-lg font-semibold h-12 rounded-xl"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  TON
                </span>
              </div>
              {numericAmount > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  ≈ ${usdValue.toFixed(2)} USD
                </p>
              )}
              {numericAmount > maxSendable && numericAmount > 0 && (
                <p className="text-[11px] text-red-500 mt-1">
                  Insufficient balance
                </p>
              )}
            </div>

            {/* Fee estimate */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>Network fee</span>
              <span>~0.005 TON</span>
            </div>

            {/* Send button */}
            <Button
              onClick={handleSend}
              disabled={!isValidAmount || isSending}
              className="w-full h-11 rounded-xl font-semibold"
            >
              {isSending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Sending...
                </div>
              ) : (
                `Send ${numericAmount > 0 ? amount + " TON" : ""}`
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
