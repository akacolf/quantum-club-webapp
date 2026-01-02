"use client";

import { useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Settings,
  HelpCircle,
  ChevronRight,
  Trash2,
  AlertTriangle,
  FileText,
  ExternalLink,
  Wallet,
  BookUser,
  Bell,
  FlaskConical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../WalletContext";

import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// TON Testnet toggle component with confirmation
function TestnetToggle() {
  const { isTestnet, toggleTestnet } = useWallet();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className="flex items-center space-x-2 cursor-pointer">
          <Switch
            checked={isTestnet}
            onCheckedChange={() => { }} // Controlled by dialog action
            className="data-[state=checked]:bg-orange-500"
          />
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle>Switch to {isTestnet ? "Mainnet" : "Testnet"}?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Switching networks will reset your wallet balance and assets for the new network.
            This is only for developers and testing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-accent focus:bg-accent">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={toggleTestnet}
            className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function WalletSettingsPage() {
  useTelegramBackButton("/wallet");
  const router = useRouter();
  const { clearWallet } = useWallet();

  // Prefetch all settings subpages for faster navigation
  useEffect(() => {
    router.prefetch("/wallet/settings/recovery-phrase");
    router.prefetch("/wallet/settings/wallets");
    router.prefetch("/wallet/settings/address-book");
    router.prefetch("/wallet/settings/price-alerts");
    router.prefetch("/wallet/settings/terms");
    router.prefetch("/wallet/settings/privacy");
  }, [router]);


  const handleDeleteWallet = useCallback(() => {
    // Use clearWallet from context to properly reset all state
    clearWallet();
    toast.success("Wallet removed from this device");
    router.push("/wallet");
  }, [router, clearWallet]);

  const faqItems = [
    {
      question: "What is a recovery phrase?",
      answer: "A recovery phrase (also called seed phrase) is a 24-word sequence that can be used to restore your wallet on any device. It's the only way to recover your wallet if you lose access, so store it securely offline."
    },
    {
      question: "How do I reset my PIN?",
      answer: "To reset your PIN, go to Wallet Settings > Remove Wallet. Then re-import your wallet using your 24-word recovery phrase. During the import process, you'll be prompted to set up a new PIN. Make sure you have your recovery phrase backed up before removing your wallet."
    },
    {
      question: "What is QNTM?",
      answer: "QNTM is the native points/token of Quantum Club. You can earn QNTM through mining, referrals, and completing tasks. QNTM can be transferred to other Quantum Club users instantly and for free."
    },
    {
      question: "What are network fees?",
      answer: "Network fees (gas fees) are small payments made to the TON blockchain to process your transactions. Fees vary based on network congestion and transaction complexity. Simple TON transfers cost ~0.003-0.007 TON, while Jetton transfers cost ~0.03-0.06 TON."
    },
    {
      question: "What is the wallet activation fee?",
      answer: "When you send your first transaction from a new wallet, a small one-time activation fee (~0.01 TON) is required to deploy your wallet contract on the blockchain. This is a standard TON network requirement for all new wallets and only happens once."
    },
    {
      question: "Are there any service fees?",
      answer: "No! Quantum Club wallet is completely free to use. You only pay standard TON network fees (gas) which go to the blockchain validators, not to us. QNTM transfers between users are also free."
    },
    {
      question: "How do I backup my wallet?",
      answer: "Go to Wallet Settings > Backup Recovery Phrase to view your 24-word seed phrase. Write it down on paper and store it in a safe place. Never share it with anyone or store it digitally."
    },
    {
      question: "Is my wallet secure?",
      answer: "Your wallet is protected by biometric authentication (Face ID/Touch ID) or a PIN code. Your private keys are encrypted and stored locally on your device. We never have access to your funds or recovery phrase."
    },
    {
      question: "How do I send QNTM to another user?",
      answer: "Go to Wallet > Send QNTM. Enter the recipient's QC ID (they can find it in their Frens section or wallet) and the amount you want to send. QNTM transfers are instant and free!"
    }
  ];

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
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center ring-1 ring-primary/20">
              <Settings className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Wallet Settings</h1>
            <p className="text-muted-foreground text-sm">Manage security and preferences</p>
          </div>

          {/* Security Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Security</h2>

            <Card className="bg-card border-border overflow-hidden">
              <CardContent className="p-0">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/wallet/settings/recovery-phrase")}
                  className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Backup Recovery Phrase</p>
                      <p className="text-xs text-muted-foreground">View your 24-word seed phrase</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Button>

                <div className="border-t border-border" />

                <Button
                  variant="ghost"
                  onClick={() => router.push("/wallet/settings/wallets")}
                  className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Manage Wallets</p>
                      <p className="text-xs text-muted-foreground">Add, switch, or remove wallets</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Button>

                <div className="border-t border-border" />

                <Button
                  variant="ghost"
                  onClick={() => router.push("/wallet/settings/address-book")}
                  className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                      <BookUser className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Address Book</p>
                      <p className="text-xs text-muted-foreground">Save frequently used addresses</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Button>

                <div className="border-t border-border" />

                <Button
                  variant="ghost"
                  onClick={() => router.push("/wallet/settings/price-alerts")}
                  className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center">
                      <Bell className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">Price Alerts</p>
                      <p className="text-xs text-muted-foreground">Get notified when TON hits a target</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Developer Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Developer</h2>

            <Card className="bg-card border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                      <FlaskConical className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">TON Testnet Mode</p>
                      <p className="text-xs text-muted-foreground">Use TON testnet for testing</p>
                    </div>
                  </div>
                  <TestnetToggle />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Danger Zone */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Danger Zone</h2>

            <Card className="bg-card border-destructive/20 overflow-hidden">
              <CardContent className="p-0">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-between h-auto p-4 hover:bg-red-500/5 rounded-none transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
                          <Trash2 className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-destructive">Remove Wallet</p>
                          <p className="text-xs text-muted-foreground">Delete wallet from this device</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border text-foreground">
                    <AlertDialogHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                          <AlertDialogTitle>Remove Wallet?</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground text-xs">This action cannot be undone</AlertDialogDescription>
                        </div>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mt-2">
                        <p className="text-xs text-red-400 leading-relaxed font-medium">
                          Warning: Make sure you have backed up your recovery phrase. Without it, you will permanently lose access to your funds.
                        </p>
                      </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                      <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-accent focus:bg-accent">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteWallet}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Frequently Asked Questions
            </h2>

            <Accordion type="single" collapsible className="space-y-2">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card border border-border rounded-xl overflow-hidden px-4"
                >
                  <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Links */}
          <div className="flex justify-center pt-4">
            <a
              href="https://t.me/quantumclubinc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Announcements and community
            </a>
          </div>
        </motion.div>


      </div>
    </div>
  );
}
