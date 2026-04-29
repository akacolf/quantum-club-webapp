"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
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
  const router = useRouter();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div className="flex items-center space-x-2 cursor-pointer">
          <Switch
            checked={isTestnet}
            onCheckedChange={() => { }} // Controlled by dialog action
          />
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-0 text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle>Switch to {isTestnet ? "Mainnet" : "Testnet"}?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Switching networks will reset your wallet balance and assets for the new network.
            This is only for developers and testing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-secondary border-0 text-foreground hover:bg-secondary/80 focus:bg-secondary/80">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              toggleTestnet();
              router.replace("/wallet");
            }}
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

  const handleDeleteWallet = () => {
    // Use clearWallet from context to properly reset all state
    clearWallet();
    toast.success("Wallet removed from this device");
    router.push("/wallet");
  };

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
      answer: "Network fees are small charges required to send transactions. The exact fee can change depending on how busy the network is and what kind of action you are taking."
    },
    {
      question: "How do I swap tokens?",
      answer: "Go to the Swap tab, select the assets you want to exchange, enter the amount, and confirm. Quantum Club will show the expected result before you approve."
    },
    {
      question: "What are cross-chain swaps?",
      answer: "Cross-chain swaps let you exchange assets across supported networks without leaving your wallet."
    },
    {
      question: "What is spot trading?",
      answer: "Spot trading lets you buy and sell listed tokens, view price charts, check market activity, and complete trades directly in the app."
    },
    {
      question: "How does encrypted chat work?",
      answer: "Private chats are protected so only you and the recipient can read them. Group and community chats are designed for shared conversations."
    },
    {
      question: "What is the QC AI Assistant?",
      answer: "The AI Assistant can help you understand transactions, analyze tokens, answer questions about the platform, and provide general crypto guidance. Open it from the AI button on the home screen."
    },
    {
      question: "What is a QC Username?",
      answer: "A QC Username is a unique handle linked to your wallet address. Other users can send you assets using your username instead of your full wallet address. Register one from Wallet Settings > Username."
    },
    {
      question: "How do I stake TON?",
      answer: "Go to Wallet > Earn & Stake > TON Staking. You can stake your TON and track your estimated rewards from the staking page."
    },
    {
      question: "What are Liquidity Pools?",
      answer: "Liquidity pools let you provide paired assets and earn a share of trading activity. Go to Wallet > Earn & Stake > Liquidity Pools to review available options."
    },
    {
      question: "How do I buy/sell NFTs?",
      answer: "Go to the NFT Marketplace from your wallet. Browse collections, view NFT details, and purchase directly. Your NFTs appear in the NFTs tab of your wallet."
    },
    {
      question: "What is TON Connect?",
      answer: "TON Connect lets you securely connect your wallet to apps. Go to Wallet > Explore to discover apps, or scan QR codes to connect. Manage connected apps in Settings > Connected Apps."
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
      question: "How do I get support?",
      answer: "For help and support, contact us via Telegram at @QCSupportBot. Our team is available to assist with any issues or questions about the platform."
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
            <Icon icon="lucide:settings" className="mx-auto h-7 w-7 text-white" />
            <h1 className="text-2xl font-bold">Wallet settings</h1>
            <p className="text-muted-foreground text-sm">Manage security and preferences</p>
          </div>

          {/* Security Section */}
          <div className="space-y-3">
            <h2 className="ml-1 text-sm font-semibold text-muted-foreground">Security</h2>

            <Card className="bg-card border-0 overflow-hidden">
              <CardContent className="p-0">
                <Button
                  variant="ghost"
                  asChild
                  className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group"
                >
                  <Link href="/wallet/settings/recovery-phrase">
                    <div className="flex items-center gap-3">
                      <Icon icon="lucide:file-text" className="h-5 w-5 text-white" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">Backup recovery phrase</p>
                        <p className="text-xs text-muted-foreground">View your 24-word seed phrase</p>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </Button>

                <Button variant="ghost" asChild className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group">
                  <Link href="/wallet/settings/wallets">
                    <div className="flex items-center gap-3">
                      <Icon icon="lucide:wallet" className="h-5 w-5 text-white" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">Manage wallets</p>
                        <p className="text-xs text-muted-foreground">Add, switch, or remove wallets</p>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </Button>

                <Button variant="ghost" asChild className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group">
                  <Link href="/wallet/settings/address-book">
                    <div className="flex items-center gap-3">
                      <Icon icon="lucide:book-user" className="h-5 w-5 text-white" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">Address book</p>
                        <p className="text-xs text-muted-foreground">Save frequently used addresses</p>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </Button>

                <Button variant="ghost" asChild className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group">
                  <Link href="/wallet/settings/username">
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:at" className="h-5 w-5 text-white" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">Username</p>
                        <p className="text-xs text-muted-foreground">Claim your unique @username</p>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </Button>

                <Button variant="ghost" asChild className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group">
                  <Link href="/wallet/settings/price-alerts">
                    <div className="flex items-center gap-3">
                      <Icon icon="lucide:bell" className="h-5 w-5 text-white" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">Price alerts</p>
                        <p className="text-xs text-muted-foreground">Get notified when TON hits a target</p>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </Button>

                <Button variant="ghost" asChild className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group">
                  <Link href="/wallet/settings/connected-apps">
                    <div className="flex items-center gap-3">
                      <Icon icon="lucide:link-2" className="h-5 w-5 text-white" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">Connected apps</p>
                        <p className="text-xs text-muted-foreground">Manage TON Connect dApps</p>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Developer Section */}
          <div className="space-y-3">
            <h2 className="ml-1 text-sm font-semibold text-muted-foreground">Preferences</h2>

            <Card className="bg-card border-0 overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Icon icon="lucide:flask-conical" className="h-5 w-5 text-white" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">TON testnet mode</p>
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
            <h2 className="ml-1 text-sm font-semibold text-muted-foreground">Danger zone</h2>

            <Card className="bg-card border-0 overflow-hidden">
              <CardContent className="p-0">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-between h-auto p-4 hover:bg-red-500/5 rounded-none transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Icon icon="lucide:trash-2" className="h-5 w-5 text-red-400" />
                        <div className="text-left">
                          <p className="font-medium text-destructive">Remove wallet</p>
                          <p className="text-xs text-muted-foreground">Delete wallet from this device</p>
                        </div>
                      </div>
                      <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-0 text-foreground">
                    <AlertDialogHeader className="text-left">
                      <div className="mb-2 flex items-start gap-3 text-left">
                        <Icon icon="lucide:alert-triangle" className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                        <div className="space-y-3 text-left">
                          <AlertDialogTitle>Remove wallet?</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground text-xs">This action cannot be undone</AlertDialogDescription>
                          <p className="text-left text-xs font-medium leading-relaxed text-red-400">
                            Warning: Make sure you have backed up your recovery phrase. Without it, you will permanently lose access to your funds.
                          </p>
                        </div>
                      </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                      <AlertDialogCancel className="bg-secondary border-0 text-foreground hover:bg-secondary/80 focus:bg-secondary/80">Cancel</AlertDialogCancel>
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
            <h2 className="ml-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Icon icon="lucide:help-circle" className="w-4 h-4" />
              Frequently asked questions
            </h2>

            <Accordion type="single" collapsible className="space-y-2">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-card border-0 rounded-xl overflow-hidden px-4"
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
          <div className="flex flex-col items-center gap-2 pt-4">
            <a
              href="https://t.me/quantumclubinc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon icon="lucide:external-link" className="w-3 h-3" />
              Community and announcements
            </a>
            <a
              href="https://t.me/QCSupportBot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Icon icon="lucide:help-circle" className="w-3 h-3" />
              Get support
            </a>
          </div>
        </motion.div>


      </div>
    </div>
  );
}
