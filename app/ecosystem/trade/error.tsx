"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

export default function TradeError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20">
        <Icon icon="solar:chart-2-broken" className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold mb-2">Trading Error</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Something went wrong loading the trading page.
      </p>
      <Button onClick={() => reset()} variant="outline" className="rounded-xl">
        <Icon icon="lucide:refresh-cw" className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}
