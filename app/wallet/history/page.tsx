"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { fromNano, Address } from "@ton/core";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

export default function HistoryPage() {
  useTelegramBackButton("/wallet");
  const [walletAddress, setWalletAddress] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    const storedWallet = localStorage.getItem("quantum_wallet_address");
    if (storedWallet) {
      setWalletAddress(storedWallet);
      fetchHistory(storedWallet);
    } else {
        setIsLoadingHistory(false);
    }
  }, []);

  const fetchHistory = async (address: string) => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`https://tonapi.io/v2/accounts/${address}/events?limit=20`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "Unknown";
    try {
      const addr = Address.parse(address);
      const friendly = addr.toString({ bounceable: false });
      return `${friendly.slice(0, 4)}...${friendly.slice(-4)}`;
    } catch {
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-4 h-screen bg-black text-white">
        <div className="flex items-center justify-center mb-6 relative">
          <h2 className="text-xl font-bold text-white">History</h2>
        </div>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-3 pb-20">
            {isLoadingHistory ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#111] border border-[#222]">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-full bg-[#222]" />
                      <div className="space-y-2">
                        <Skeleton className="w-24 h-4 bg-[#222]" />
                        <Skeleton className="w-16 h-3 bg-[#222]" />
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Skeleton className="w-20 h-5 bg-[#222]" />
                      <Skeleton className="w-12 h-3 bg-[#222]" />
                    </div>
                </div>
              ))
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-4">
                <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-[#222]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
                </div>
                <p>No transactions yet</p>
              </div>
            ) : (
              history.map((event) => {
                const action = event.actions && event.actions[0];
                if (!action) return null;
                
                let type = "Unknown";
                let amount = "0";
                let symbol = "TON";
                let isIncoming = false;
                let address = "";
                let status = event.status || "ok";
                
                if (action.type === "TonTransfer") {
                  const transfer = action.TonTransfer;
                  isIncoming = transfer.recipient.address === walletAddress;
                  amount = fromNano(transfer.amount);
                  address = isIncoming ? transfer.sender.address : transfer.recipient.address;
                  type = isIncoming ? "Received" : "Sent";
                } else if (action.type === "JettonTransfer") {
                  const transfer = action.JettonTransfer;
                  isIncoming = transfer.recipient?.address === walletAddress;
                  amount = transfer.amount ? (parseFloat(transfer.amount) / Math.pow(10, transfer.jetton.decimals)).toFixed(4) : "0";
                  symbol = transfer.jetton.symbol;
                  address = isIncoming ? transfer.sender?.address : transfer.recipient?.address;
                  type = isIncoming ? "Received" : "Sent";
                } else if (action.type === "ContractDeploy") {
                    type = "Deploy";
                }

                const date = new Date(event.timestamp * 1000);
                const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const formattedTime = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={event.event_id} className="group flex items-center justify-between p-4 rounded-2xl bg-[#111] border border-[#222] hover:border-[#333] transition-all active:scale-[0.99]">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-white/5 ${
                        type === 'Deploy' ? 'bg-blue-500/10 text-blue-500' :
                        isIncoming ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {type === 'Deploy' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        ) : isIncoming ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">{type}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-mono bg-[#1a1a1a] px-1.5 py-0.5 rounded text-gray-400">
                            {formatAddress(address)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <h4 className={`font-bold text-base ${
                        status === 'failed' ? 'text-gray-500 line-through' :
                        isIncoming ? 'text-green-500' : 'text-white'
                      }`}>
                        {isIncoming ? '+' : '-'}{amount} {symbol}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{formattedDate} • {formattedTime}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
    </div>
  );
}
