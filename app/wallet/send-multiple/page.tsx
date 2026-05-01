"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import Image from "next/image";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  BiometricAuth,
  useBiometricAuth,
} from "@/components/ui/biometric-auth";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { getSecureMnemonic } from "@/lib/secure-mnemonic";
import { Address, toNano } from "@ton/core";
import {
  sendBatchTransaction,
  validateBatchTransactions,
  estimateBatchGas,
  MAX_BATCH_MESSAGES,
  type BatchTransaction,
} from "@/lib/transaction-batching";
import { formatTruncatedAmount } from "@/lib/format";

interface Recipient {
  id: string;
  address: string;
  amount: string;
  isValid: boolean;
  error?: string;
}

type ViewMode = "input" | "confirm" | "processing" | "success";

export default function SendMultiplePage() {
  useTelegramBackButton("/wallet");
  const { tonBalance, tonPrice, fetchWalletAssets } = useWallet();
  const { telegramId } = useUserContext();

  const {
    isOpen: isAuthOpen,
    requestAuth,
    handleSuccess: handleAuthSuccess,
    handleCancel: handleAuthCancel,
  } = useBiometricAuth();

  const [viewMode, setViewMode] = useState<ViewMode>("input");
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Recipients list
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: "1", address: "", amount: "", isValid: false },
    { id: "2", address: "", amount: "", isValid: false },
  ]);

  const tonBalanceNum = parseFloat(tonBalance) || 0;

  // Add recipient
  const addRecipient = () => {
    if (recipients.length >= MAX_BATCH_MESSAGES) {
      toast.error(`Maximum ${MAX_BATCH_MESSAGES} recipients allowed per batch`);
      return;
    }
    setRecipients((prev) => [
      ...prev,
      { id: Date.now().toString(), address: "", amount: "", isValid: false },
    ]);
  };

  // Remove recipient
  const removeRecipient = (id: string) => {
    if (recipients.length <= 2) {
      toast.error("Minimum 2 recipients required for batch send");
      return;
    }
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  // Update recipient
  const updateRecipient = (id: string, field: "address" | "amount", value: string) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        const updated = { ...r, [field]: value };
        let addressValid = false;
        let amountValid = false;

        // Check address validity
        const addressToCheck = field === "address" ? value : r.address;
        if (addressToCheck.trim()) {
          try {
            Address.parse(addressToCheck);
            addressValid = true;
          } catch {
            addressValid = false;
          }
        }

        // Check amount validity
        const amountToCheck = field === "amount" ? value : r.amount;
        const amountNum = parseFloat(amountToCheck);
        amountValid = !isNaN(amountNum) && amountNum > 0;

        // Set error message for current field
        if (field === "address" && value.trim() && !addressValid) {
          updated.error = "Invalid address format";
        } else if (field === "amount" && value.trim() && !amountValid) {
          updated.error = "Invalid amount";
        } else {
          updated.error = undefined;
        }

        // Both must be valid for the recipient to be valid
        updated.isValid = addressValid && amountValid;

        return updated;
      }),
    );
  };

  // Calculate totals
  const totalAmount = recipients.reduce(
    (sum, r) => sum + (parseFloat(r.amount) || 0),
    0,
  );
  const estimatedGas =
    recipients.filter((r) => r.isValid).length > 0
      ? Number(
          estimateBatchGas(
            recipients
              .filter((r) => r.isValid)
              .map((r) => ({
                to: r.address,
                value: toNano(r.amount || "0"),
              })),
          ),
        ) / 1e9
      : 0.05;
  const totalWithGas = totalAmount + estimatedGas;
  const totalUsd = totalAmount * tonPrice;

  // Check if form is valid
  const validRecipients = recipients.filter(
    (r) => r.isValid && parseFloat(r.amount) > 0 && r.address.trim(),
  );
  const isFormValid =
    validRecipients.length >= 2 && totalWithGas <= tonBalanceNum;

  // Build batch transactions
  const buildTransactions = (): BatchTransaction[] => {
    return validRecipients.map((r) => ({
      to: r.address,
      value: toNano(r.amount),
      bounce: false,
    }));
  };

  // Validate before sending
  const validationResult =
    buildTransactions().length > 0
      ? validateBatchTransactions(
          buildTransactions(),
          BigInt(Math.floor(tonBalanceNum * 1e9)),
        )
      : { valid: false, errors: ["Add at least 2 valid recipients"] };

  // Handle continue to confirmation
  const handleContinue = () => {
    if (isFormValid) {
      setViewMode("confirm");
    }
  };

  // Handle send
  const handleSend = async () => {
    if (!isFormValid || !telegramId) return;

    const authenticated = await requestAuth();
    if (!authenticated) {
      toast.error("Authentication required");
      return;
    }

    await executeBatchSend();
  };

  // Execute batch send
  const executeBatchSend = async () => {
    if (!telegramId) return;

    setIsSending(true);
    setViewMode("processing");

    try {
      const storedMnemonic = await getSecureMnemonic(telegramId);
      if (!storedMnemonic) {
        throw new Error("Wallet not found");
      }

      const transactions = buildTransactions();

      const result = await sendBatchTransaction(
        transactions,
        storedMnemonic,
        "v5r1",
        false,
      );

      if (result.success) {
        setTxHash(result.txHash || null);
        setViewMode("success");
        haptics.success();
        toast.success(`Sent to ${transactions.length} recipients`, {
          description: `Total: ${formatTruncatedAmount(totalAmount, 4)} TON`,
        });

        // Refresh balances
        setTimeout(() => {
          fetchWalletAssets();
        }, 3000);
      } else {
        throw new Error(result.error || "Transaction failed");
      }
    } catch (error) {
      console.error("Batch send failed:", error);
      haptics.error();
      toast.error("Transaction failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setViewMode("input");
    } finally {
      setIsSending(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setViewMode("input");
    setRecipients([
      { id: "1", address: "", amount: "", isValid: false },
      { id: "2", address: "", amount: "", isValid: false },
    ]);
    setTxHash(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-black pb-28">
      <div className="px-4 pt-2 pb-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Send to multiple</h1>
            <p className="text-sm text-muted-foreground">
              Send TON to multiple recipients in one transaction
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            Max {MAX_BATCH_MESSAGES}
          </Badge>
        </div>

        
          {viewMode === "input" && (
            <div key="input"
              className="space-y-4"
            >
              {/* Balance Card */}
              <Card className="bg-[#111] border-[#222]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/svg/ton-logo.svg"
                        alt="TON"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-muted-foreground">Available</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">
                        {formatTruncatedAmount(tonBalanceNum, 4)} TON
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${(tonBalanceNum * tonPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recipients List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Recipients</Label>
                  <span className="text-xs text-muted-foreground">
                    {recipients.length}/{MAX_BATCH_MESSAGES}
                  </span>
                </div>

                {recipients.map((recipient, index) => (
                  <Card key={recipient.id} className="bg-[#111] border-0">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                        {recipients.length > 2 && (
                          <button
                            onClick={() => removeRecipient(recipient.id)}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                          >
                            <Icon icon="lucide:trash-2" className="w-4 h-4"/>
                          </button>
                        )}
                      </div>
                      <Input
                        placeholder="Recipient address..."
                        value={recipient.address}
                        onChange={(e) =>
                          updateRecipient(
                            recipient.id,
                            "address",
                            e.target.value,
                          )
                        }
                        className={`bg-black border-[#333] font-mono text-xs ${
                          recipient.error ? "border-red-500" : ""
                        }`}
                      />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={recipient.amount}
                          onChange={(e) =>
                            updateRecipient(
                              recipient.id,
                              "amount",
                              e.target.value,
                            )
                          }
                          className="bg-black border-[#333] flex-1"
                        />
                        <span className="flex items-center text-sm text-muted-foreground px-2">
                          TON
                        </span>
                      </div>
                      {recipient.error && (
                        <p className="text-xs text-red-500">
                          {recipient.error}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {recipients.length < MAX_BATCH_MESSAGES && (
                  <button
                    onClick={addRecipient}
                    className="w-full py-3 border border-dashed border-[#333] rounded-xl text-sm text-muted-foreground flex items-center justify-center gap-2 hover:bg-white/5"
                  >
                    <Icon icon="lucide:plus" className="w-4 h-4"/>
                    Add recipient
                  </button>
                )}
              </div>

              {/* Summary */}
              <Card className="bg-[#111] border-0">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total amount</span>
                    <span className="font-medium text-white">
                      {formatTruncatedAmount(totalAmount, 4)} TON
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated gas</span>
                    <span className="text-muted-foreground">
                      ~{formatTruncatedAmount(estimatedGas, 4)} TON
                    </span>
                  </div>
                  <div className="border-t border-[#222] pt-2 flex justify-between">
                    <span className="font-medium text-white">Total</span>
                    <div className="text-right">
                      <span className="font-bold text-white">
                        {formatTruncatedAmount(totalWithGas, 4)} TON
                      </span>
                      <p className="text-xs text-muted-foreground">
                        ${totalUsd.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Validation Errors */}
              {!validationResult.valid &&
                validationResult.errors.length > 0 && (
                  <div className="px-1 py-2">
                    <div className="flex items-start gap-2">
                      <Icon icon="lucide:alert-triangle" className="w-4 h-4 text-yellow-500 shrink-0"/>
                      <div className="space-y-1">
                        {validationResult.errors.map((error, i) => (
                          <p key={i} className="text-xs text-yellow-400">
                            {error}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              {/* Info */}
              <div className="p-3 rounded-xl bg-primary/5 border-0">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-primary">Batch transaction:</strong>{" "}
                  all transfers are executed in a single transaction, saving gas
                  and confirming simultaneously.
                </p>
              </div>

              {/* Continue Button */}
              <Button
                onClick={handleContinue}
                disabled={!isFormValid}
                className="w-full h-12 bg-primary text-black font-semibold rounded-xl"
              >
                Continue
                <Icon icon="lucide:arrow-right" className="w-4 h-4 ml-2"/>
              </Button>
            </div>
          )}

          {viewMode === "confirm" && (
            <div key="confirm"
              className="space-y-4"
            >
              <Card className="bg-[#111] border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon icon="lucide:users" className="w-5 h-5 text-primary"/>
                    Confirm {validRecipients.length} transfers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {validRecipients.map((r, i) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between py-2 border-b border-[#222] last:border-0"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground">#{i + 1}</p>
                        <p className="font-mono text-xs text-white">
                          {r.address.slice(0, 8)}...{r.address.slice(-6)}
                        </p>
                      </div>
                      <p className="font-medium text-white">
                        {formatTruncatedAmount(parseFloat(r.amount), 4)} TON
                      </p>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between font-semibold">
                    <span className="text-white">Total</span>
                    <span className="text-primary">
                      {formatTruncatedAmount(totalWithGas, 4)} TON
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleSend}
                disabled={isSending}
                className="w-full h-12 bg-primary text-black font-semibold rounded-xl"
              >
                {isSending ? (
                  <ButtonLoader />
                ) : (
                  <>
                    <Icon icon="lucide:send" className="w-4 h-4 mr-2"/>
                    Send
                  </>
                )}
              </Button>
            </div>
          )}

          {viewMode === "processing" && (
            <div key="processing"
              className="flex flex-col items-center justify-center py-16 space-y-4"
            >
              <span className="text-primary"><ButtonLoader size="lg" /></span>
              <p className="text-white font-medium">
                Processing batch transaction...
              </p>
                <p className="text-sm text-muted-foreground">
                This may take a few seconds
              </p>
            </div>
          )}

          {viewMode === "success" && (
            <div key="success"
              className="flex flex-col items-center justify-center py-12 space-y-4"
            >
              <Icon icon="lucide:check-circle" className="w-16 h-16 text-green-500"/>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">
                  Sent successfully!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {validRecipients.length} transfers completed in one
                  transaction
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {formatTruncatedAmount(totalAmount, 4)} TON
                </p>
                <p className="text-sm text-muted-foreground">${totalUsd.toFixed(2)}</p>
              </div>

              {txHash && (
                <button
                  onClick={() => {
                    const tgWebApp =
                      typeof window !== "undefined"
                        ? (window as any).Telegram?.WebApp
                        : null;
                    const url = `https://tonviewer.com/transaction/${txHash}`;
                    if (tgWebApp?.openLink) {
                      tgWebApp.openLink(url);
                    } else {
                      window.open(url, "_blank");
                    }
                  }}
                  className="text-sm text-primary flex items-center gap-1"
                >
                  View on explorer <Icon icon="lucide:arrow-right" className="w-4 h-4"/>
                </button>
              )}

              <Button onClick={handleReset} variant="outline" className="mt-4">
                Send another batch
              </Button>
            </div>
          )}
        
      </div>

      {/* Biometric Auth */}
      <BiometricAuth
        isOpen={isAuthOpen}
        onSuccess={handleAuthSuccess}
        onCancel={handleAuthCancel}
        title="Confirm batch send"
        description="Authenticate to send to multiple recipients"
      />
    </div>
  );
}
