"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

export default function TermsOfServicePage() {
  useTelegramBackButton("/home/profile");

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
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Terms of Service</h1>
            <p className="text-muted-foreground text-sm">Last updated: January 2, 2026</p>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)] rounded-xl border border-border bg-card p-4">
            <div className="prose prose-invert prose-sm max-w-none space-y-6">

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  By accessing or using the Quantum Club application (&quot;App&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the App. We reserve the right to modify these Terms at any time. Your continued use of the App following any changes constitutes acceptance of those changes.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">2. Eligibility</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You must be at least 18 years old to use this App. By using the App, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms. The App is not available to users in jurisdictions where its use is prohibited by applicable law or regulation, including but not limited to sanctioned countries and regions.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">3. Description of Services</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Quantum Club is a self-custody cryptocurrency wallet and trading platform that allows users to:
                </p>
                <ul className="text-muted-foreground text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Create and manage cryptocurrency wallets</li>
                  <li>Send and receive digital assets including tokens and NFTs</li>
                  <li>Swap tokens through integrated decentralized exchanges</li>
                  <li>View portfolio balances and price information</li>
                  <li>Earn and transfer in-app rewards (QNTM points)</li>
                  <li>Access AI-powered assistance features</li>
                  <li>Receive cryptocurrencies on multiple blockchain networks</li>
                  <li>Create and trade tokens on RocketStart launchpad</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">4. Wallet Security and Responsibility</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  <strong className="text-foreground">You are solely responsible for your wallet security.</strong> Quantum Club is a non-custodial wallet, meaning we do not store, have access to, or control your private keys or recovery phrase. You acknowledge that:
                </p>
                <ul className="text-muted-foreground text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Your recovery phrase is the only way to access your wallet</li>
                  <li>If you lose your recovery phrase, your funds are permanently inaccessible</li>
                  <li>We cannot recover lost recovery phrases or private keys</li>
                  <li>You must keep your recovery phrase secure and confidential</li>
                  <li>You are responsible for all transactions made from your wallet</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">5. Token Swaps and Transactions</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Token swaps are facilitated through third-party decentralized exchange protocols. You understand and agree that:
                </p>
                <ul className="text-muted-foreground text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Swaps may fail due to price fluctuations, slippage, or insufficient liquidity</li>
                  <li>Network fees are required for all blockchain transactions</li>
                  <li>Transaction outcomes depend on blockchain network conditions</li>
                  <li>Executed transactions are irreversible once confirmed on the blockchain</li>
                  <li>We are not responsible for losses resulting from swap transactions</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">6. Token Trading (RocketStart)</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Quantum Club provides access to RocketStart, a token launchpad feature that uses bonding curve mechanics. <strong className="text-foreground">By using RocketStart, you acknowledge and accept the following risks:</strong>
                </p>
                <ul className="text-muted-foreground text-sm list-disc list-inside mt-2 space-y-1">
                  <li><strong className="text-foreground">High Risk:</strong> Tokens on RocketStart are highly speculative and may lose all value</li>
                  <li><strong className="text-foreground">No Guarantees:</strong> Past performance does not indicate future results</li>
                  <li><strong className="text-foreground">Bonding Curve:</strong> Prices are determined algorithmically; large trades cause significant slippage</li>
                  <li><strong className="text-foreground">Irreversible:</strong> All trades are final once executed on the blockchain</li>
                  <li><strong className="text-foreground">No Refunds:</strong> Quantum Club cannot reverse or refund any trades</li>
                  <li><strong className="text-foreground">Your Responsibility:</strong> You are solely responsible for your trading decisions</li>
                  <li><strong className="text-foreground">Not Investment Advice:</strong> Nothing in the App constitutes financial or investment advice</li>
                </ul>
                <p className="text-muted-foreground text-sm leading-relaxed mt-3">
                  <strong className="text-red-400">WARNING:</strong> Only trade with funds you can afford to lose entirely. Cryptocurrency and token trading involves substantial risk of loss.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">7. Fees</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Quantum Club does not charge service fees for basic wallet functionality. Users are responsible for blockchain network fees (gas fees) required to process transactions. Network fees are determined by the respective blockchain networks and are not controlled by Quantum Club. QNTM point transfers between users are free of charge.
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                  <strong className="text-foreground">RocketStart Trading Fees:</strong>
                </p>
                <ul className="text-muted-foreground text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Token creation: Free (gas fees only, approximately 0.05 TON)</li>
                  <li>Trading fee: 1.5% per trade (1% platform fee + 0.5% creator fee)</li>
                  <li>Graduation to DEX: 2% of liquidity</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">8. Prohibited Activities</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">You agree not to:</p>
                <ul className="text-muted-foreground text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Use the App for any unlawful purpose or in violation of any laws</li>
                  <li>Attempt to hack, exploit, or compromise the App&apos;s security</li>
                  <li>Use automated bots, scripts, or similar tools to access the App</li>
                  <li>Impersonate others or create fraudulent accounts</li>
                  <li>Engage in money laundering or terrorist financing</li>
                  <li>Circumvent geographic restrictions using VPNs or other tools</li>
                  <li>Interfere with or disrupt the App&apos;s functionality</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">9. Third-Party Services</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The App integrates with third-party services including blockchain networks, decentralized exchanges, and price data providers. These services are governed by their own terms and policies. We do not control and are not responsible for the availability, accuracy, or functionality of third-party services.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">10. Disclaimer of Warranties</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  THE APP IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">11. Limitation of Liability</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, QUANTUM CLUB AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR DIGITAL ASSETS, ARISING FROM YOUR USE OF THE APP. CRYPTOCURRENCY INVESTMENTS CARRY SIGNIFICANT RISK INCLUDING POTENTIAL TOTAL LOSS OF FUNDS.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">12. Indemnification</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You agree to indemnify and hold harmless Quantum Club, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the App, violation of these Terms, or infringement of any third-party rights.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">13. Termination</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We may suspend or terminate your access to the App at any time, with or without cause, and with or without notice. You may discontinue use of the App at any time. Upon termination, you retain access to your funds through your recovery phrase, as the wallet is non-custodial.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">14. Changes to Terms</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We reserve the right to modify these Terms at any time. Material changes will be communicated through the App. Your continued use of the App after changes take effect constitutes acceptance of the modified Terms.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">15. Governing Law</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved through binding arbitration.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">16. Contact Information</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  For questions or concerns about these Terms, please contact us on Telegram: @quantumclubinc
                </p>
              </section>

            </div>
          </ScrollArea>
        </motion.div>
      </div>
    </div>
  );
}

