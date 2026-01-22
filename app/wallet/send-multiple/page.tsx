"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Trash2,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Send,
} from "lucide-react";
import Image from "next/image";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../WalletContext";
import { useGameContext } from "@/app/(contexts)/MiningContext";
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
import { Address, toNano } from "@ton/core";
import {
  sendBatchTransaction,
  validateBatchTransactions,
  estimateBatchGas,
  MAX_BATCH_MESSAGES,
  type BatchTransaction,
} from "@/lib/transaction-batching";

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
  const { telegramId } = useGameContext();

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
  const addRecipient = useCallback(() => {
    if (recipients.length >= MAX_BATCH_MESSAGES) {
      toast.error(`Maximum ${MAX_BATCH_MESSAGES} recipients allowed per batch`);
      return;
    }
    setRecipients((prev) => [
      ...prev,
      { id: Date.now().toString(), address: "", amount: "", isValid: false },
    ]);
  }, [recipients.length]);

  // Remove recipient
  const removeRecipient = useCallback(
    (id: string) => {
      if (recipients.length <= 2) {
        toast.error("Minimum 2 recipients required for batch send");
        return;
      }
      setRecipients((prev) => prev.filter((r) => r.id !== id));
    },
    [recipients.length],
  );

  // Update recipient
  const updateRecipient = useCallback(
    (id: string, field: "address" | "amount", value: string) => {
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
    },
    [],
  );

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
  const buildTransactions = useCallback((): BatchTransaction[] => {
    return validRecipients.map((r) => ({
      to: r.address,
      value: toNano(r.amount),
      bounce: false,
    }));
  }, [validRecipients]);

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
      const storedMnemonic = localStorage.getItem(
        `quantum_wallet_mnemonic_${telegramId}`,
      );
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
        toast.success(`Sent to ${transactions.length} recipients`, {
          description: `Total: ${totalAmount.toFixed(4)} TON`,
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
            <h1 className="text-2xl font-bold text-white">Send to Multiple</h1>
            <p className="text-sm text-gray-500">
              Send TON to multiple recipients in one transaction
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            Max {MAX_BATCH_MESSAGES}
          </Badge>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
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
                      <span className="text-sm text-gray-400">Available</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">
                        {tonBalanceNum.toFixed(4)} TON
                      </p>
                      <p className="text-xs text-gray-500">
                        ${(tonBalanceNum * tonPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recipients List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-400">Recipients</Label>
                  <span className="text-xs text-gray-500">
                    {recipients.length}/{MAX_BATCH_MESSAGES}
                  </span>
                </div>

                {recipients.map((recipient, index) => (
                  <Card key={recipient.id} className="bg-[#111] border-[#222]">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">
                          #{index + 1}
                        </span>
                        {recipients.length > 2 && (
                          <button
                            onClick={() => removeRecipient(recipient.id)}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
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
                        <span className="flex items-center text-sm text-gray-400 px-2">
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
                    className="w-full py-3 border border-dashed border-[#333] rounded-xl text-sm text-gray-400 flex items-center justify-center gap-2 hover:bg-white/5"
                  >
                    <Plus className="w-4 h-4" />
                    Add Recipient
                  </button>
                )}
              </div>

              {/* Summary */}
              <Card className="bg-[#111] border-[#222]">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Amount</span>
                    <span className="font-medium text-white">
                      {totalAmount.toFixed(4)} TON
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Estimated Gas</span>
                    <span className="text-gray-400">
                      ~{estimatedGas.toFixed(4)} TON
                    </span>
                  </div>
                  <div className="border-t border-[#222] pt-2 flex justify-between">
                    <span className="font-medium text-white">Total</span>
                    <div className="text-right">
                      <span className="font-bold text-white">
                        {totalWithGas.toFixed(4)} TON
                      </span>
                      <p className="text-xs text-gray-500">
                        ${totalUsd.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Validation Errors */}
              {!validationResult.valid &&
                validationResult.errors.length > 0 && (
                  <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
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
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-xs text-gray-400">
                  <strong className="text-primary">Batch Transaction:</strong>{" "}
                  All transfers are executed in a single transaction, saving gas
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
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {viewMode === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-[#111] border-[#222]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Confirm {validRecipients.length} Transfers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {validRecipients.map((r, i) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between py-2 border-b border-[#222] last:border-0"
                    >
                      <div>
                        <p className="text-xs text-gray-500">#{i + 1}</p>
                        <p className="font-mono text-xs text-white">
                          {r.address.slice(0, 8)}...{r.address.slice(-6)}
                        </p>
                      </div>
                      <p className="font-medium text-white">
                        {parseFloat(r.amount).toFixed(4)} TON
                      </p>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between font-semibold">
                    <span className="text-white">Total</span>
                    <span className="text-primary">
                      {totalWithGas.toFixed(4)} TON
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
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {viewMode === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 space-y-4"
            >
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-white font-medium">
                Processing batch transaction...
              </p>
              <p className="text-sm text-gray-500">
                This may take a few seconds
              </p>
            </motion.div>
          )}

          {viewMode === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white">
                  Sent Successfully!
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {validRecipients.length} transfers completed in one
                  transaction
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {totalAmount.toFixed(4)} TON
                </p>
                <p className="text-sm text-gray-500">${totalUsd.toFixed(2)}</p>
              </div>

              {txHash && (
                <button
                  onClick={() => {
                    const tgWebApp =
                      typeof window !== "undefined"
                        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (window as any).Telegram?.WebApp
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
                  View on Explorer <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <Button onClick={handleReset} variant="outline" className="mt-4">
                Send Another Batch
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Biometric Auth */}
      <BiometricAuth
        isOpen={isAuthOpen}
        onSuccess={handleAuthSuccess}
        onCancel={handleAuthCancel}
        title="Confirm Batch Send"
        description="Authenticate to send to multiple recipients"
      />
    </div>
  );
}
