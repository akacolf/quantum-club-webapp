"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Check, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { useGameContext } from "@/app/(contexts)/MiningContext";

export default function ViewRecoveryPhrasePage() {
  useTelegramBackButton("/wallet/settings");
  const router = useRouter();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const {telegramId}  = useGameContext();
  // Biometric authentication hook
  const { isOpen: isAuthOpen, requestAuth, handleSuccess: handleAuthSuccess, handleCancel: handleAuthCancel } = useBiometricAuth();

  useEffect(() => {
    // Only load mnemonic after authorization
    if (isAuthorized) {
      const storedMnemonic = localStorage.getItem(`quantum_wallet_mnemonic_${telegramId}`);
      if (!storedMnemonic) {
        toast.error("No wallet found");
        router.push("/wallet/settings");
        return;
      }
      setMnemonic(storedMnemonic.split(" "));
    }
  }, [router, isAuthorized]);

  // Request auth on mount
  useEffect(() => {
    const requestAuthorization = async () => {
      const authenticated = await requestAuth();
      if (authenticated) {
        setIsAuthorized(true);
      } else {
        toast.error("Authentication required to view recovery phrase");
        router.push("/wallet/settings");
      }
    };

    // Small delay to ensure the component is mounted
    const timer = setTimeout(requestAuthorization, 100);
    return () => clearTimeout(timer);
  }, [requestAuth, router]);

  const copyMnemonic = useCallback(() => {
    if (mnemonic.length > 0) {
      navigator.clipboard.writeText(mnemonic.join(" "));
      toast.success("Recovery phrase copied! Store it safely.");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [mnemonic]);

  // Show auth modal if not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <BiometricAuth
          isOpen={isAuthOpen}
          onSuccess={handleAuthSuccess}
          onCancel={handleAuthCancel}
        />
        <p className="text-muted-foreground">Authenticating...</p>
      </div>
    );
  }

  if (mnemonic.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pt-6 pb-24">
      <BiometricAuth
        isOpen={isAuthOpen}
        onSuccess={handleAuthSuccess}
        onCancel={handleAuthCancel}
      />

      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center ring-1 ring-primary/20">
              <ShieldAlert className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Recovery Phrase</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              This is the only way to recover your wallet. Keep it safe and never share it.
            </p>
          </div>

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <p className="text-xs text-destructive leading-relaxed text-center">
              <strong>Warning:</strong> Anyone with this phrase can access your wallet. Never share it with anyone, including Quantum Club support.
            </p>
          </div>

          {/* Mnemonic Grid */}
          <div className="relative">
            <ScrollArea className="h-64 rounded-xl border border-border bg-card">
              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 transition-all duration-500 ${!isRevealed ? 'blur-md select-none opacity-50' : 'opacity-100'}`}>
                {mnemonic.map((word, i) => (
                  <div key={i} className="flex items-center space-x-2 bg-muted border border-border rounded-lg px-3 py-2.5">
                    <span className="text-[10px] font-mono text-muted-foreground/50 w-4 select-none">{i + 1}.</span>
                    <span className="text-sm font-medium text-foreground font-mono">{word}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {!isRevealed && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Button
                  onClick={() => setIsRevealed(true)}
                  variant="secondary"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Reveal Phrase
                </Button>
              </div>
            )}

            {isRevealed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRevealed(false)}
                className="absolute -top-3 -right-3 text-muted-foreground hover:text-foreground h-8 w-8 p-0 bg-card rounded-full border border-border shadow-sm"
              >
                <EyeOff className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={copyMnemonic}
              variant="outline"
              className="w-full bg-card border-border text-foreground hover:bg-muted h-12 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied to Clipboard" : "Copy to Clipboard"}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
