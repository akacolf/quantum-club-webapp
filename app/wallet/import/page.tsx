"use client";

import { useState, ClipboardEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trash2, ShieldCheck, X, ChevronDown, Sparkles, Info, Lock } from "lucide-react";
import { toast } from "sonner";
import { mnemonicToWalletKey, mnemonicValidate } from "@ton/crypto";
import { WalletContractV5R1, WalletContractV4, WalletContractV3R2 } from "@ton/ton";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useWallet } from "../WalletContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { analyticsEvents } from "@/lib/telegramAnalytics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserContext } from "@/app/(contexts)/UserContext";

// Protocol versions with professional descriptions
const WALLET_VERSIONS = [
  {
    id: "v5r1",
    name: "W5 Standard (Recommended)",
    description: "Latest protocol with gasless support and optimized security",
    recommended: true
  },
  {
    id: "v4r2",
    name: "V4R2",
    description: "Legacy standard used by many established wallet implementations",
    recommended: false
  },
  {
    id: "v3r2",
    name: "V3R2",
    description: "Initial protocol version for early TON wallet iterations",
    recommended: false
  },
];

export default function ImportWalletPage() {
  const router = useRouter();
  const { telegramId } = useUserContext();
  useTelegramBackButton("/wallet");

  const { setWalletAddress, addWallet, switchWallet, storedWallets, isTestnet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string[]>(Array(24).fill(""));
  const [isValidPhrase, setIsValidPhrase] = useState<boolean | null>(null);
  const [walletVersion, setWalletVersion] = useState("v5r1");
  const [previewAddresses, setPreviewAddresses] = useState<{ version: string; address: string }[]>([]);

  // Ensure page starts at top on navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Validate the entire phrase when all 24 words are filled
  useEffect(() => {
    const cleanedPhrase = seedPhrase.map(word => word.trim().toLowerCase());
    const allFilled = cleanedPhrase.every(word => word.length > 0);

    if (allFilled) {
      mnemonicValidate(cleanedPhrase).then(setIsValidPhrase);
    } else {
      setIsValidPhrase(null);
      setPreviewAddresses([]);
    }
  }, [seedPhrase]);

  // Generate preview addresses for all wallet versions
  useEffect(() => {
    const generatePreviews = async () => {
      const cleanedPhrase = seedPhrase.map(word => word.trim().toLowerCase());
      const allFilled = cleanedPhrase.every(word => word.length > 0);

      if (!allFilled || !isValidPhrase) {
        setPreviewAddresses([]);
        return;
      }

      try {
        const keyPair = await mnemonicToWalletKey(cleanedPhrase);
        const addresses: { version: string; address: string }[] = [];

        // V5R1
        const v5Wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
        addresses.push({ version: "v5r1", address: v5Wallet.address.toString({ bounceable: false, testOnly: isTestnet }) });

        // V4R2
        const v4Wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        addresses.push({ version: "v4r2", address: v4Wallet.address.toString({ bounceable: false, testOnly: isTestnet }) });

        // V3R2
        const v3Wallet = WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey });
        addresses.push({ version: "v3r2", address: v3Wallet.address.toString({ bounceable: false, testOnly: isTestnet }) });

        setPreviewAddresses(addresses);
      } catch (error) {
        console.error("Preview generation failed:", error);
      }
    };

    generatePreviews();
  }, [seedPhrase, isValidPhrase, isTestnet]);

  const handleWordChange = (index: number, value: string) => {
    const newPhrase = [...seedPhrase];
    newPhrase[index] = value;
    setSeedPhrase(newPhrase);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>, index: number) => {
    const pastedText = e.clipboardData.getData("text");
    const words = pastedText.trim().split(/\s+/).filter(word => word.length > 0);

    if (words.length > 1) {
      e.preventDefault();
      const newPhrase = [...seedPhrase];
      words.forEach((word, i) => {
        const targetIndex = index + i;
        if (targetIndex < 24) newPhrase[targetIndex] = word.toLowerCase().trim();
      });
      setSeedPhrase(newPhrase);
      if (words.length >= 24) toast.success("Recovery phrase sequence matched");
    }
  };

  const handleClear = () => {
    setSeedPhrase(Array(24).fill(""));
    setPreviewAddresses([]);
    toast.success("All inputs reset");
  };

  const handleImport = async () => {
    setIsLoading(true);
    const cleanedPhrase = seedPhrase.map(word => word.trim().toLowerCase());

    try {
      const isValid = await mnemonicValidate(cleanedPhrase);
      if (!isValid) {
        toast.error("Invalid recovery phrase. Please check your words.");
        setIsLoading(false);
        return;
      }

      const keyPair = await mnemonicToWalletKey(cleanedPhrase);
      let wallet;
      let versionLabel;

      switch (walletVersion) {
        case "v4r2":
          wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
          versionLabel = "V4R2";
          break;
        case "v3r2":
          wallet = WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey });
          versionLabel = "V3R2";
          break;
        case "v5r1":
        default:
          wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
          versionLabel = "V5R1";
          break;
      }

      const address = wallet.address.toString({ bounceable: false, testOnly: isTestnet });
      localStorage.setItem(`quantum_wallet_address_${telegramId}`, address);
      localStorage.setItem(`quantum_wallet_mnemonic_${telegramId}`, cleanedPhrase.join(" "));
      localStorage.setItem(`quantum_wallet_version_${telegramId}`, walletVersion);
      setWalletAddress(address);

      const walletName = `Wallet ${storedWallets.length + 1} (${versionLabel})`;
      addWallet(address, walletName);
      switchWallet(address);
      analyticsEvents.walletImported(address);

      toast.success("Wallet restored successfully!");
      router.push("/wallet");
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to restore access. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedVersion = WALLET_VERSIONS.find(v => v.id === walletVersion);
  const selectedPreviewAddress = previewAddresses.find(p => p.version === walletVersion)?.address;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pt-8 overflow-x-hidden selection:bg-primary/20">
      <div className="max-w-xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="space-y-8"
        >
          {/* Brand Header - Monochrome */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-2xl flex items-center justify-center border border-border backdrop-blur-md shadow-sm">
              <Lock className="w-8 h-8 text-primary" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                Import Account
              </h1>
              <p className="text-muted-foreground text-sm max-w-[280px] mx-auto leading-relaxed">
                Restore access to your assets using your 24-word secret phrase
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Protocol Selector - Grayscale */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.15 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-4 h-4 text-muted-foreground/40" />
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Select Version
                </Label>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full bg-card border-border text-foreground hover:bg-muted justify-between h-14 rounded-2xl backdrop-blur-xl transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border group-hover:border-primary/20 transition-colors">
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col items-start gap-0">
                        <span className="font-semibold text-sm">{selectedVersion?.name}</span>
                        <span className="text-[10px] text-muted-foreground tracking-tight">Wallet architecture</span>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[calc(100vw-32px)] max-w-[512px] bg-popover border-border text-popover-foreground rounded-2xl shadow-2xl p-2">
                  {WALLET_VERSIONS.map((version) => (
                    <DropdownMenuItem
                      key={version.id}
                      onClick={() => setWalletVersion(version.id)}
                      className={`flex flex-col items-start gap-1 p-3 rounded-xl cursor-default mb-1 last:mb-0 transition-all ${walletVersion === version.id
                        ? "bg-muted border-border"
                        : "hover:bg-muted/50 border-transparent"
                        } border`}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-sm tracking-wide">{version.name}</span>
                        {walletVersion === version.id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground leading-tight pr-4">
                        {version.description}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>

            {/* Phrase Input Container - Monochrome */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.15 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between px-1">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Recovery Phrase
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-7 px-3 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Clear All
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 p-4 bg-muted/30 rounded-[32px] border border-border backdrop-blur-sm relative overflow-hidden">
                {seedPhrase.map((word, i) => (
                  <div key={i} className="group relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground/30 font-bold font-mono tracking-tighter select-none pointer-events-none z-10 transition-colors group-hover:text-muted-foreground">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    <Input
                      type="text"
                      value={word}
                      onChange={(e) => handleWordChange(i, e.target.value)}
                      onPaste={(e) => handlePaste(e, i)}
                      className={`
                        bg-background border border-border pl-9 pr-3 h-11 text-xs font-bold text-foreground rounded-xl
                        transition-all duration-300
                        placeholder:text-muted-foreground/30
                        focus:border-primary focus:bg-muted focus:ring-4 focus:ring-primary/5
                        ${word ? 'border-primary/50 shadow-sm' : 'hover:border-border'}
                      `}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Validation & Identity Status - Monochrome accented */}
            <AnimatePresence mode="wait">
              {isValidPhrase !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative p-5 rounded-3xl overflow-hidden ${isValidPhrase
                    ? 'bg-primary/5 border border-primary/20'
                    : 'bg-muted border border-border'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white/10`}>
                      {isValidPhrase ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <X className="w-5 h-5 text-white/40" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={`text-sm font-bold text-foreground`}>
                        {isValidPhrase ? 'Wallet Verified' : 'Check Sequence Failed'}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {isValidPhrase
                          ? 'The security check is complete and the phrase is valid.'
                          : 'Please check for typos or incorrect word sequence.'}
                      </p>
                    </div>
                  </div>

                  {isValidPhrase && selectedPreviewAddress && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 pt-4 border-t border-border space-y-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Wallet Address</span>
                      </div>
                      <div className="bg-muted rounded-2xl p-3 border border-border group cursor-pointer active:scale-[0.98] transition-all">
                        <p className="text-[11px] text-foreground font-mono break-all leading-tight text-center">
                          {selectedPreviewAddress}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Smart Security Banner - Primary Accent */}
            <div className="bg-primary/5 rounded-3xl p-5 border border-primary/20 space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shrink-0">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-foreground tracking-wide">Important Notes</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed pr-2">
                    Quantum Club support will never ask for your secret recovery phrase. Make sure you are in a safe environment before importing your wallet.
                  </p>
                </div>
              </div>

              {!isValidPhrase && (
                <div className="pt-2 flex items-start gap-3 border-t border-primary/10 mt-2">
                  <Info className="w-4 h-4 text-primary/50 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground/70 italic leading-relaxed">
                    If your assets do not appear, try re-importing with a different wallet version above.
                  </p>
                </div>
              )}
            </div>

            {/* Action Button - High Contrast Monochrome */}
            <div className="pt-4 pb-8">
              <Button
                onClick={handleImport}
                disabled={isLoading || !isValidPhrase}
                className={`
                  w-full h-14 rounded-[22px] font-extrabold text-base tracking-wider transition-all duration-500
                  ${isValidPhrase && !isLoading
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:-translate-y-1 active:translate-y-0.5'
                    : 'bg-muted text-muted-foreground/20 border border-border cursor-not-allowed'}
                `}
              >
                {isLoading ? (
                  <ButtonLoader />
                ) : (
                  <div className="flex items-center gap-2">
                    {isValidPhrase && <Lock className="w-4 h-4 mr-1" />}
                    Import
                  </div>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
