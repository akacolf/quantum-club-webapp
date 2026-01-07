"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Clock, Layers, ExternalLink, Image as ImageIcon, Search, X, Filter } from "lucide-react";
import { fromNano, Address } from "@ton/core";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../WalletContext";
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
    JettonSwap?: {
      dex?: string;
      amount_in?: string;
      amount_out?: string;
      ton_in?: string;
      ton_out?: string;
      user_wallet?: { address?: string };
      router?: { address?: string };
      jetton_master_in?: { symbol?: string; decimals?: number; address?: string };
      jetton_master_out?: { symbol?: string; decimals?: number; address?: string };
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

type FilterType = "all" | "sent" | "received" | "swap" | "nft";

export default function HistoryPage() {
  useTelegramBackButton("/wallet");
  const { walletAddress, isTestnet } = useWallet();
  const { telegramId } = useGameContext();
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [qntmHistory, setQntmHistory] = useState<QNTMTransfer[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingQntm, setIsLoadingQntm] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("ton");
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Explorer URL based on network
  const EXPLORER_BASE_URL = isTestnet ? "https://testnet.tonviewer.com" : "https://tonviewer.com";
  const TON_API_BASE_URL = isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io";

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
        `${TON_API_BASE_URL}/v2/accounts/${encodeURIComponent(address)}/events?limit=50`,
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
  }, [TON_API_BASE_URL]);

  // Fetch history when wallet address is available or network changes
  useEffect(() => {
    if (walletAddress) {
      setHistory([]); // Clear history when refetching
      fetchHistory(walletAddress);
    } else {
      setIsLoadingHistory(false);
    }
  }, [walletAddress, fetchHistory, isTestnet]);

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

  // Parse transaction data for filtering and display
  const parseTransaction = useCallback((event: HistoryEvent) => {
    const action = event.actions && event.actions[0];
    if (!action) return null;

    let type = "Unknown";
    let amount = "0";
    let symbol = "TON";
    let isIncoming = false;
    let address = "";
    let isSwap = false;
    let fromSymbol = "";
    let toSymbol = "";
    let fromAmount = "";
    let toAmount = "";
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
    } else if (action.type === "JettonSwap") {
      const swap = action.JettonSwap;
      if (swap) {
        isSwap = true;
        type = "Swap";
        address = swap.router?.address || swap.dex || "";

        // Determine from token (what was sent)
        if (swap.ton_in && swap.ton_in !== "0") {
          fromSymbol = "TON";
          fromAmount = fromNano(swap.ton_in);
        } else if (swap.jetton_master_in) {
          fromSymbol = swap.jetton_master_in.symbol || "TOKEN";
          const decimalsIn = swap.jetton_master_in.decimals || 9;
          fromAmount = swap.amount_in ? (parseFloat(swap.amount_in) / Math.pow(10, decimalsIn)).toFixed(4) : "0";
        }

        // Determine to token (what was received)
        if (swap.ton_out && swap.ton_out !== "0") {
          toSymbol = "TON";
          toAmount = fromNano(swap.ton_out);
        } else if (swap.jetton_master_out) {
          toSymbol = swap.jetton_master_out.symbol || "TOKEN";
          const decimalsOut = swap.jetton_master_out.decimals || 9;
          toAmount = swap.amount_out ? (parseFloat(swap.amount_out) / Math.pow(10, decimalsOut)).toFixed(4) : "0";
        }

        // For display purposes
        symbol = `${fromSymbol} → ${toSymbol}`;
        amount = toAmount;
      }
    } else if (action.type === "Subscribe") {
      type = "Subscription";
    } else if (action.type === "UnSubscribe") {
      type = "Unsubscribe";
    }

    const date = new Date(event.timestamp * 1000);
    const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const formattedTime = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    return {
      event_id: event.event_id,
      type,
      amount,
      symbol,
      isIncoming,
      address,
      isSwap,
      fromSymbol,
      toSymbol,
      fromAmount,
      toAmount,
      status,
      formattedDate,
      formattedTime,
      actionType: action.type,
    };
  }, [walletAddress]);

  // Filter and search transactions
  const filteredHistory = useMemo(() => {
    return history
      .map(parseTransaction)
      .filter((tx): tx is NonNullable<ReturnType<typeof parseTransaction>> => tx !== null)
      .filter(tx => {
        // Apply type filter
        if (activeFilter !== "all") {
          switch (activeFilter) {
            case "sent":
              if (!tx.type.includes("Sent") && tx.type !== "Deploy") return false;
              break;
            case "received":
              if (!tx.type.includes("Received")) return false;
              break;
            case "swap":
              if (!tx.isSwap) return false;
              break;
            case "nft":
              if (tx.symbol !== "NFT") return false;
              break;
          }
        }
        
        // Apply search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesAddress = tx.address.toLowerCase().includes(query);
          const matchesSymbol = tx.symbol.toLowerCase().includes(query);
          const matchesType = tx.type.toLowerCase().includes(query);
          const matchesAmount = tx.amount.includes(query);
          
          if (!matchesAddress && !matchesSymbol && !matchesType && !matchesAmount) {
            return false;
          }
        }
        
        return true;
      });
  }, [history, parseTransaction, activeFilter, searchQuery]);

  // Filter QNTM history
  const filteredQntmHistory = useMemo(() => {
    return qntmHistory.filter(tx => {
      // Apply type filter
      if (activeFilter !== "all") {
        if (activeFilter === "sent" && tx.type !== "sent") return false;
        if (activeFilter === "received" && tx.type !== "received") return false;
        if (activeFilter === "swap" || activeFilter === "nft") return false; // QNTM doesn't have these
      }
      
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const counterparty = tx.type === "sent" ? tx.to : tx.from;
        const matchesCounterparty = counterparty?.toLowerCase().includes(query);
        const matchesAmount = tx.amount.toString().includes(query);
        
        if (!matchesCounterparty && !matchesAmount) {
          return false;
        }
      }
      
      return true;
    });
  }, [qntmHistory, activeFilter, searchQuery]);

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "sent", label: "Sent" },
    { value: "received", label: "Received" },
    { value: "swap", label: "Swaps" },
    { value: "nft", label: "NFTs" },
  ];

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-4 h-screen bg-background text-foreground">
      <div className="flex items-center justify-center mb-4">
        <h2 className="text-xl font-bold text-foreground">History</h2>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by address, token, or amount..."
            className="pl-10 pr-10 h-11 bg-card border-border rounded-xl text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-8 px-3 rounded-lg ${showFilters ? 'bg-primary text-primary-foreground' : ''}`}
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filters
            {activeFilter !== "all" && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">1</Badge>
            )}
          </Button>
          
          {activeFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="h-8 px-2 text-xs text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-card rounded-xl border border-border">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={activeFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(option.value)}
                className={`h-8 px-3 rounded-lg text-xs ${
                  activeFilter === option.value 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-background hover:bg-muted"
                }`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs for Blockchain and QNTM */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full h-12 p-1 bg-background border border-border rounded-xl mb-4">
          <TabsTrigger
            value="ton"
            className="flex-1 h-full rounded-lg text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-lg text-muted-foreground transition-all"
          >
            Blockchain
          </TabsTrigger>
          <TabsTrigger
            value="qntm"
            className="flex-1 h-full rounded-lg text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-lg text-muted-foreground transition-all"
          >
            QNTM
          </TabsTrigger>
        </TabsList>

        {/* Blockchain History Tab */}
        <TabsContent value="ton" className="flex-1 mt-0">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => walletAddress && fetchHistory(walletAddress)}
                className="ml-2 h-auto p-0 underline hover:no-underline text-red-400 hover:text-red-300 hover:bg-transparent"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Results count */}
          {!isLoadingHistory && (searchQuery || activeFilter !== "all") && (
            <div className="mb-3 px-1">
              <p className="text-xs text-muted-foreground">
                {filteredHistory.length} result{filteredHistory.length !== 1 ? 's' : ''} found
              </p>
            </div>
          )}

          <ScrollArea className="flex-1 -mx-4 px-4 h-[calc(100vh-340px)]">
            <div className="space-y-3 pb-20">
              {isLoadingHistory ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="bg-card border-border shadow-none">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-full bg-muted" />
                        <div className="space-y-2">
                          <Skeleton className="w-24 h-4 bg-muted" />
                          <Skeleton className="w-16 h-3 bg-muted" />
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Skeleton className="w-20 h-5 bg-muted" />
                        <Skeleton className="w-12 h-3 bg-muted" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center border border-border">
                    {searchQuery || activeFilter !== "all" ? (
                      <Search className="w-8 h-8 text-muted-foreground" />
                    ) : (
                      <Clock className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <p>
                    {searchQuery || activeFilter !== "all" 
                      ? "No matching transactions" 
                      : "No blockchain transactions yet"
                    }
                  </p>
                  {(searchQuery || activeFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSearchQuery(""); setActiveFilter("all"); }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                filteredHistory.map((tx) => (
                  <Card
                    key={tx.event_id}
                    className="bg-card border-border shadow-none hover:border-muted-foreground/20 transition-all active:scale-[0.99] cursor-pointer"
                    onClick={() => window.open(`${EXPLORER_BASE_URL}/transaction/${tx.event_id}`, "_blank")}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-border ${tx.type === 'Deploy' ? 'bg-primary/10 text-primary' :
                          tx.isSwap ? 'bg-purple-500/10 text-purple-400' :
                            tx.symbol === 'NFT' ? 'bg-purple-500/10 text-purple-400' :
                              tx.isIncoming ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                          {tx.type === 'Deploy' ? (
                            <Layers className="w-5 h-5" />
                          ) : tx.isSwap ? (
                            <ArrowLeftRight className="w-5 h-5" />
                          ) : tx.symbol === 'NFT' ? (
                            <ImageIcon className="w-5 h-5" />
                          ) : tx.isIncoming ? (
                            <ArrowDownLeft className="w-5 h-5" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-base">{tx.type}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {tx.isSwap ? (
                              <span className="font-mono bg-purple-500/10 px-1.5 py-0.5 rounded text-purple-400">
                                {tx.fromSymbol} → {tx.toSymbol}
                              </span>
                            ) : (
                              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                {formatAddress(tx.address)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {tx.isSwap ? (
                            <>
                              <div className="text-xs text-muted-foreground">-{(parseFloat(tx.fromAmount) || 0).toFixed(4)} {tx.fromSymbol}</div>
                              <h4 className="font-bold text-base text-green-500">
                                +{(parseFloat(tx.toAmount) || 0).toFixed(4)} {tx.toSymbol}
                              </h4>
                            </>
                          ) : (
                            <h4 className={`font-bold text-base ${tx.status === 'scam' ? 'text-orange-500' :
                              tx.status === 'pending' ? 'text-yellow-500' :
                                tx.isIncoming ? 'text-green-500' : 'text-foreground'
                              }`}>
                              {tx.type === 'Deploy' || tx.type === 'Unknown' ? '' : (tx.isIncoming ? '+' : '-')}{tx.type !== 'Deploy' && tx.type !== 'Unknown' ? `${parseFloat(tx.amount).toFixed(4)} ${tx.symbol}` : ''}
                            </h4>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{tx.formattedDate} • {tx.formattedTime}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* QNTM History Tab */}
        <TabsContent value="qntm" className="flex-1 mt-0">
          {/* Results count */}
          {!isLoadingQntm && (searchQuery || activeFilter !== "all") && (
            <div className="mb-3 px-1">
              <p className="text-xs text-muted-foreground">
                {filteredQntmHistory.length} result{filteredQntmHistory.length !== 1 ? 's' : ''} found
              </p>
            </div>
          )}

          <ScrollArea className="flex-1 -mx-4 px-4 h-[calc(100vh-340px)]">
            <div className="space-y-3 pb-20">
              {isLoadingQntm ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="bg-card border-border shadow-none">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-full bg-muted" />
                        <div className="space-y-2">
                          <Skeleton className="w-24 h-4 bg-muted" />
                          <Skeleton className="w-16 h-3 bg-muted" />
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Skeleton className="w-20 h-5 bg-muted" />
                        <Skeleton className="w-12 h-3 bg-muted" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredQntmHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center border border-border">
                    {searchQuery || activeFilter !== "all" ? (
                      <Search className="w-8 h-8 text-muted-foreground" />
                    ) : (
                      <Clock className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <p>
                    {searchQuery || activeFilter !== "all" 
                      ? "No matching transfers" 
                      : "No QNTM transfers yet"
                    }
                  </p>
                  {!searchQuery && activeFilter === "all" && (
                    <p className="text-xs text-muted-foreground text-center px-6">
                      Transfer QNTM to other Quantum Club members to see your history here
                    </p>
                  )}
                  {(searchQuery || activeFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSearchQuery(""); setActiveFilter("all"); }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                filteredQntmHistory.map((transfer) => {
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
                    <Card key={transfer.id} className="bg-card border-border shadow-none hover:border-orange-500/30 transition-all active:scale-[0.99]">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center border border-border ${isIncoming ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                            }`}>
                            {isIncoming ? (
                              <ArrowDownLeft className="w-5 h-5" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground text-base">
                              {isIncoming ? 'Received' : 'Sent'}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono bg-orange-500/10 px-1.5 py-0.5 rounded text-orange-400">
                                {formatQcId(counterparty || "")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <h4 className={`font-bold text-base ${isIncoming ? 'text-green-500' : 'text-foreground'
                            }`}>
                            {isIncoming ? '+' : '-'}{transfer.amount.toLocaleString()} QNTM
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
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
