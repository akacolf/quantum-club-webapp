"use client";

import { useState, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownLeft, Clock, Layers, ExternalLink, Image as ImageIcon } from "lucide-react";
import { fromNano, Address } from "@ton/core";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet, IS_TESTNET } from "../WalletContext";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import { dbfs } from "@/app/(firebase)/client";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";

interface HistoryEvent {
  event_id: string;
  timestamp: number;
  in_progress?: boolean;
  is_scam?: boolean;
  actions?: Array<{
    type: string;
    TonTransfer?: {
      amount?: string;
      recipient?: { address?: string };
      sender?: { address?: string };
    };
    JettonTransfer?: {
      amount?: string;
      recipient?: { address?: string };
      sender?: { address?: string };
      jetton?: { decimals?: number; symbol?: string };
    };
    NftItemTransfer?: {
      recipient?: { address?: string };
      sender?: { address?: string };
      nft?: string;
    };
  }>;
}

interface QNTMTransfer {
  id: string;
  type: 'sent' | 'received';
  amount: number;
  to?: string;
  from?: string;
  date: string;
  timestamp?: number;
}

export default function HistoryPage() {
  useTelegramBackButton("/wallet");
  const { walletAddress } = useWallet();
  const { telegramId } = useGameContext();
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [qntmHistory, setQntmHistory] = useState<QNTMTransfer[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingQntm, setIsLoadingQntm] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("blockchain");

  // Explorer URL based on network
  const EXPLORER_BASE_URL = IS_TESTNET ? "https://testnet.tonviewer.com" : "https://tonviewer.com";

  // Fetch QNTM transfer history from Firebase
  const fetchQntmHistory = useCallback(async () => {
    if (!telegramId) return;

    setIsLoadingQntm(true);
    try {
      const transferHistoryRef = collection(dbfs, `user/${telegramId}/transferHistory`);
      const q = query(transferHistoryRef, orderBy("timestamp", "desc"), limit(50));
      const snapshot = await getDocs(q);

      const transfers: QNTMTransfer[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        transfers.push({
          id: doc.id,
          type: data.type,
          amount: data.amount,
          to: data.to,
          from: data.from,
          date: data.date,
          timestamp: data.timestamp?.seconds || parseInt(doc.id),
        });
      });

      setQntmHistory(transfers);
    } catch (err) {
      console.error("Failed to fetch QNTM history:", err);
    } finally {
      setIsLoadingQntm(false);
    }
  }, [telegramId]);

  const fetchHistory = useCallback(async (address: string) => {
    if (!address) return;

    setIsLoadingHistory(true);
    setError(null);

    try {
      // Use AbortController to handle timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `https://tonapi.io/v2/accounts/${encodeURIComponent(address)}/events?limit=50`,
        {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      setHistory(data.events || []);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
          setError('Failed to load transaction history.');
        }
        console.error("Failed to fetch history:", err.message);
      }
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Fetch history when wallet address is available from context
  useEffect(() => {
    if (walletAddress) {
      fetchHistory(walletAddress);
    } else {
      setIsLoadingHistory(false);
    }
  }, [walletAddress, fetchHistory]);

  // Fetch QNTM history when telegramId is available
  useEffect(() => {
    if (telegramId) {
      fetchQntmHistory();
    } else {
      setIsLoadingQntm(false);
    }
  }, [telegramId, fetchQntmHistory]);

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

  const formatQcId = (qcId: string) => {
    if (!qcId) return "Unknown";
    return `${qcId.slice(0, 6)}...${qcId.slice(-4)}`;
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-4 h-screen bg-black text-white">
      <div className="flex items-center justify-center mb-4">
        <h2 className="text-xl font-bold text-white">History</h2>
      </div>

      {/* Tabs for Blockchain and QNTM */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 bg-[#111] border border-[#222] mb-4">
          <TabsTrigger
            value="blockchain"
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
          >
            Blockchain
          </TabsTrigger>
          <TabsTrigger
            value="qntm"
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
          >
            QNTM
          </TabsTrigger>
        </TabsList>

        {/* Blockchain History Tab */}
        <TabsContent value="blockchain" className="flex-1 mt-0">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
              <button
                onClick={() => walletAddress && fetchHistory(walletAddress)}
                className="ml-2 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          <ScrollArea className="flex-1 -mx-4 px-4 h-[calc(100vh-220px)]">
            <div className="space-y-3 pb-20">
              {isLoadingHistory ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="bg-[#111] border-[#222] shadow-none">
                    <CardContent className="p-4 flex items-center justify-between">
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
                    </CardContent>
                  </Card>
                ))
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-4">
                  <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-[#222]">
                    <Clock className="w-8 h-8 text-gray-600" />
                  </div>
                  <p>No blockchain transactions yet</p>
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
                  const status = event.in_progress ? "pending" : (event.is_scam ? "scam" : "ok");

                  // Normalize wallet address for comparison
                  let normalizedWalletAddress = "";
                  try {
                    normalizedWalletAddress = Address.parse(walletAddress).toRawString();
                  } catch {
                    normalizedWalletAddress = walletAddress;
                  }

                  if (action.type === "TonTransfer") {
                    const transfer = action.TonTransfer;
                    if (transfer) {
                      let recipientRaw = "";
                      try {
                        recipientRaw = transfer.recipient?.address ? Address.parse(transfer.recipient.address).toRawString() : "";
                      } catch {
                        recipientRaw = transfer.recipient?.address || "";
                      }

                      isIncoming = recipientRaw === normalizedWalletAddress;
                      amount = fromNano(transfer.amount || "0");
                      address = isIncoming ? (transfer.sender?.address || "") : (transfer.recipient?.address || "");
                      type = isIncoming ? "Received" : "Sent";
                    }
                  } else if (action.type === "JettonTransfer") {
                    const transfer = action.JettonTransfer;
                    if (transfer) {
                      let recipientRaw = "";
                      try {
                        recipientRaw = transfer.recipient?.address ? Address.parse(transfer.recipient.address).toRawString() : "";
                      } catch {
                        recipientRaw = transfer.recipient?.address || "";
                      }

                      isIncoming = recipientRaw === normalizedWalletAddress;
                      const decimals = transfer.jetton?.decimals || 9;
                      amount = transfer.amount ? (parseFloat(transfer.amount) / Math.pow(10, decimals)).toFixed(4) : "0";
                      symbol = transfer.jetton?.symbol || "TOKEN";
                      address = isIncoming ? (transfer.sender?.address || "") : (transfer.recipient?.address || "");
                      type = isIncoming ? "Received" : "Sent";
                    }
                  } else if (action.type === "ContractDeploy") {
                    type = "Deploy";
                  } else if (action.type === "NftItemTransfer") {
                    const transfer = action.NftItemTransfer;
                    if (transfer) {
                      let recipientRaw = "";
                      try {
                        recipientRaw = transfer.recipient?.address ? Address.parse(transfer.recipient.address).toRawString() : "";
                      } catch {
                        recipientRaw = transfer.recipient?.address || "";
                      }

                      isIncoming = recipientRaw === normalizedWalletAddress;
                      address = isIncoming ? (transfer.sender?.address || "") : (transfer.recipient?.address || "");
                      type = isIncoming ? "NFT Received" : "NFT Sent";
                      symbol = "NFT";
                      amount = "1";
                    }
                  } else if (action.type === "Subscribe") {
                    type = "Subscription";
                  } else if (action.type === "UnSubscribe") {
                    type = "Unsubscribe";
                  }

                  const date = new Date(event.timestamp * 1000);
                  const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  const formattedTime = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                  return (
                    <Card
                      key={event.event_id}
                      className="bg-[#111] border-[#222] shadow-none hover:border-[#333] transition-all active:scale-[0.99] cursor-pointer"
                      onClick={() => window.open(`${EXPLORER_BASE_URL}/transaction/${event.event_id}`, "_blank")}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-white/5 ${type === 'Deploy' ? 'bg-blue-500/10 text-blue-500' :
                            symbol === 'NFT' ? (isIncoming ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-500/10 text-purple-400') :
                              isIncoming ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                            {type === 'Deploy' ? (
                              <Layers className="w-5 h-5" />
                            ) : symbol === 'NFT' ? (
                              <ImageIcon className="w-5 h-5" />
                            ) : isIncoming ? (
                              <ArrowDownLeft className="w-5 h-5" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5" />
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
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <h4 className={`font-bold text-base ${status === 'scam' ? 'text-orange-500' :
                              status === 'pending' ? 'text-yellow-500' :
                                isIncoming ? 'text-green-500' : 'text-white'
                              }`}>
                              {type === 'Deploy' || type === 'Unknown' ? '' : (isIncoming ? '+' : '-')}{type !== 'Deploy' && type !== 'Unknown' ? `${parseFloat(amount).toFixed(4)} ${symbol}` : ''}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">{formattedDate} • {formattedTime}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-600" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* QNTM History Tab */}
        <TabsContent value="qntm" className="flex-1 mt-0">
          <ScrollArea className="flex-1 -mx-4 px-4 h-[calc(100vh-220px)]">
            <div className="space-y-3 pb-20">
              {isLoadingQntm ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="bg-[#111] border-[#222] shadow-none">
                    <CardContent className="p-4 flex items-center justify-between">
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
                    </CardContent>
                  </Card>
                ))
              ) : qntmHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-4">
                  <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-[#222]">
                    <Clock className="w-8 h-8 text-gray-600" />
                  </div>
                  <p>No QNTM transfers yet</p>
                  <p className="text-xs text-gray-600 text-center px-6">
                    Transfer QNTM to other Quantum Club members to see your history here
                  </p>
                </div>
              ) : (
                qntmHistory.map((transfer) => {
                  const isIncoming = transfer.type === 'received';
                  const counterparty = isIncoming ? transfer.from : transfer.to;

                  // Parse the date string or use timestamp
                  let formattedDate = transfer.date;
                  let formattedTime = "";

                  if (transfer.timestamp) {
                    const date = new Date(transfer.timestamp * 1000);
                    formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    formattedTime = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  }

                  return (
                    <Card key={transfer.id} className="bg-[#111] border-[#222] shadow-none hover:border-orange-500/30 transition-all active:scale-[0.99]">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-white/5 ${isIncoming ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                            }`}>
                            {isIncoming ? (
                              <ArrowDownLeft className="w-5 h-5" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-base">
                              {isIncoming ? 'Received' : 'Sent'}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="font-mono bg-orange-500/10 px-1.5 py-0.5 rounded text-orange-400">
                                {formatQcId(counterparty || "")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <h4 className={`font-bold text-base ${isIncoming ? 'text-green-500' : 'text-white'
                            }`}>
                            {isIncoming ? '+' : '-'}{transfer.amount.toLocaleString()} QNTM
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {formattedDate}{formattedTime ? ` • ${formattedTime}` : ''}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
