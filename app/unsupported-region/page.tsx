"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function UnsupportedRegionPage() {
  const [mounted] = useState(() => typeof window !== "undefined");

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black text-white">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center min-h-screen p-6 pt-16">
        <div className="w-full max-w-lg space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <Icon icon="solar:info-circle-bold" className="w-20 h-20 text-red-500" />
          </div>

          {/* Title + description directly on the page */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-white">
              Service unavailable in your region
            </h1>
            <p className="text-neutral-400 text-base leading-relaxed">
              Due to regulatory requirements and sanctions compliance, Quantum Club services are not available in your current location.
            </p>
          </div>

          {/* Info Box */}
          <div className="rounded-xl bg-white/[0.03] p-4 flex gap-3">
            <Icon icon="solar:shield-warning-bold" className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-white font-medium text-sm">Why is this happening?</h4>
              <p className="text-neutral-500 text-sm mt-1 leading-relaxed">
                Quantum Club complies with international sanctions and regulatory requirements. Access from certain regions is restricted to maintain legal compliance.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-neutral-800">
              <AccordionTrigger className="text-white text-sm hover:text-orange-400 hover:no-underline">
                What regions are restricted?
              </AccordionTrigger>
              <AccordionContent className="text-neutral-400 text-sm">
                Access is restricted from countries and territories subject to comprehensive U.S., EU, or international sanctions. This includes but is not limited to countries under OFAC sanctions programs.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-neutral-800">
              <AccordionTrigger className="text-white text-sm hover:text-orange-400 hover:no-underline">
                Can I access using a VPN?
              </AccordionTrigger>
              <AccordionContent className="text-neutral-400 text-sm">
                Attempting to circumvent geographic restrictions using VPNs or other tools is a violation of our Terms of Service and may result in account suspension. We strongly advise against this.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-neutral-800">
              <AccordionTrigger className="text-white text-sm hover:text-orange-400 hover:no-underline">
                What happens to my account?
              </AccordionTrigger>
              <AccordionContent className="text-neutral-400 text-sm">
                Your account data remains secure. If you relocate to a supported region, you may regain access to your account. Contact our support team if you believe this restriction was applied in error.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-neutral-800">
              <AccordionTrigger className="text-white text-sm hover:text-orange-400 hover:no-underline">
                How can I contact support?
              </AccordionTrigger>
              <AccordionContent className="text-neutral-400 text-sm">
                You can reach our support team through our official Telegram channel. Please include your account details when reaching out.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Contact Support Button */}
          <Button
            className="w-full h-12 rounded-xl shadow-lg shadow-orange-500/10"
            onClick={() => window.open("https://t.me/QCSupportBot", "_blank")}
          >
            <Icon icon="lucide:send" className="w-4 h-4 mr-2" />
            Contact support
          </Button>

          {/* Footer */}
          <p className="text-center text-xs text-neutral-600">
            © {new Date().getFullYear()} Quantum Club. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
