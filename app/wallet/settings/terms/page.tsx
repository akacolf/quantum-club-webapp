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
            <p className="text-gray-400 text-sm">Last updated: December 10, 2025</p>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)] rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
            <div className="prose prose-invert prose-sm max-w-none space-y-6">

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  By accessing or using Quantum Club (&quot;the App&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App. Quantum Club reserves the right to modify these terms at any time.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">2. Eligibility</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  You must be at least 18 years old or the legal age of majority in your jurisdiction to use this App. By using the App, you represent and warrant that you meet these eligibility requirements. The App is not available to users in sanctioned countries or regions.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">3. Description of Services</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Quantum Club provides a non-custodial cryptocurrency wallet integrated within Telegram. The App allows you to:
                </p>
                <ul className="text-gray-400 text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Create and manage a self-custodial TON blockchain wallet</li>
                  <li>Send and receive TON and Jetton tokens</li>
                  <li>View, manage, and receive NFTs (Non-Fungible Tokens)</li>
                  <li>Track real-time asset prices with interactive charts</li>
                  <li>Monitor portfolio performance and 24-hour price changes</li>
                  <li>Earn and transfer QNTM points within the platform</li>
                  <li>Participate in platform activities and tasks</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">4. Non-Custodial Wallet</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  <strong className="text-white">You are solely responsible for your wallet.</strong> Quantum Club does not store, have access to, or control your private keys or recovery phrase. If you lose your recovery phrase, you will permanently lose access to your funds. We cannot help you recover lost funds.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">5. Fees</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Quantum Club wallet transactions are free of service fees. You only pay standard TON network fees (gas fees) which are determined by the blockchain and are not controlled by Quantum Club. QNTM transfers between users are also free.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">6. Prohibited Activities</h2>
                <p className="text-gray-400 text-sm leading-relaxed">You agree not to:</p>
                <ul className="text-gray-400 text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Use the App for any illegal purpose or in violation of any laws</li>
                  <li>Engage in money laundering, terrorist financing, or fraud</li>
                  <li>Attempt to circumvent geographic restrictions or sanctions</li>
                  <li>Reverse engineer, decompile, or hack the App</li>
                  <li>Use bots or automated systems to exploit the App</li>
                  <li>Impersonate others or create fraudulent accounts</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">7. Disclaimer of Warranties</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  THE APP IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. We do not guarantee uninterrupted or error-free service. Cryptocurrency transactions carry inherent risks including price volatility, regulatory changes, and potential total loss of funds.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">8. Limitation of Liability</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  To the maximum extent permitted by law, Quantum Club shall not be liable for any indirect, incidental, special, or consequential damages, including loss of funds, data, or profits arising from your use of the App.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">9. Regulatory Compliance</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  You are responsible for compliance with all applicable laws in your jurisdiction. The App is not available in countries subject to OFAC sanctions or similar restrictions. We reserve the right to restrict access based on geographic location.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">10. Termination</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  We may suspend or terminate your access to the App at any time for violation of these terms or for any other reason at our sole discretion. You may stop using the App at any time.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-white mb-2">11. Contact</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  For questions about these Terms of Service, please contact us through our Telegram channel: @quantumclubinc
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
