"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Icon } from "@iconify/react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { fromNano, Address } from "@ton/core";
import { toast } from "sonner";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import {
  saveTransactionLabel,
  deleteTransactionLabel,
  SUGGESTED_TAGS,
  formatTag,
  type TransactionLabel,
} from "@/lib/transaction-labels";
import { useTonHistoryQuery, useQntmHistoryQuery } from "@/app/(hooks)/queries/use-wallet-history";

import type { HistoryEvent } from "@/app/(hooks)/queries/use-wallet-history";

type FilterType = "all" | "sent" | "received" | "swap" | "nft";

export default function HistoryPage() {
  useTelegramBackButton("/wallet");
  const { walletAddress, isTestnet } = useWallet();
  const { telegramId } = useUserContext();
  const {
    data: tonData,
    isLoading: isLoadingHistory,
    error: historyError,
    refetch: refetchHistory,
    fetchNextPage: fetchNextTonPage,
    hasNextPage: hasNextTonPage,
    isFetchingNextPage: isFetchingNextTonPage,
  } = useTonHistoryQuery(walletAddress, isTestnet);
  const {
    data: qntmData,
    isLoading: isLoadingQntm,
    fetchNextPage: fetchNextQntmPage,
    hasNextPage: hasNextQntmPage,
    isFetchingNextPage: isFetchingNextQntmPage,
  } = useQntmHistoryQuery(telegramId);
  const history = tonData?.pages.flatMap(page => page.events) ?? [];
  const qntmHistory = qntmData?.pages.flatMap(page => page.transfers) ?? [];
  const error = historyError ? "Failed to load transaction history." : null;

  // URL search params for tab, filter, and search
  const [{ tab: activeTab, filter: activeFilter, q: searchQuery }, setParams] = useQueryStates({
    tab: parseAsStringLiteral(["ton", "qntm"]).withDefault("ton"),
    filter: parseAsStringLiteral(["all", "sent", "received", "swap", "nft"] as const).withDefault("all"),
    q: parseAsString.withDefault(""),
  }, { history: "replace" });
  const setActiveTab = (value: string) => setParams({ tab: value as "ton" | "qntm" });
  const setActiveFilter = (value: FilterType) => setParams({ filter: value });
  const setSearchQuery = (value: string) => setParams({ q: value });
  
  // Transaction labeling state
  const [labelSheetOpen, setLabelSheetOpen] = useState(false);
  const [selectedTxHash, setSelectedTxHash] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [tagsInput, setTagsInput] = useState<string[]>([]);
  const [txLabels, setTxLabels] = useState<Record<string, TransactionLabel>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Virtual list refs
  const tonListRef = useRef<HTMLDivElement>(null);
  const qntmListRef = useRef<HTMLDivElement>(null);

  // Explorer URL based on network
  const EXPLORER_BASE_URL = isTestnet ? "https://testnet.tonviewer.com" : "https://tonviewer.com";


  // Load transaction labels
  useEffect(() => {
    if (telegramId) {
      const labels: Record<string, TransactionLabel> = {};
      const stored = localStorage.getItem(`quantum_transaction_labels_${telegramId}`);
      if (stored) {
        try {
          Object.assign(labels, JSON.parse(stored));
        } catch {
          // Ignore parse errors
        }
      }
      queueMicrotask(() => setTxLabels(labels));
    }
  }, [telegramId]);

  // Handle opening the label editor
  const handleOpenLabelSheet = (txHash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTxHash(txHash);
    const existingLabel = txLabels[txHash];
    if (existingLabel) {
      setLabelInput(existingLabel.label);
      setTagsInput(existingLabel.tags);
    } else {
      setLabelInput("");
      setTagsInput([]);
    }
    setLabelSheetOpen(true);
  };

  // Handle saving a label
  const handleSaveLabel = () => {
    if (!selectedTxHash || !telegramId) return;

    const newLabel = saveTransactionLabel(selectedTxHash, labelInput, tagsInput, telegramId);
    setTxLabels(prev => ({ ...prev, [selectedTxHash]: newLabel }));
    setLabelSheetOpen(false);
    toast.success(labelInput ? "Label saved" : "Tags saved");
  };

  // Handle deleting a label
  const handleDeleteLabel = () => {
    if (!selectedTxHash || !telegramId) return;

    deleteTransactionLabel(selectedTxHash, telegramId);
    setTxLabels(prev => {
      const updated = { ...prev };
      delete updated[selectedTxHash];
      return updated;
    });
    setLabelSheetOpen(false);
    toast.success("Label removed");
  };

  // Toggle a tag
  const handleToggleTag = (tag: string) => {
    setTagsInput(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
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

  const formatQcId = (qcId: string) => {
    if (!qcId) return "Unknown";
    return `${qcId.slice(0, 6)}...${qcId.slice(-4)}`;
  };

  const formatTokenQuantity = (rawAmount: unknown, decimals = 9) => {
    if (rawAmount === undefined || rawAmount === null || rawAmount === "") return "";
    const value = typeof rawAmount === "object" && rawAmount && "value" in rawAmount
      ? (rawAmount as { value?: unknown }).value
      : rawAmount;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "";
    return (numeric / Math.pow(10, decimals)).toFixed(4);
  };

  const getTokenSymbol = (token: unknown, fallback = "TOKEN") => {
    if (!token || typeof token !== "object") return fallback;
    const record = token as Record<string, unknown>;
    return String(record.symbol || record.name || fallback);
  };

  const getDomainName = (payload: unknown) => {
    if (!payload || typeof payload !== "object") return "";
    const record = payload as Record<string, unknown>;
    const nft = record.nft && typeof record.nft === "object" ? record.nft as Record<string, unknown> : null;
    return String(record.domain || record.name || nft?.dns || nft?.name || "");
  };

  const getLiquidityDetails = (payload: unknown) => {
    if (!payload || typeof payload !== "object") return "";
    const record = payload as Record<string, unknown>;
    const assetOne = record.asset_1 || record.token_1 || record.jetton_1 || record.jetton_master_1;
    const assetTwo = record.asset_2 || record.token_2 || record.jetton_2 || record.jetton_master_2;
    const amountOne = formatTokenQuantity(record.amount_1 || record.amount1 || record.first_amount, Number((assetOne as Record<string, unknown> | undefined)?.decimals ?? 9));
    const amountTwo = formatTokenQuantity(record.amount_2 || record.amount2 || record.second_amount, Number((assetTwo as Record<string, unknown> | undefined)?.decimals ?? 9));
    const parts = [
      amountOne ? `${amountOne} ${getTokenSymbol(assetOne, "TOKEN")}` : "",
      amountTwo ? `${amountTwo} ${getTokenSymbol(assetTwo, "TOKEN")}` : "",
    ].filter(Boolean);
    return parts.join(" + ");
  };

  // Parse transaction data for filtering and display
  const parseTransaction = (event: HistoryEvent) => {
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
    let detailText = "";
    let hideAmount = false;
    const status = event.in_progress ? "pending" : (event.is_scam ? "scam" : "ok");
    const actionPayload = (action as unknown as Record<string, unknown>)[action.type] as Record<string, unknown> | undefined;
    const normalizedActionType = action.type.toLowerCase().replace(/[_\s-]/g, "");

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
    } else if (action.type === "DepositStake") {
      type = "Stake";
      const stake = (action as any).DepositStake;
      if (stake) {
        amount = stake.amount ? fromNano(stake.amount) : "0";
        symbol = "TON";
        address = stake.pool?.address || "";
      }
    } else if (action.type === "WithdrawStake") {
      type = "Unstake";
      const unstake = (action as any).WithdrawStake;
      if (unstake) {
        amount = unstake.amount ? fromNano(unstake.amount) : "0";
        symbol = "TON";
        address = unstake.pool?.address || "";
        isIncoming = true;
      }
    } else if (action.type === "WithdrawStakeRequest") {
      type = "Unstake Request";
      const unstake = (action as any).WithdrawStakeRequest;
      if (unstake) {
        amount = unstake.amount ? fromNano(unstake.amount) : "0";
        symbol = "TON";
        address = unstake.pool?.address || "";
      }
    } else if (action.type === "ElectionsDepositStake") {
      type = "Validator Stake";
    } else if (action.type === "ElectionsRecoverStake") {
      type = "Validator Unstake";
      isIncoming = true;
    } else if (action.type === "JettonMint") {
      type = "Mint";
      const mint = (action as any).JettonMint;
      if (mint) {
        const decimals = mint.jetton?.decimals || 9;
        amount = mint.amount ? (parseFloat(mint.amount) / Math.pow(10, decimals)).toFixed(4) : "0";
        symbol = mint.jetton?.symbol || "TOKEN";
        isIncoming = true;
      }
    } else if (action.type === "JettonBurn") {
      type = "Burn";
      const burn = (action as any).JettonBurn;
      if (burn) {
        const decimals = burn.jetton?.decimals || 9;
        amount = burn.amount ? (parseFloat(burn.amount) / Math.pow(10, decimals)).toFixed(4) : "0";
        symbol = burn.jetton?.symbol || "TOKEN";
        address = "";
      }
    } else if (action.type === "DnsItemRenew" || (normalizedActionType.includes("dns") && normalizedActionType.includes("renew"))) {
      type = "Domain renewal";
      detailText = getDomainName(actionPayload) || "Domain renewal";
      hideAmount = true;
    } else if (normalizedActionType.includes("liquidity") && normalizedActionType.includes("deposit")) {
      type = "Liquidity deposit";
      detailText = getLiquidityDetails(actionPayload);
      amount = formatTokenQuantity(actionPayload?.ton_attached || actionPayload?.amount || actionPayload?.value);
      symbol = amount ? "TON" : "";
      hideAmount = !amount;
      address = typeof actionPayload?.pool === "object" && actionPayload.pool
        ? String((actionPayload.pool as Record<string, unknown>).address || "")
        : "";
    } else if (normalizedActionType.includes("liquidity") && (normalizedActionType.includes("withdraw") || normalizedActionType.includes("burn"))) {
      type = "Liquidity burn";
      detailText = getLiquidityDetails(actionPayload);
      hideAmount = true;
    } else if (action.type === "AuctionBid") {
      type = "Auction Bid";
      const bid = (action as any).AuctionBid;
      if (bid) {
        amount = bid.amount?.value ? fromNano(bid.amount.value) : "0";
        symbol = "TON";
      }
    } else if (action.type === "NftPurchase") {
      type = "NFT Purchase";
      const purchase = (action as any).NftPurchase;
      if (purchase) {
        amount = purchase.amount?.value ? fromNano(purchase.amount.value) : "0";
        symbol = "TON";
      }
    } else if (action.type === "SmartContractExec") {
      // Try to identify DeFi actions by looking at operation name
      const exec = (action as any).SmartContractExec;
      const operation = exec?.operation || "";
      
      if (operation.toLowerCase().includes("provide_lp") || operation.toLowerCase().includes("add_liquidity")) {
        type = "Liquidity deposit";
      } else if (operation.toLowerCase().includes("remove_lp") || operation.toLowerCase().includes("burn_lp")) {
        type = "Liquidity burn";
      } else if (operation.toLowerCase().includes("stake") || operation.toLowerCase().includes("deposit")) {
        type = "Stake";
      } else if (operation.toLowerCase().includes("unstake") || operation.toLowerCase().includes("withdraw")) {
        type = "Unstake";
        isIncoming = true;
      } else if (operation.toLowerCase().includes("claim")) {
        type = "Claim Rewards";
        isIncoming = true;
      } else if (operation.toLowerCase().includes("vote")) {
        type = "Vote";
      } else if (operation.toLowerCase().includes("swap")) {
        type = "Swap";
      } else {
        type = "Contract Call";
      }
      
      if (exec) {
        amount = exec.ton_attached ? fromNano(exec.ton_attached.toString()) : "0";
        symbol = "TON";
        address = exec.contract?.address || "";
        detailText = type === "Liquidity deposit" || type === "Liquidity burn" ? operation : "";
        hideAmount = (type === "Liquidity burn" && !exec.ton_attached) || (type === "Contract Call" && !exec.ton_attached);
      }
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
      detailText,
      hideAmount,
      status,
      formattedDate,
      formattedTime,
      actionType: action.type,
    };
  };

  // Filter and search transactions
  const filteredHistory = history
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

  // Filter QNTM history
  const filteredQntmHistory = qntmHistory.filter(tx => {
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

  const tonVirtualizer = useWindowVirtualizer({
    count: filteredHistory.length,
    estimateSize: () => 130,
    overscan: 3,
    scrollMargin: tonListRef.current?.offsetTop ?? 0,
  });

  const qntmVirtualizer = useWindowVirtualizer({
    count: filteredQntmHistory.length,
    estimateSize: () => 80,
    overscan: 3,
    scrollMargin: qntmListRef.current?.offsetTop ?? 0,
  });

  // Auto-fetch next page when scrolling near the end
  const tonVirtualItems = tonVirtualizer.getVirtualItems();
  useEffect(() => {
    const lastItem = tonVirtualItems[tonVirtualItems.length - 1];
    if (!lastItem) return;
    if (lastItem.index >= filteredHistory.length - 5 && hasNextTonPage && !isFetchingNextTonPage) {
      fetchNextTonPage();
    }
  }, [tonVirtualItems, filteredHistory.length, hasNextTonPage, isFetchingNextTonPage, fetchNextTonPage]);

  const qntmVirtualItems = qntmVirtualizer.getVirtualItems();
  useEffect(() => {
    const lastItem = qntmVirtualItems[qntmVirtualItems.length - 1];
    if (!lastItem) return;
    if (lastItem.index >= filteredQntmHistory.length - 5 && hasNextQntmPage && !isFetchingNextQntmPage) {
      fetchNextQntmPage();
    }
  }, [qntmVirtualItems, filteredQntmHistory.length, hasNextQntmPage, isFetchingNextQntmPage, fetchNextQntmPage]);

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "sent", label: "Sent" },
    { value: "received", label: "Received" },
    { value: "swap", label: "Swaps" },
    { value: "nft", label: "NFTs" },
  ];

  return (
    <div className="flex flex-col w-full max-w-md mx-auto p-4 min-h-screen bg-background text-foreground">
      <div className="flex items-center justify-center mb-4">
        <h2 className="text-xl font-bold text-foreground">History</h2>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by address, token, or amount..."
            className="pl-10 pr-10 h-11 bg-secondary border-0 rounded-xl text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <Icon icon="lucide:x" className="w-4 h-4"/>
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
            <Icon icon="lucide:filter" className="w-3.5 h-3.5 mr-1.5"/>
            Filters
            {activeFilter !== "all" && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                {activeTab === "qntm" ? filteredQntmHistory.length : filteredHistory.length}
              </Badge>
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
          <div className="flex flex-wrap gap-2 p-3 bg-secondary rounded-xl border-0">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={activeFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(option.value)}
                className={`h-8 px-3 rounded-lg text-xs ${
                  activeFilter === option.value 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary hover:bg-secondary/80"
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
        <TabsList className="w-full h-12 mb-4">
          <TabsTrigger
            value="ton"
            className="flex-1 h-full text-sm font-semibold data-[state=active]:shadow-lg text-muted-foreground"
          >
            Blockchain
          </TabsTrigger>
          <TabsTrigger
            value="qntm"
            className="flex-1 h-full text-sm font-semibold data-[state=active]:shadow-lg text-muted-foreground"
          >
            QNTM
          </TabsTrigger>
        </TabsList>

        {/* Blockchain History Tab */}
        <TabsContent value="ton" className="flex-1 mt-0">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border-0 rounded-xl text-red-400 text-sm text-center">
              {error}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchHistory()}
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

          <div className="-mx-4 px-4">
            {isLoadingHistory ? (
              <div className="space-y-3 pb-20">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="bg-secondary border-0 shadow-none">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-full bg-secondary" />
                        <div className="space-y-2">
                          <Skeleton className="w-24 h-4 bg-secondary" />
                          <Skeleton className="w-16 h-3 bg-secondary" />
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Skeleton className="w-20 h-5 bg-secondary" />
                        <Skeleton className="w-12 h-3 bg-secondary" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                {searchQuery || activeFilter !== "all" ? (
                  <Icon icon="lucide:search" className="w-8 h-8 text-muted-foreground"/>
                ) : (
                  <Icon icon="lucide:clock" className="w-8 h-8 text-muted-foreground"/>
                )}
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
              <div ref={tonListRef} className="pb-20">
                <div className="relative" style={{ height: `${tonVirtualizer.getTotalSize()}px` }}>
                  {tonVirtualItems.map((virtualItem) => {
                    const tx = filteredHistory[virtualItem.index];
                    return (
                      <div
                        key={tx.event_id}
                        className="absolute top-0 left-0 w-full pb-3"
                        style={{ transform: `translateY(${virtualItem.start - tonVirtualizer.options.scrollMargin}px)` }}
                        data-index={virtualItem.index}
                        ref={tonVirtualizer.measureElement}
                      >
                        <Card
                          className="bg-secondary border-0 shadow-none hover:bg-secondary/80 transition-all active:scale-[0.99] cursor-pointer"
                          onClick={() => window.open(`${EXPLORER_BASE_URL}/transaction/${tx.event_id}`, "_blank")}
                        >
                          <CardContent className="p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground mb-3 -mt-1"
                              onClick={(e) => handleOpenLabelSheet(tx.event_id, e)}
                            >
                              {txLabels[tx.event_id] ? (
                                <>
                                  <Icon icon="lucide:pencil" className="w-3 h-3 mr-1"/>
                                  Edit label
                                </>
                              ) : (
                                <>
                                  <Icon icon="lucide:tag" className="w-3 h-3 mr-1"/>
                                  Add label
                                </>
                              )}
                            </Button>

                            {txLabels[tx.event_id] && (
                              <div className="mb-3 pb-3 border-0">
                                <div className="flex-1 min-w-0">
                                  {txLabels[tx.event_id].label && (
                                    <p className="text-sm text-foreground truncate mb-1.5">
                                      {txLabels[tx.event_id].label}
                                    </p>
                                  )}
                                  {txLabels[tx.event_id].tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {txLabels[tx.event_id].tags.map(tag => (
                                        <span key={tag} className="text-[10px] text-muted-foreground">
                                          {formatTag(tag)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`shrink-0 ${tx.type === 'Deploy' ? 'text-primary' :
                                  tx.isSwap ? 'text-purple-400' :
                                    tx.symbol === 'NFT' ? 'text-purple-400' :
                                      tx.isIncoming ? 'text-green-500' : 'text-red-500'
                                  }`}>
                                  {tx.type === 'Deploy' ? (
                                    <Icon icon="lucide:layers" className="w-4 h-4"/>
                                  ) : tx.isSwap ? (
                                    <Icon icon="lucide:arrow-left-right" className="w-4 h-4"/>
                                  ) : tx.symbol === 'NFT' ? (
                                    <Icon icon="lucide:image" className="w-4 h-4"/>
                                  ) : tx.isIncoming ? (
                                    <Icon icon="lucide:arrow-down-left" className="w-4 h-4"/>
                                  ) : (
                                    <Icon icon="lucide:arrow-up-right" className="w-4 h-4"/>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-foreground text-sm truncate">{tx.type}</h4>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {tx.isSwap ? (
                                        <span className="font-mono text-muted-foreground truncate flex items-center gap-1">
                                        {tx.fromSymbol} <Icon icon="lucide:arrow-right" className="w-3 h-3"/> {tx.toSymbol}
                                      </span>
                                    ) : tx.detailText ? (
                                        <span className="text-muted-foreground truncate">
                                          {tx.detailText}
                                        </span>
                                    ) : tx.address ? (
                                        <span className="font-mono text-muted-foreground truncate">
                                          {formatAddress(tx.address)}
                                        </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                  {tx.isSwap ? (
                                    <>
                                      <div className="text-xs text-muted-foreground whitespace-nowrap">-{(parseFloat(tx.fromAmount) || 0).toFixed(4)} {tx.fromSymbol}</div>
                                      <h4 className="font-bold text-sm text-green-500 whitespace-nowrap">
                                        +{(parseFloat(tx.toAmount) || 0).toFixed(4)} {tx.toSymbol}
                                      </h4>
                                    </>
                                  ) : (
                                    <h4 className={`font-bold text-sm whitespace-nowrap ${tx.status === 'scam' ? 'text-orange-500' :
                                      tx.status === 'pending' ? 'text-yellow-500' :
                                        tx.isIncoming ? 'text-green-500' : 'text-foreground'
                                      }`}>
                                      {tx.type === 'Deploy' || tx.type === 'Unknown' || tx.hideAmount ? '' : (tx.isIncoming ? '+' : '-')}{tx.type !== 'Deploy' && tx.type !== 'Unknown' && !tx.hideAmount ? `${parseFloat(tx.amount).toFixed(4)} ${tx.symbol}` : ''}
                                    </h4>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">{tx.formattedDate} • {tx.formattedTime}</p>
                                </div>
                                <Icon icon="lucide:external-link" className="w-4 h-4 text-muted-foreground shrink-0"/>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
                {isFetchingNextTonPage && (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <ButtonLoader />
                  </div>
                )}
              </div>
            )}
          </div>
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

          <div className="-mx-4 px-4">
            {isLoadingQntm ? (
              <div className="space-y-3 pb-20">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="bg-secondary border-0 shadow-none">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-full bg-secondary" />
                        <div className="space-y-2">
                          <Skeleton className="w-24 h-4 bg-secondary" />
                          <Skeleton className="w-16 h-3 bg-secondary" />
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Skeleton className="w-20 h-5 bg-secondary" />
                        <Skeleton className="w-12 h-3 bg-secondary" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredQntmHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                {searchQuery || activeFilter !== "all" ? (
                  <Icon icon="lucide:search" className="w-8 h-8 text-muted-foreground"/>
                ) : (
                  <Icon icon="lucide:clock" className="w-8 h-8 text-muted-foreground"/>
                )}
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
              <div ref={qntmListRef} className="pb-20">
                <div className="relative" style={{ height: `${qntmVirtualizer.getTotalSize()}px` }}>
                  {qntmVirtualItems.map((virtualItem) => {
                    const transfer = filteredQntmHistory[virtualItem.index];
                    const isIncoming = transfer.type === 'received';
                    const counterparty = isIncoming ? transfer.from : transfer.to;

                    let formattedDate = transfer.date;
                    let formattedTime = "";
                    if (transfer.timestamp) {
                      const date = new Date(transfer.timestamp * 1000);
                      formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      formattedTime = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    }

                    return (
                      <div
                        key={transfer.id}
                        className="absolute top-0 left-0 w-full pb-3"
                        style={{ transform: `translateY(${virtualItem.start - qntmVirtualizer.options.scrollMargin}px)` }}
                        data-index={virtualItem.index}
                        ref={qntmVirtualizer.measureElement}
                      >
                        <Card className="bg-secondary border-0 shadow-none hover:bg-secondary/80 transition-all active:scale-[0.99]">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`shrink-0 ${isIncoming ? 'text-green-500' : 'text-orange-500'}`}>
                                {isIncoming ? (
                                  <Icon icon="lucide:arrow-down-left" className="w-5 h-5"/>
                                ) : (
                                  <Icon icon="lucide:arrow-up-right" className="w-5 h-5"/>
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-foreground text-base">
                                  {isIncoming ? 'Received' : 'Sent'}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-mono text-muted-foreground">
                                    {formatQcId(counterparty || "")}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <h4 className={`font-bold text-base ${isIncoming ? 'text-green-500' : 'text-foreground'}`}>
                                {isIncoming ? '+' : '-'}{transfer.amount.toLocaleString()} QNTM
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formattedDate}{formattedTime ? ` • ${formattedTime}` : ''}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
                {isFetchingNextQntmPage && (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <ButtonLoader />
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Label Editing Sheet */}
      <Sheet open={labelSheetOpen} onOpenChange={setLabelSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Add Label</SheetTitle>
            <SheetDescription>
              Add a note or tags to help you identify this transaction
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4">
            {/* Label Input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Note
              </label>
              <Input
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="e.g., Payment for services"
                className="h-11 bg-secondary border-0 rounded-xl"
              />
            </div>
            
            {/* Tags */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TAGS.map(tag => (
                  <Button
                    key={tag}
                    variant={tagsInput.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleTag(tag)}
                    className={`h-8 rounded-full text-xs ${
                      tagsInput.includes(tag) 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    {formatTag(tag)}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {txLabels[selectedTxHash || ""] && (
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl text-destructive hover:bg-destructive/10"
                  onClick={handleDeleteLabel}
                >
                  Remove
                </Button>
              )}
              <Button
                className="flex-1 h-12 rounded-xl"
                onClick={handleSaveLabel}
                disabled={!labelInput.trim() && tagsInput.length === 0}
              >
                Save
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
