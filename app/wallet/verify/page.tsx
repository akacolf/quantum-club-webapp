"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError } from "@/components/ui/field";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { analyticsEvents } from "@/lib/telegramAnalytics";
import { walletVerifySchema } from "@/lib/validations";
import { useWallet } from "../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";

export default function VerifyPhrasePage() {
  useTelegramBackButton("/wallet/backup");
  const { telegramId } = useUserContext();
  const router = useRouter();
  const { addWallet, switchWallet, storedWallets } = useWallet();
  useEffect(() => {
    router.prefetch("/wallet");
    router.prefetch("/wallet/backup");
  }, [router]);

  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [verificationWords, setVerificationWords] = useState<{ index: number, word: string }[]>([]);

  const form = useForm({
    defaultValues: { word0: "", word1: "", word2: "" },
    validators: { onSubmit: walletVerifySchema },
    onSubmit: async ({ value }) => {
      const userInputs = [value.word0, value.word1, value.word2];
      const allCorrect = verificationWords.every((item, i) =>
        userInputs[i].toLowerCase().trim() === item.word.toLowerCase()
      );

      if (!allCorrect) {
        toast.error("Incorrect words. Please check your recovery phrase and try again.");
        return;
      }

      if (walletAddress && mnemonic.length > 0) {
        localStorage.setItem(`quantum_wallet_address_${telegramId}`, walletAddress);
        localStorage.setItem(`quantum_wallet_mnemonic_${telegramId}`, mnemonic.join(" "));

        const walletName = `Wallet ${storedWallets.length + 1}`;
        addWallet(walletAddress, walletName);
        switchWallet(walletAddress);

        sessionStorage.removeItem("pending_wallet_mnemonic");
        sessionStorage.removeItem("pending_wallet_address");
        sessionStorage.removeItem("verification_indices");

        analyticsEvents.walletCreated(walletAddress);

        toast.success("Wallet created successfully!");
        router.push("/wallet");
      } else {
        toast.error("Error confirming wallet. Please try again.");
      }
    },
  });

  useEffect(() => {
    const pendingMnemonic = sessionStorage.getItem("pending_wallet_mnemonic");
    const pendingAddress = sessionStorage.getItem("pending_wallet_address");
    const indices = sessionStorage.getItem("verification_indices");

    if (!pendingMnemonic || !pendingAddress || !indices) {
      router.push("/wallet");
      return;
    }

    const mnemonicArr = pendingMnemonic.split(" ");
    const indicesArr: number[] = JSON.parse(indices);

    setMnemonic(mnemonicArr);
    setWalletAddress(pendingAddress);
    setVerificationWords(indicesArr.map(i => ({ index: i, word: mnemonicArr[i] })));
  }, [router]);

  const handleGoBack = () => {
    form.reset();
    router.push("/wallet/backup");
  };

  if (verificationWords.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pt-6">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center ring-1 ring-primary/20">
              <Icon icon="lucide:check" className="w-7 h-7 text-primary"/>
            </div>
            <h1 className="text-2xl font-bold">Verify Your Phrase</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Enter the correct words from your recovery phrase to verify you saved it.
            </p>
          </div>

          {/* Verification Inputs */}
          <div className="space-y-4">
            {verificationWords.map((item, i) => {
              const fieldName = `word${i}` as "word0" | "word1" | "word2";
              return (
                <form.Field key={item.index} name={fieldName}>
                  {(field) => {
                    const hasErrors = field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={hasErrors}>
                        <Label className="text-sm text-muted-foreground ml-1">
                          Word #{item.index + 1}
                        </Label>
                        <Input
                          type="text"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder={`Enter word #${item.index + 1}`}
                          className="w-full bg-muted border border-border rounded-xl px-4 py-6 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-mono transition-colors"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                        />
                        {hasErrors && <FieldError errors={field.state.meta.errors.map(e => ({ message: String(e) }))} />}
                      </Field>
                    );
                  }}
                </form.Field>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full bg-card border-border text-foreground hover:bg-muted h-12 transition-colors"
            >
              Go Back
            </Button>

            <form.Subscribe selector={(state) => state.values}>
              {(values) => (
                <Button
                  onClick={() => form.handleSubmit()}
                  disabled={!values.word0.trim() || !values.word1.trim() || !values.word2.trim()}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify & Create Wallet
                </Button>
              )}
            </form.Subscribe>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
