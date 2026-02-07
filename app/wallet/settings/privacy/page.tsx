"use client";

import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

export default function PrivacyPolicyPage() {
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
              <Icon icon="lucide:shield" className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground text-sm">Last updated: January 19, 2026</p>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)] rounded-xl border border-border bg-card p-4">
            <div className="prose prose-invert prose-sm max-w-none space-y-6">

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">1. Introduction</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Quantum Club (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our Telegram mini app and wallet services.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">2. Information We Collect</h2>

                <h3 className="text-md font-medium text-muted-foreground mt-3 mb-2">2.1 Information from Telegram</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  When you use our App through Telegram, we receive:
                </p>
                <ul className="text-muted-foreground text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Your Telegram user ID (encrypted for privacy)</li>
                  <li>Your Telegram username and display name</li>
                  <li>Your profile photo (if public)</li>
                </ul>

                <h3 className="text-md font-medium text-muted-foreground mt-3 mb-2">2.2 Wallet Information</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  <strong className="text-foreground">Your private keys and recovery phrase are stored locally on your device only.</strong> We never receive, store, or have access to:
                </p>
                <ul className="text-muted-foreground text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Your wallet&apos;s private keys</li>
                  <li>Your 24-word recovery phrase</li>
                  <li>Your PIN or biometric data</li>
                </ul>

                <h3 className="text-md font-medium text-muted-foreground mt-3 mb-2">2.3 Transaction and Activity Data</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We collect limited data for platform functionality:
                </p>
                <ul className="text-muted-foreground text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Your public wallet address</li>
                  <li>QNTM balance and transfer history within the platform</li>
                  <li>Task completion and referral data</li>
                  <li>Token creation and trading activity on RocketStart</li>
                  <li>Staking and liquidity provision activity</li>
                  <li>Chat messages in token communities</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">We use collected information to:</p>
                <ul className="text-muted-foreground text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Provide and maintain our services</li>
                  <li>Process QNTM transfers between users</li>
                  <li>Track task completion and distribute rewards</li>
                  <li>Maintain leaderboards and referral systems</li>
                  <li>Display portfolio analytics and performance data</li>
                  <li>Provide AI-powered assistance features</li>
                  <li>Prevent fraud and ensure platform security</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">4. Data Storage &amp; Security</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your sensitive wallet data (private keys, recovery phrase, PIN) is encrypted and stored locally on your device only. We implement industry-standard security measures to protect platform data stored on our servers. Your Telegram ID is encrypted before being used as an identifier.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">5. Data Sharing</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We do not sell your personal information. We may share data with:
                </p>
                <ul className="text-muted-foreground text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Service providers necessary for platform operation</li>
                  <li>Third-party staking and liquidity protocols (public wallet address only)</li>
                  <li>Law enforcement when legally required</li>
                  <li>Blockchain networks (public transaction data only)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">6. Blockchain Transactions</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Transactions on supported blockchain networks are public and immutable. Your wallet address and transaction details are visible on the public blockchain. This is inherent to blockchain technology and cannot be changed.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">7. Third-Party Services</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We integrate with third-party services including staking providers, decentralized exchanges, and liquidity protocols. These services have their own privacy policies and data practices. We encourage you to review those policies when using third-party services through our App.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">8. Your Rights</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">Depending on your jurisdiction, you may have the right to:</p>
                <ul className="text-muted-foreground text-sm list-disc list-inside mt-2 space-y-1">
                  <li>Access your personal data</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data (where legally permissible)</li>
                  <li>Object to or restrict processing of your data</li>
                  <li>Data portability</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">9. Children&apos;s Privacy</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Our services are not intended for users under 18 years of age. We do not knowingly collect personal information from children.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">10. International Transfers</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">11. Changes to This Policy</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes through the App or other means. Continued use of the App after changes constitutes acceptance of the updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground mb-2">12. Contact Us</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  For questions about this Privacy Policy or to exercise your rights, please contact us through our support @QCSupportBot
                </p>
              </section>

            </div>
          </ScrollArea>
        </motion.div>
      </div>
    </div>
  );
}
