"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

export default function WalletError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <Icon icon="solar:wallet-money-broken" className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold mb-2">Wallet error</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Something went wrong loading your wallet.
      </p>
      <Button onClick={() => reset()} variant="outline" className="rounded-xl">
        <Icon icon="lucide:refresh-cw" className="w-4 h-4 mr-2" />
        Try again
      </Button>
    </div>
  );
}
