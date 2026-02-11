"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { toast } from "sonner";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import Loader from "@/app/(components)/Loader";

export default function QCDomainPage() {
  useTelegramBackButton("/wallet/settings");
  const { walletAddress } = useWallet();
  const { telegramId, qcUsername, setQcUsername } = useUserContext();

  const [newUsername, setNewUsername] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [availability, setAvailability] = useState<"available" | "taken" | null>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [existingAddress, setExistingAddress] = useState<string | null>(null);

  // Validation rules
  const MIN_LENGTH = 3;
  const MAX_LENGTH = 20;
  const USERNAME_REGEX = /^[a-z0-9][a-z0-9._]*[a-z0-9]$/;
  const RESERVED = [
    'admin', 'support', 'help', 'quantum', 'quantumclub', 'qc', 'system',
    'root', 'official', 'team', 'mod', 'moderator', 'bot', 'wallet',
  ];

  // Load existing username/domain on mount
  useEffect(() => {
    const loadExisting = async () => {
      if (!telegramId) return;
      try {
        const res = await fetch(`/api/qc-username?qcId=${encodeURIComponent(telegramId)}`);
        const data = await res.json();
        if (data.username) {
          setQcUsername(data.username);
          localStorage.setItem(`qcUsername_${telegramId}`, data.username);
          setExistingAddress(data.address || walletAddress);
        }
      } catch {
        // No existing username
      } finally {
        setIsLoadingExisting(false);
      }
    };
    loadExisting();
  }, [telegramId, setQcUsername, walletAddress]);

  // Validate username input
  const getValidationError = (name: string): string | null => {
    if (!name) return null;
    if (name.length < MIN_LENGTH) return `Minimum ${MIN_LENGTH} characters`;
    if (name.length > MAX_LENGTH) return `Maximum ${MAX_LENGTH} characters`;
    if (!USERNAME_REGEX.test(name)) return "Only lowercase letters, numbers, dots & underscores";
    if (RESERVED.includes(name)) return "This username is reserved";
    return null;
  };

  const validationError = getValidationError(newUsername);
  const isValidInput = newUsername.length >= MIN_LENGTH && !validationError;

  // Check availability
  const checkAvailability = async () => {
    if (!isValidInput) return;
    setIsChecking(true);
    setAvailability(null);
    try {
      const res = await fetch(`/api/qc-username?username=${encodeURIComponent(newUsername)}`);
      const data = await res.json();
      setAvailability(data.available ? "available" : "taken");
    } catch {
      toast.error("Failed to check availability");
    } finally {
      setIsChecking(false);
    }
  };

  // Register username (and auto-create domain)
  const handleRegister = async () => {
    if (!isValidInput || !telegramId) return;
    setIsRegistering(true);
    try {
      const res = await fetch("/api/qc-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          qcId: telegramId,
          address: walletAddress || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`You're now @${newUsername}!`);
        setQcUsername(newUsername);
        localStorage.setItem(`qcUsername_${telegramId}`, newUsername);
        setExistingAddress(walletAddress);
        setNewUsername("");
        setAvailability(null);
      } else {
        toast.error(data.error || "Failed to register");
        if (data.existingUsername) {
          setQcUsername(data.existingUsername);
          localStorage.setItem(`qcUsername_${telegramId}`, data.existingUsername);
        }
      }
    } catch {
      toast.error("Failed to register username");
    } finally {
      setIsRegistering(false);
    }
  };

  // Update wallet address for existing domain
  const handleUpdateAddress = async () => {
    if (!telegramId || !walletAddress) return;
    try {
      const res = await fetch("/api/qc-username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qcId: telegramId, address: walletAddress }),
      });
      if (res.ok) {
        setExistingAddress(walletAddress);
        toast.success("Wallet address updated!");
      }
    } catch {
      toast.error("Failed to update address");
    }
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-full flex items-center justify-center ring-1 ring-violet-500/30">
              <Icon icon="solar:user-id-bold" className="w-7 h-7 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold">Username</h1>
            <p className="text-muted-foreground text-sm">
              Your unique identity on Quantum Club
            </p>
          </div>

          {/* Existing Username + Domain Display */}
          {qcUsername && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3"
            >
              {/* Username Card */}
              <Card className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border-violet-500/20 overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon icon="solar:verified-check-bold" className="w-5 h-5 text-green-400" />
                      <span className="text-sm font-medium text-foreground">Your Username</span>
                    </div>
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                      Active
                    </Badge>
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
                      Resolves To
                    </Label>
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {existingAddress || walletAddress}
                    </p>
                    {existingAddress && existingAddress !== walletAddress && walletAddress && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 text-[10px]"
                        onClick={handleUpdateAddress}
                      >
                        Update to current wallet address
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Registration Form (only if no username yet) */}
          {!qcUsername && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-card border-border overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Choose your username</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                        <Input
                          placeholder="yourname"
                          value={newUsername}
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "");
                            setNewUsername(val);
                            setAvailability(null);
                          }}
                          maxLength={MAX_LENGTH}
                          className="pl-8 font-mono"
                          disabled={isRegistering}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={checkAvailability}
                        disabled={!isValidInput || isChecking}
                        className="px-4 shrink-0"
                      >
                        {isChecking ? (
                          <ButtonLoader size="sm" />
                        ) : (
                          "Check"
                        )}
                      </Button>
                    </div>

                    {/* Validation error */}
                    {validationError && newUsername.length > 0 && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                        {validationError}
                      </p>
                    )}

                    {/* Availability feedback */}
                    {availability === "available" && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-green-400 flex items-center gap-1"
                      >
                        <Icon icon="solar:check-circle-bold" className="w-3 h-3" />
                        @{newUsername} is available!
                      </motion.p>
                    )}
                    {availability === "taken" && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-destructive flex items-center gap-1"
                      >
                        <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                        @{newUsername} is already taken
                      </motion.p>
                    )}
                  </div>

                  {/* Username preview */}
                  {newUsername && !validationError && (
                    <div className="bg-muted/50 rounded-xl p-4 text-center space-y-1">
                      <p className="text-lg font-bold text-foreground">
                        @{newUsername}
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
                    disabled={availability !== "available" || isRegistering}
                  >
                    {isRegistering ? (
                      <ButtonLoader size="sm" />
                    ) : (
                      <>
                        <Icon icon="solar:add-circle-bold" className="w-4 h-4 mr-2" />
                        Claim @{newUsername || "username"}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Icon icon="solar:info-circle-bold" className="w-4 h-4 text-violet-400" />
                  How It Works
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
                      desc: "Others send to @windblown instead of a long address",
                    },
                    {
                      icon: "solar:lock-keyhole-bold",
                      title: "One per user, forever yours",
                      desc: "Choose carefully — usernames can't be changed",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <Icon icon={item.icon} className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
