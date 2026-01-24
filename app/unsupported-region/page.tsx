"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function UnsupportedRegionPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-lg space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center border border-red-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-500"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16h.01" />
                <path d="M12 8v4" />
              </svg>
            </div>
          </div>

          {/* Main Card */}
          <Card className="bg-[#111] border-[#222] shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <CardTitle className="text-2xl font-bold text-white">
                Service Unavailable in Your Region
              </CardTitle>
              <CardDescription className="text-gray-400 text-base">
                Due to regulatory requirements and sanctions compliance, Quantum Club services are not available in your current location.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Badge */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm text-red-400 font-medium">Access Restricted</span>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-[#0a0a0a] rounded-xl border border-[#222] space-y-3">
                <div className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-orange-500 mt-0.5 flex-shrink-0"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <div>
                    <h4 className="text-white font-medium text-sm">Why is this happening?</h4>
                    <p className="text-gray-500 text-sm mt-1">
                      Quantum Club complies with international sanctions and regulatory requirements. Access from certain regions is restricted to maintain legal compliance.
                    </p>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-[#222]">
                  <AccordionTrigger className="text-white text-sm hover:text-orange-400 hover:no-underline">
                    What regions are restricted?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 text-sm">
                    Access is restricted from countries and territories subject to comprehensive U.S., EU, or international sanctions. This includes but is not limited to countries under OFAC sanctions programs.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border-[#222]">
                  <AccordionTrigger className="text-white text-sm hover:text-orange-400 hover:no-underline">
                    Can I access using a VPN?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 text-sm">
                    Attempting to circumvent geographic restrictions using VPNs or other tools is a violation of our Terms of Service and may result in account suspension. We strongly advise against this.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-[#222]">
                  <AccordionTrigger className="text-white text-sm hover:text-orange-400 hover:no-underline">
                    What happens to my account?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 text-sm">
                    Your account data remains secure. If you relocate to a supported region, you may regain access to your account. Contact our support team if you believe this restriction was applied in error.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border-[#222]">
                  <AccordionTrigger className="text-white text-sm hover:text-orange-400 hover:no-underline">
                    How can I contact support?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 text-sm">
                    You can reach our support team through our official Telegram channel or by emailing support@quantumclub.app. Please include your account details when reaching out.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Contact Support Button */}
              <div className="pt-4 space-y-3">
                <Button
                  variant="outline"
                  className="w-full bg-transparent border-[#333] text-white hover:bg-[#1a1a1a] hover:border-orange-500/50"
                  onClick={() => window.open("https://t.me/QCSupportBot", "_blank")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="mr-2 text-blue-400"
                  >
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                  Contact Support
                </Button>

                <p className="text-center text-xs text-gray-600">
                  HTTP 451 • Unavailable For Legal Reasons
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} Quantum Club. All rights reserved.
            </p>
            <p className="text-xs text-gray-700">
              This restriction is in place to comply with international regulations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
