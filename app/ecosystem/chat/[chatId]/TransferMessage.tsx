"use client";

import { Icon } from "@iconify/react";

interface TransferMessageProps {
  amount: string;
  status: "sent" | "failed";
  txHash?: string;
  isMine: boolean;
  isTestnet: boolean;
}

export default function TransferMessage({
  amount,
  status,
  txHash,
  isMine,
  isTestnet,
}: TransferMessageProps) {
  const explorerBase = isTestnet
    ? "https://testnet.tonviewer.com"
    : "https://tonviewer.com";

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#0098EA]/15 flex items-center justify-center shrink-0">
          <Icon icon="token:ton" className="w-5 h-5 text-[#0098EA]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{amount} TON</p>
          <p className="text-[10px] text-muted-foreground">
            {isMine ? "You sent" : "Received"}
          </p>
        </div>
        {status === "sent" ? (
          <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Icon icon="lucide:check" className="w-3 h-3 text-emerald-500" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
            <Icon icon="lucide:x" className="w-3 h-3 text-red-500" />
          </div>
        )}
      </div>
      {txHash && status === "sent" && (
        <a
          href={`${explorerBase}/transaction/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-primary hover:underline flex items-center gap-1"
        >
          <Icon icon="lucide:external-link" className="w-3 h-3" />
          View transaction
        </a>
      )}
    </div>
  );
}
