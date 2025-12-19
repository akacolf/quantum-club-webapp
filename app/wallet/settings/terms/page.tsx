"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

export default function TermsOfServicePage() {
  useTelegramBackButton("/wallet/settings");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white p-4 pt-6 pb-24">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center ring-1 ring-blue-500/20">
              <FileText className="w-7 h-7 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold">Terms of Service</h1>
            <p className="text-gray-400 text-sm">Last updated: December 20, 2025</p>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)] rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
            <div className="prose prose-invert prose-sm max-w-none space-y-6">

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  By using Quantum Club, you agree to these Terms of Service. If you disagree, please do not use the app. We may update these terms at any time.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">2. Eligibility</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  You must be at least 18 years old to use this app. The app is not available in sanctioned countries or regions.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">3. What We Offer</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Quantum Club is a self-custody wallet for the TON blockchain. You can:
                </p>
                <ul className="text-gray-400 text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Create and manage your own wallet</li>
                  <li>Send and receive tokens and NFTs</li>
                  <li>Swap tokens between different currencies</li>
                  <li>Track your portfolio and price movements</li>
                  <li>Earn and transfer QNTM points</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">4. Your Wallet, Your Responsibility</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  <strong className="text-white">You control your wallet.</strong> We never store or have access to your recovery phrase or private keys. If you lose your recovery phrase, your funds are permanently lost. We cannot recover them for you.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">5. Token Swaps</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Token swaps are processed through decentralized exchanges. You should be aware that:
                </p>
                <ul className="text-gray-400 text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Swaps may fail due to price changes or low liquidity</li>
                  <li>Network fees apply to all transactions</li>
                  <li>You may receive fewer tokens than expected due to market conditions</li>
                  <li>We are not responsible for losses from swap transactions</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">6. Fees</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Quantum Club does not charge service fees. You only pay standard network fees set by the blockchain. QNTM transfers between users are free.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">7. Prohibited Activities</h2>
                <p className="text-gray-400 text-sm leading-relaxed">You agree not to:</p>
                <ul className="text-gray-400 text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Use the app for illegal purposes</li>
                  <li>Attempt to hack or exploit the app</li>
                  <li>Use bots or automated systems</li>
                  <li>Impersonate others or create fake accounts</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">8. No Guarantees</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  The app is provided &quot;as is&quot; without warranties. Cryptocurrency carries risks including price volatility and potential loss of funds. We are not liable for any losses.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">9. Termination</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  We may suspend or terminate access at any time for violations. You may stop using the app whenever you choose.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">10. Contact</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Questions? Reach us on Telegram: @quantumclubinc
                </p>
              </section>

            </div>
          </ScrollArea>

          <Button
            onClick={() => router.push("/wallet/settings")}
            variant="ghost"
            className="w-full text-gray-400 hover:text-white h-12"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
