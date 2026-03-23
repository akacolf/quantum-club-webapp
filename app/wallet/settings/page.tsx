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
      answer: "Network fees (gas fees) are small payments made to the TON blockchain to process your transactions. Fees vary based on network congestion and transaction complexity. Simple TON transfers cost ~0.003-0.007 TON, while Jetton transfers cost ~0.03-0.06 TON."
    },
    {
      question: "How do I swap tokens?",
      answer: "Go to the Swap tab in your wallet. Select the tokens you want to swap, enter the amount, and confirm. Swaps are powered by Omniston, which routes your trade across multiple DEXs to find the best rate automatically."
    },
    {
      question: "What are cross-chain swaps?",
      answer: "Cross-chain swaps let you exchange tokens across different blockchains directly from your wallet. Powered by Omniston routing, you can swap between TON-based tokens and assets on other supported networks without leaving the app."
    },
    {
      question: "What is spot trading?",
      answer: "Spot trading lets you buy and sell tokens on the RocketStart launchpad using bonding curve mechanics. View real-time price charts, monitor market caps, and execute trades directly. Tokens that reach the graduation threshold are automatically listed on STON.fi DEX."
    },
    {
      question: "How does encrypted chat work?",
      answer: "Messages in private chats are end-to-end encrypted using NaCl box encryption. Only you and the recipient can read the messages — not even Quantum Club can access them. Group chats and token community chats are not end-to-end encrypted."
    },
    {
      question: "What is the QC AI Assistant?",
      answer: "The AI Assistant is powered by Google Gemini and can help you understand transactions, analyze tokens, answer questions about the platform, and provide general crypto guidance. Open it from the AI button on the home screen."
    },
    {
      question: "What is a QC Username?",
      answer: "A QC Username is a unique handle linked to your wallet address. Other users can send you assets using your username instead of your full wallet address. Register one from Wallet Settings > Username."
    },
    {
      question: "How do I stake TON?",
      answer: "Go to Wallet > Earn & Stake > TON Staking. You can stake your TON with liquid staking providers and receive tokens like tsTON, stTON, or hTON while earning up to 5% APY."
    },
    {
      question: "What are Liquidity Pools?",
      answer: "Liquidity pools allow you to provide assets to decentralized exchanges and earn trading fees. Go to Wallet > Earn & Stake > Liquidity Pools to provide liquidity and earn up to 25% APY."
    },
    {
      question: "How do I buy/sell NFTs?",
      answer: "Go to the NFT Marketplace from your wallet. Browse verified collections, view NFT details, and purchase directly. Your NFTs appear in the NFTs tab of your wallet."
    },
    {
      question: "What is TON Connect?",
      answer: "TON Connect allows you to securely connect your wallet to decentralized apps (dApps). Go to Wallet > Explore to discover dApps, or scan QR codes to connect. Manage connected apps in Settings > Connected Apps."
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
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center ring-1 ring-primary/20">
              <Icon icon="lucide:settings" className="w-7 h-7 text-primary" />
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
                  asChild
                  className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group"
                >
                  <Link href="/wallet/settings/recovery-phrase">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                        <Icon icon="lucide:file-text" className="w-5 h-5 text-green-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">Backup Recovery Phrase</p>
                        <p className="text-xs text-muted-foreground">View your 24-word seed phrase</p>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </Button>

                <div className="border-t border-border" />

                <Button variant="ghost" asChild className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group">
                  <Link href="/wallet/settings/wallets">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <Icon icon="lucide:wallet" className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">Manage Wallets</p>
                        <p className="text-xs text-muted-foreground">Add, switch, or remove wallets</p>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </Button>

                <div className="border-t border-border" />

                <Button variant="ghost" asChild className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group">
                  <Link href="/wallet/settings/address-book">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                        <Icon icon="lucide:book-user" className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">Address Book</p>
                        <p className="text-xs text-muted-foreground">Save frequently used addresses</p>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </Button>

                <div className="border-t border-border" />

                <Button variant="ghost" asChild className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group">
                  <Link href="/wallet/settings/username">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Icon icon="mdi:at" className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">Username</p>
                        <p className="text-xs text-muted-foreground">Claim your unique @username</p>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </Button>

                <div className="border-t border-border" />

                <Button variant="ghost" asChild className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group">
                  <Link href="/wallet/settings/price-alerts">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center">
                        <Icon icon="lucide:bell" className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">Price Alerts</p>
                        <p className="text-xs text-muted-foreground">Get notified when TON hits a target</p>
                      </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </Button>

                <div className="border-t border-border" />

                <Button variant="ghost" asChild className="w-full flex items-center justify-between h-auto p-4 hover:bg-muted rounded-none transition-colors group">
                  <Link href="/wallet/settings/connected-apps">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-500/10 rounded-full flex items-center justify-center">
                        <Icon icon="lucide:link-2" className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">Connected Apps</p>
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
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Preferences</h2>

            <Card className="bg-card border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                      <Icon icon="lucide:flask-conical" className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">TON Testnet Mode</p>
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
                          <Icon icon="lucide:trash-2" className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-destructive">Remove Wallet</p>
                          <p className="text-xs text-muted-foreground">Delete wallet from this device</p>
                        </div>
                      </div>
                      <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border text-foreground">
                    <AlertDialogHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                          <Icon icon="lucide:alert-triangle" className="w-6 h-6 text-red-400" />
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
              <Icon icon="lucide:help-circle" className="w-4 h-4" />
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
          <div className="flex flex-col items-center gap-2 pt-4">
            <a
              href="https://t.me/quantumclubinc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon icon="lucide:external-link" className="w-3 h-3" />
              Community & Announcements
            </a>
            <a
              href="https://t.me/QCSupportBot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Icon icon="lucide:help-circle" className="w-3 h-3" />
              Get Support
            </a>
          </div>
        </motion.div>


      </div>
    </div>
  );
}
