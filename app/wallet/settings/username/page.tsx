"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { usernameSchema, USERNAME_MAX_LENGTH } from "@/lib/validations";
import { Field, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useQcUsernameQuery, useRegisterUsernameMutation, useUpdateUsernameAddressMutation } from "@/app/(hooks)/queries/use-qc-username";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import Loader from "@/app/(components)/Loader";

export default function QCDomainPage() {
  useTelegramBackButton("/wallet/settings");
  const { walletAddress } = useWallet();
  const { telegramId, qcUsername, setQcUsername } = useUserContext();

  const [isChecking, setIsChecking] = useState(false);
  const [availability, setAvailability] = useState<"available" | "taken" | null>(null);

  const form = useForm({
    defaultValues: { username: "" },
    validators: {
      onSubmit: z.object({ username: usernameSchema }),
    },
  });

  // Load existing username via TanStack Query
  const qcUsernameQuery = useQcUsernameQuery(telegramId);
  const registerUsernameMutation = useRegisterUsernameMutation();
  const updateAddressMutation = useUpdateUsernameAddressMutation();

  const isLoadingExisting = qcUsernameQuery.isLoading;
  const existingAddress = qcUsernameQuery.data?.address ?? null;

  // Sync query result into UserContext (once)
  useEffect(() => {
    if (qcUsernameQuery.data?.username && !qcUsername) {
      setQcUsername(qcUsernameQuery.data.username);
      if (telegramId) {
        localStorage.setItem(`qcUsername_${telegramId}`, qcUsernameQuery.data.username);
      }
    }
  }, [qcUsernameQuery.data, qcUsername, setQcUsername, telegramId]);

  // Real-time validation for display
  const currentUsername = form.getFieldValue("username");
  const parseResult = currentUsername ? usernameSchema.safeParse(currentUsername) : null;
  const validationError = parseResult && !parseResult.success
    ? parseResult.error.issues[0]?.message ?? null
    : null;
  const isValidInput = parseResult?.success ?? false;

  // Check availability
  const checkAvailability = async () => {
    const username = form.getFieldValue("username");
    const result = usernameSchema.safeParse(username);
    if (!result.success) return;

    setIsChecking(true);
    setAvailability(null);
    try {
      const { resolveQcUsername } = await import("@/app/ecosystem/chat/actions");
      const result = await resolveQcUsername({ username });
      setAvailability(result?.data?.available ? "available" : "taken");
    } catch {
      toast.error("Failed to check availability");
    } finally {
      setIsChecking(false);
    }
  };

  // Register username (and auto-create domain)
  const handleRegister = () => {
    const username = form.getFieldValue("username");
    const result = usernameSchema.safeParse(username);
    if (!result.success || !telegramId) return;

    registerUsernameMutation.mutate(
      { username, address: walletAddress || undefined },
      {
        onSuccess: () => {
          haptics.success();
          toast.success(`You're now @${username}!`);
          setQcUsername(username);
          localStorage.setItem(`qcUsername_${telegramId}`, username);
          form.setFieldValue("username", "");
          setAvailability(null);
        },
        onError: (err) => {
          haptics.error();
          toast.error(err.message || "Failed to register username");
        },
      }
    );
  };

  // Update wallet address for existing domain
  const handleUpdateAddress = () => {
    if (!telegramId || !walletAddress) return;
    updateAddressMutation.mutate(
      { address: walletAddress },
      {
        onSuccess: () => {
          haptics.light();
          toast.success("Wallet address updated!");
        },
        onError: () => {
          haptics.error();
          toast.error("Failed to update address");
        },
      }
    );
  };

  // Copy username
  const copyUsername = () => {
    if (qcUsername) {
      navigator.clipboard.writeText(`@${qcUsername}`);
      toast.success("Username copied!");
    }
  };

  if (!walletAddress || isLoadingExisting) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pt-6 pb-24">
      <div className="max-w-lg mx-auto">
        <div
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <Icon icon="solar:user-id-bold" className="mx-auto w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Username</h1>
            <p className="text-muted-foreground text-sm">
              Your unique identity on Quantum Club
            </p>
          </div>

          {/* Existing Username + Domain Display */}
          {qcUsername && (
            <div
              className="space-y-3"
            >
              {/* Username Card */}
              <Card className="bg-card border-0 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon icon="solar:verified-check-bold" className="w-5 h-5 text-green-400" />
                      <span className="text-sm font-medium text-foreground">Your username</span>
                    </div>
                    <span className="text-[10px] font-medium text-green-400">Active</span>
                  </div>

                  <button
                    onClick={copyUsername}
                    className="w-full bg-background/50 rounded-xl p-4 hover:bg-background/70 transition-colors active:scale-[0.99] text-center"
                  >
                    <p className="text-2xl font-bold text-foreground tracking-wide">
                      @{qcUsername}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                      <Icon icon="solar:copy-bold" className="w-3 h-3" />
                      Tap to copy username
                    </p>
                  </button>

                  <Separator className="my-3 opacity-30" />

                  {/* Linked Address */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Resolves to
                    </Label>
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {existingAddress || walletAddress}
                    </p>
                    {existingAddress && existingAddress !== walletAddress && walletAddress && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 border-0 bg-card text-[10px] hover:bg-muted"
                        onClick={handleUpdateAddress}
                      >
                        Update to current wallet address
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Registration Form (only if no username yet) */}
          {!qcUsername && (
            <div
            >
              <Card className="bg-card border-0 overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Choose your username</Label>
                    <form.Field name="username">
                      {(field) => (
                        <Field>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                              <Input
                                placeholder="yourname"
                                value={field.state.value}
                                onChange={(e) => {
                                  const filtered = e.target.value.replace(/[^a-zA-Z0-9._-]/g, "");
                                  field.handleChange(filtered);
                                  setAvailability(null);
                                }}
                                onBlur={field.handleBlur}
                                maxLength={USERNAME_MAX_LENGTH}
                                className="pl-8 font-mono border border-border"
                                disabled={registerUsernameMutation.isPending}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={checkAvailability}
                              disabled={!isValidInput || isChecking}
                              className="px-4 shrink-0 border-0"
                            >
                              {isChecking ? (
                                <ButtonLoader size="sm" />
                              ) : (
                                "Check"
                              )}
                            </Button>
                          </div>

                          {/* Validation error */}
                          {validationError && field.state.value.length > 0 && (
                            <FieldError>
                              <span className="text-xs flex items-center gap-1">
                                <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                                {validationError}
                              </span>
                            </FieldError>
                          )}
                        </Field>
                      )}
                    </form.Field>

                    {/* Availability feedback */}
                    {availability === "available" && (
                      <p
                        className="text-xs text-green-400 flex items-center gap-1"
                      >
                        <Icon icon="solar:check-circle-bold" className="w-3 h-3" />
                        @{currentUsername} is available!
                      </p>
                    )}
                    {availability === "taken" && (
                      <p
                        className="text-xs text-destructive flex items-center gap-1"
                      >
                        <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                        @{currentUsername} is already taken
                      </p>
                    )}
                  </div>

                  {/* Username preview */}
                  {currentUsername && !validationError && (
                    <div className="bg-muted/50 rounded-xl p-4 text-center space-y-1">
                      <p className="text-lg font-bold text-foreground">
                        @{currentUsername}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Others can send funds to your @username
                      </p>
                    </div>
                  )}

                  {/* Address info */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Will point to your wallet
                    </Label>
                    <p className="text-xs font-mono text-muted-foreground break-all bg-muted/30 rounded-lg p-2">
                      {walletAddress}
                    </p>
                  </div>

                  {/* Register button */}
                  <Button
                    className="w-full"
                    onClick={handleRegister}
                    disabled={availability !== "available" || registerUsernameMutation.isPending}
                  >
                    {registerUsernameMutation.isPending ? (
                      <ButtonLoader size="sm" />
                    ) : (
                      <>
                        <Icon icon="solar:add-circle-bold" className="w-4 h-4 mr-2" />
                        Claim @{currentUsername || "username"}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* How it works */}
          <div
          >
            <Card className="bg-card border-0">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Icon icon="solar:info-circle-bold" className="w-4 h-4 text-primary" />
                  How it works
                </h3>

                <div className="space-y-3">
                  {[
                    {
                      icon: "solar:user-id-bold",
                      title: "Choose a unique @username",
                      desc: "Your identity across Quantum Club",
                    },
                    {
                      icon: "solar:transfer-horizontal-bold",
                      title: "Receive funds easily",
                      desc: `Others send to @${qcUsername || "yourusername"} instead of a long address`,
                    },
                    {
                      icon: "solar:lock-keyhole-bold",
                      title: "One per user, forever yours",
                      desc: "Choose carefully — usernames can't be changed",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Icon icon={item.icon} className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
