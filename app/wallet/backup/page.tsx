"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

export default function BackupPhrasePage() {
  useTelegramBackButton("/wallet");
  const router = useRouter();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const pendingMnemonic = sessionStorage.getItem("pending_wallet_mnemonic");
    const pendingAddress = sessionStorage.getItem("pending_wallet_address");

    if (!pendingMnemonic || !pendingAddress) {
      router.push("/wallet");
      return;
    }

    requestAnimationFrame(() => {
      setMnemonic(pendingMnemonic.split(" "));
    });

    // Prefetch verify page for faster navigation
    router.prefetch("/wallet/verify");
  }, [router]);

  // Enable closing confirmation while viewing seed phrase
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.enableClosingConfirmation();

      return () => {
        window.Telegram?.WebApp?.disableClosingConfirmation();
      };
    }
  }, []);

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const copyMnemonic = () => {
    if (mnemonic.length > 0) {
      navigator.clipboard.writeText(mnemonic.join(" "));
      toast.success("Recovery phrase copied! Store it safely.");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinue = () => {
    const indices: number[] = [];
    while (indices.length < 3) {
      const randomIndex = Math.floor(Math.random() * 24);
      if (!indices.includes(randomIndex)) {
        indices.push(randomIndex);
      }
    }
    indices.sort((a, b) => a - b);
    sessionStorage.setItem("verification_indices", JSON.stringify(indices));
    router.push("/wallet/verify");
  };

  if (mnemonic.length === 0) {
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
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center ring-1 ring-primary/20">
              <Icon icon="lucide:shield-alert" className="w-7 h-7 text-primary"/>
            </div>
            <h1 className="text-2xl font-bold">Secret Recovery Phrase</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              This is the only way to recover your wallet. Write it down and keep it safe.
            </p>
          </div>



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
                  onClick={handleReveal}
                  variant="secondary"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl"
                >
                  <Icon icon="lucide:eye" className="w-4 h-4 mr-2"/>
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
                <Icon icon="lucide:eye-off" className="w-3 h-3"/>
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={copyMnemonic}
              variant="outline"
              className="w-full bg-card border-border text-foreground hover:bg-muted h-12 transition-colors"
            >
              {copied ? <Icon icon="lucide:check" className="w-4 h-4 mr-2 text-green-500"/> : <Icon icon="lucide:copy" className="w-4 h-4 mr-2"/>}
              {copied ? "Copied to Clipboard" : "Copy to Clipboard"}
            </Button>

            <Button
              onClick={handleContinue}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-bold transition-all shadow-lg"
            >
              Continue to Verify
              <Icon icon="lucide:arrow-right" className="w-4 h-4 ml-2"/>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
