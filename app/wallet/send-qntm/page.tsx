"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { Icon } from "@iconify/react";
import { useForm, useStore } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { sendQntmSchema } from "@/lib/validations";
import { verifyQcId, transferQntm } from "./actions";

export default function SendQNTMPage() {
  useTelegramBackButton("/wallet");
  const router = useRouter();
  const { telegramId, username, MainQuantAmount, SetMainQuantAmount } = useUserContext();

  // Biometric authentication hook
  const { isOpen: isAuthOpen, requestAuth, handleSuccess: handleAuthSuccess, handleCancel: handleAuthCancel } = useBiometricAuth();

  useEffect(() => {
    router.prefetch("/wallet");
  }, [router]);

  // Form state (TanStack Form + Zod validation)
  const form = useForm({
    defaultValues: { recipientQcId: "", amount: "" },
    validators: { onSubmit: sendQntmSchema },
  });

  // UI state
  const [step, setStep] = useState<"input" | "confirm" | "processing" | "success">("input");
  const [isTransferring, setIsTransferring] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [qcIdCopied, setQcIdCopied] = useState(false);
  const [isVerifyingQcId, setIsVerifyingQcId] = useState(false);
  const [qcIdError, setQcIdError] = useState<string | null>(null);
  const [recipientUsername, setRecipientUsername] = useState<string>("");
  const recipientQcId = useStore(form.store, (s) => s.values.recipientQcId);

  // Parse balance (remove commas)
  const currentBalance = parseFloat(MainQuantAmount.replace(/,/g, '')) || 0;

  const handleAmountChange = (value: string, fieldHandleChange: (val: string) => void) => {
    // Remove commas and minus signs, convert comma decimal separator to dot
    const sanitized = value.replace(',', '.').replace(/-/g, '');
    if (sanitized === '' || /^\d*\.?\d*$/.test(sanitized)) {
      fieldHandleChange(sanitized);
      // Check if exceeds balance
      const numValue = parseFloat(sanitized) || 0;
      setInsufficientFunds(numValue > currentBalance);
    }
  };

  const handleMaxAmount = () => {
    form.setFieldValue("amount", currentBalance.toString());
    setInsufficientFunds(false);
  };

  function validateInput() {
    const recipientQcId = form.getFieldValue("recipientQcId");
    const amount = form.getFieldValue("amount");
    if (!recipientQcId.trim()) {
      toast.error("Please enter recipient's QC ID");
      return false;
    }
    if (recipientQcId.trim() === telegramId) {
      toast.error("Cannot transfer to yourself");
      return false;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return false;
    }
    if (parseFloat(amount) > currentBalance) {
      toast.error("Insufficient QNTM balance");
      setInsufficientFunds(true);
      return false;
    }
    return true;
  }

  async function verifyQcIdExists(showToast = true): Promise<boolean> {
    const recipientQcId = form.getFieldValue("recipientQcId");
    if (!recipientQcId.trim()) return false;
    try {
      setIsVerifyingQcId(true);
      setQcIdError(null);

      const result = await verifyQcId({ qcId: recipientQcId.trim() });

      if (result?.serverError) {
        setQcIdError("Failed to verify QC ID. Please try again.");
        if (showToast) toast.error("Failed to verify QC ID");
        return false;
      }

      if (!result?.data?.exists) {
        setQcIdError("This QC ID doesn't exist. Please check and try again.");
        if (showToast) toast.error("Recipient QC ID not found");
        return false;
      }

      setRecipientUsername(result.data.username || "Quantum User");
      return true;
    } catch (error) {
      console.error("Error verifying QC ID:", error);
      setQcIdError("Failed to verify QC ID. Please try again.");
      if (showToast) toast.error("Failed to verify QC ID");
      return false;
    } finally {
      setIsVerifyingQcId(false);
    }
  }

  useEffect(() => {
    const value = recipientQcId.trim();
    queueMicrotask(() => {
      setRecipientUsername("");
      setQcIdError(null);
    });
    if (!value || value === telegramId) return;

    const timer = window.setTimeout(() => {
      verifyQcIdExists(false);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [recipientQcId, telegramId]);

  async function handleContinue() {
    if (validateInput()) {
      // Verify QC ID exists before proceeding
      const exists = recipientUsername ? true : await verifyQcIdExists();
      if (exists) {
        setStep("confirm");
      }
    }
  }

  async function executeTransfer() {
    const recipientQcId = form.getFieldValue("recipientQcId");
    const amount = form.getFieldValue("amount");
    setIsTransferring(true);
    setStep("processing");

    try {
      const result = await transferQntm({
        recipientQcId: recipientQcId.trim(),
        amount: parseFloat(amount),
      });

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (!result?.data?.success) {
        throw new Error("Transfer failed");
      }

      // Update local balance
      const newBalance = result.data.newBalance;
      const formattedBalance = newBalance.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      SetMainQuantAmount(formattedBalance);
      localStorage.setItem(`QAmount_${telegramId}`, formattedBalance);

      haptics.success();
      setStep("success");
      toast.success("QNTM transferred successfully!");
    } catch (error) {
      haptics.error();
      console.error("Transfer failed:", error);
      toast.error(error instanceof Error ? error.message : "Transfer failed");
      setStep("confirm");
    } finally {
      setIsTransferring(false);
    }
  }

  async function handleConfirmTransfer() {
    // Request biometric/PIN authentication
    const authenticated = await requestAuth();

    if (authenticated) {
      await executeTransfer();
    } else {
      toast.error("Authentication required to transfer QNTM");
    }
  }

  const handleCopyQcId = () => {
    if (telegramId) {
      navigator.clipboard.writeText(telegramId);
      setQcIdCopied(true);
      setTimeout(() => setQcIdCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pt-6">
      <div className="max-w-md mx-auto">
        {step === "input" && (
          <div className="mb-6 text-left">
            <h1 className="text-xl font-bold">Send QNTM</h1>
            <p className="text-sm text-muted-foreground mt-1">Transfer to another Quantum Club user</p>
          </div>
        )}

        <>
          {step === "input" && (
            <div
              key="input"
              className="space-y-6"
            >
              {/* Current Balance */}
              <Card className="rounded-2xl border-0 bg-secondary">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32" className="text-white">
                        <path fill="currentColor" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">Your QNTM balance</h4>
                      <p className="text-xs text-neutral-400">Available to send</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-primary text-lg">{MainQuantAmount}</h4>
                  </div>
                </CardContent>
              </Card>

              {/* Recipient QC ID */}
              <form.Field name="recipientQcId">
                {(field) => {
                  const hasErrors = field.state.meta.errors.length > 0;
                  return (
                    <div className="space-y-2">
                      <Label className="text-sm text-neutral-400 ml-1">Recipient&apos;s QC ID</Label>
                      <div className="relative">
                        <Input
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => {
                            field.handleChange(e.target.value);
                            setQcIdError(null); // Clear error when user types
                            setRecipientUsername("");
                          }}
                          placeholder="Enter recipient's Quantum Club ID"
                          aria-invalid={hasErrors || !!qcIdError}
                          className={`bg-secondary border-0 h-14 pl-4 pr-10 text-foreground placeholder:text-neutral-500 rounded-xl transition-all ${qcIdError ? 'ring-1 ring-destructive' : ''
                            }`}
                        />
                        {recipientUsername && !qcIdError ? (
                          <Icon icon="lucide:check" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500"/>
                        ) : null}
                      </div>
                      {hasErrors && <FieldError errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />}
                      {qcIdError ? (
                        <p className="text-xs text-destructive ml-1 flex items-center gap-1">
                          <Icon icon="lucide:info" className="w-3 h-3"/>
                          {qcIdError}
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              </form.Field>

              {/* Your QC ID - for sharing */}
              <div className="rounded-xl bg-secondary p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-400">Your QC ID (share to receive QNTM)</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyQcId}
                    className={`h-auto p-0 flex items-center gap-1 text-xs transition-colors hover:bg-transparent ${qcIdCopied ? 'text-green-500 hover:text-green-500' : 'text-primary hover:text-primary/80'
                      }`}
                  >
                    {qcIdCopied ? <Icon icon="lucide:check" className="w-3 h-3"/> : <Icon icon="lucide:copy" className="w-3 h-3"/>}
                    {qcIdCopied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <p className="text-sm text-foreground font-mono break-all select-all">{telegramId || "Loading..."}</p>
              </div>

              {/* Amount */}
              <form.Field name="amount">
                {(field) => {
                  const hasErrors = field.state.meta.errors.length > 0;
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <Label className="text-sm text-neutral-400">Amount</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-500">{MainQuantAmount} QNTM</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMaxAmount}
                            className="h-auto p-0 text-xs font-bold text-primary hover:text-primary/80 hover:bg-transparent transition-colors"
                          >
                            Max
                          </Button>
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => handleAmountChange(e.target.value, field.handleChange)}
                          placeholder="0"
                          aria-invalid={hasErrors || insufficientFunds}
                          className={`bg-secondary border-0 h-14 pl-4 pr-20 text-2xl font-bold text-foreground placeholder:text-neutral-600 rounded-xl transition-all ${insufficientFunds ? 'ring-1 ring-destructive' : ''
                            }`}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <div className="text-sm font-bold text-primary">QNTM</div>
                        </div>
                      </div>
                      {hasErrors && <FieldError errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />}
                      {insufficientFunds && (
                        <p className="text-xs text-destructive ml-1 flex items-center gap-1">
                          <Icon icon="lucide:info" className="w-3 h-3"/>
                          Insufficient funds. You have {MainQuantAmount} QNTM available.
                        </p>
                      )}
                    </div>
                  );
                }}
              </form.Field>

              <form.Subscribe selector={(state) => state.values}>
                {(values) => (
                  <Button
                    onClick={handleContinue}
                    disabled={!values.recipientQcId || !values.amount || parseFloat(values.amount) <= 0 || insufficientFunds || isVerifyingQcId}
                    className="w-full h-14 bg-primary text-primary-foreground rounded-xl font-bold text-lg mt-8 disabled:opacity-50 border-0 shadow-lg transition-opacity duration-200 hover:opacity-90"
                  >
                    {isVerifyingQcId ? (
                      <>
                        <ButtonLoader />
                        Verifying...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          )}

          {step === "confirm" && (
            <div
              key="confirm"
              className="space-y-6"
            >
              <form.Subscribe selector={(state) => state.values}>
                {(values) => (
                  <Card className="bg-secondary border-0 overflow-hidden">
                    <CardContent className="p-6 space-y-6">
                      <div className="text-center space-y-1">
                        <div className="text-sm text-muted-foreground">You are sending</div>
                        <div className="text-3xl font-bold text-foreground">
                          {parseFloat(values.amount).toLocaleString()} <span className="text-primary">QNTM</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-4 py-4">
                        <div className="flex w-28 min-w-0 flex-col items-center text-center">
                          <Icon icon="lucide:user" className="mb-2 h-12 w-12 rounded-full bg-muted p-3 text-muted-foreground"/>
                          <span className="max-w-full break-words text-xs leading-tight text-muted-foreground">{username || "You"}</span>
                        </div>
                        <Icon icon="lucide:arrow-right" className="w-6 h-6 text-primary self-start mt-3"/>
                        <div className="flex w-28 min-w-0 flex-col items-center text-center">
                          <Icon icon="lucide:user" className="mb-2 h-12 w-12 rounded-full bg-muted p-3 text-primary"/>
                          <span className="max-w-full break-words text-xs leading-tight text-muted-foreground">{recipientUsername || "Recipient"}</span>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-start">
                          <span className="text-sm text-muted-foreground">To (QC ID)</span>
                          <div className="text-right flex-1 pl-8">
                            <div className="text-sm font-mono text-foreground break-all">{values.recipientQcId}</div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-neutral-400">Network fee</span>
                          <span className="text-sm text-green-500 font-bold">Free</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </form.Subscribe>

              <div className="bg-primary/10 border-0 rounded-xl p-4 flex items-start gap-3">
                <Icon icon="lucide:info" className="w-5 h-5 text-primary mt-0.5 shrink-0"/>
                <p className="text-xs text-primary/90 leading-relaxed">
                  QNTM transfers between Quantum Club users are instant and free. Please verify the recipient&apos;s QC ID carefully.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setStep("input")}
                  className="h-14 bg-secondary border-0 text-foreground hover:bg-secondary/80 rounded-xl font-bold shadow-none outline-none ring-0 hover:shadow-none hover:outline-none hover:ring-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 transform-none hover:transform-none transition-colors duration-200"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmTransfer}
                  disabled={isTransferring}
                  className="h-14 bg-primary text-primary-foreground rounded-xl font-bold border-0 shadow-lg transition-opacity duration-200 hover:opacity-90"
                >
                  {isTransferring ? (
                    <div className="flex items-center gap-2">
                      <ButtonLoader />
                      Sending...
                    </div>
                  ) : (
                    "Confirm and send"
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === "processing" && (
            <div
              key="processing"
              className="fixed inset-0 z-50 flex flex-col items-center justify-center space-y-6 bg-background px-4"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 rounded-full animate-spin text-primary" style={{ borderColor: "color-mix(in srgb, currentColor 25%, transparent)", borderTopColor: "currentColor" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" className="text-white">
                    <path fill="currentColor" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">Processing transfer</h3>
                <p className="text-sm text-muted-foreground mt-1">Please wait...</p>
              </div>
            </div>
          )}

          {step === "success" && (
            <div
              key="success"
              className="fixed inset-0 z-50 flex flex-col items-center justify-center space-y-6 bg-background px-4"
            >
              <Icon icon="lucide:check" className="h-20 w-20 text-green-500"/>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-foreground">Transfer complete</h3>
                <form.Subscribe selector={(state) => state.values.amount}>
                  {(amount) => (
                    <p className="text-muted-foreground text-sm">
                      {parseFloat(amount).toLocaleString()} QNTM sent successfully
                    </p>
                  )}
                </form.Subscribe>
              </div>
              <Button
                className="w-full h-14 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-bold mt-4"
                asChild
              >
                <Link href="/wallet">Back to wallet</Link>
              </Button>
            </div>
          )}
        </>

        {/* Biometric Auth Modal */}
        <BiometricAuth
          isOpen={isAuthOpen}
          onSuccess={handleAuthSuccess}
          onCancel={handleAuthCancel}
        />
      </div>
    </div>
  );
}
