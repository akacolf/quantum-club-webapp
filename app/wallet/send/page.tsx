"use client";

import { useState, useEffect, useMemo, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { Check, ChevronDown, Wallet, Info, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Loader from "@/app/(components)/Loader";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { toNano, Address, beginCell } from "@ton/core";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { useWallet } from "../WalletContext";
import { analyticsEvents } from "@/lib/telegramAnalytics";
import { resolveTonAddress } from "@/lib/tonAddressResolver";
import { 
  calculateServiceFee,
  getFeeRouterAddress,
  isFeeRouterDeployed,
  QC_SERVICE_FEE_PERCENT
} from "@/lib/treasuryConfig";
import { buildRouteMessageBody } from "@/lib/feeRouter";

interface SendableAsset {
  type: "ton" | "jetton";
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  image?: string;
  jettonAddress?: string;
  walletAddress?: string;
  priceUsd?: number;
}

export default function SendPage() {
  useTelegramBackButton("/wallet");
  const router = useRouter();
  
  const { isOpen: isAuthOpen, requestAuth, handleSuccess: handleAuthSuccess, handleCancel: handleAuthCancel } = useBiometricAuth();
  
  const { 
    walletAddress,
    tonBalance, 
    tonPrice, 
    jettons, 
    isLoadingAssets: isContextLoading,
    hasFetched,
    fetchWalletAssets 
  } = useWallet();

  const USE_TESTNET = true;
  const TON_API_BASE_URL = USE_TESTNET ? "https://testnet.tonapi.io" : "https://tonapi.io";

  const [step, setStep] = useState<"input" | "confirm" | "processing" | "success">("input");
  const [selectedAsset, setSelectedAsset] = useState<SendableAsset | null>(null);
  const [recipient, setRecipient] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [isDomainAddress, setIsDomainAddress] = useState(false);
  const [comment, setComment] = useState("");
  const [amount, setAmount] = useState("");
  const [estimatedFee, setEstimatedFee] = useState("0.01");
  const [serviceFee, setServiceFee] = useState("0");
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [needMinimum, setNeedMinimum] = useState(false);

  // Resolve .ton domain addresses
  useEffect(() => {
    const resolveAddress = async () => {
      if (!recipient.trim()) {
        setResolvedAddress("");
        setAddressError("");
        setIsDomainAddress(false);
        return;
      }

      // Check if it's a .ton domain
      if (recipient.trim().toLowerCase().endsWith(".ton")) {
        setIsDomainAddress(true);
        setIsResolvingAddress(true);
        setAddressError("");
        
        const result = await resolveTonAddress(recipient);
        
        if (result.isValid) {
          setResolvedAddress(result.address);
          setAddressError("");
        } else {
          setResolvedAddress("");
          setAddressError(result.error || "Invalid domain");
        }
        setIsResolvingAddress(false);
      } else {
        setIsDomainAddress(false);
        // Regular address validation
        const result = await resolveTonAddress(recipient);
        if (result.isValid) {
          setResolvedAddress(result.address);
          setAddressError("");
        } else if (recipient.trim().length > 0) {
          setResolvedAddress("");
          setAddressError(result.error || "Invalid address");
        }
      }
    };

    const debounceTimer = setTimeout(resolveAddress, 500);
    return () => clearTimeout(debounceTimer);
  }, [recipient]);

  // Redirect if no wallet
  useEffect(() => {
    const storedWallet = localStorage.getItem("quantum_wallet_address");
    if (!storedWallet) {
      router.push("/wallet");
    }
  }, [router]);

  // Get sendable assets from context data - memoized
  const sendableAssets = useMemo((): SendableAsset[] => {
    const assets: SendableAsset[] = [
      {
        type: "ton",
        symbol: "TON",
        name: "Toncoin",
        balance: tonBalance,
        decimals: 9,
        image: "https://ton.org/download/ton_symbol.png",
        priceUsd: tonPrice
      },
    ];
    
    jettons.forEach((jetton) => {
      assets.push({
        type: "jetton",
        symbol: jetton.symbol,
        name: jetton.name,
        balance: (parseFloat(jetton.balance) / Math.pow(10, jetton.decimals)).toFixed(4),
        decimals: jetton.decimals,
        image: jetton.image,
        jettonAddress: jetton.jettonAddress,
        walletAddress: jetton.walletAddress,
        priceUsd: jetton.priceUsd
      });
    });
    
    return assets;
  }, [tonBalance, jettons, tonPrice]);

  // Set default asset when data is ready
  useEffect(() => {
    if (hasFetched && !selectedAsset && sendableAssets.length > 0) {
      setSelectedAsset(sendableAssets[0]);
    }
  }, [hasFetched, selectedAsset, sendableAssets]);

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      // Check if exceeds balance
      if (selectedAsset) {
        const numValue = parseFloat(value) || 0;
        if(numValue < 0.01) {
          setNeedMinimum(true);
        }else{
          setNeedMinimum(false);
        }
        setInsufficientFunds(numValue > parseFloat(selectedAsset.balance));
      }
    }
  };

  const handleMaxAmount = () => {
    if (selectedAsset) {
      setAmount(selectedAsset.balance);
      setInsufficientFunds(false);
    }
  };

  const validateInput = () => {
    if (!recipient) {
      toast.error("Please enter a recipient address or .ton domain");
      return false;
    }
    
    if (isResolvingAddress) {
      toast.error("Please wait for address resolution");
      return false;
    }
    
    if (!resolvedAddress) {
      toast.error(addressError || "Invalid recipient address");
      return false;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return false;
    }
    if (selectedAsset && parseFloat(amount) > parseFloat(selectedAsset.balance)) {
      toast.error("Insufficient balance");
      setInsufficientFunds(true);
      return false;
    }
    if (parseFloat(amount) < 0.01) {
      toast.error("Minimum send amount is 0.01 TON");
      setNeedMinimum(true);
      return false;
    }
    return true;
  };

  // Calculate accurate network fee based on TON fee formulas
  const calculateNetworkFee = (messageCount: number, hasComment: boolean): number => {
    // Based on TON fee documentation:
    // transaction_fee = storage_fees + in_fwd_fees + computation_fees + action_fees + out_fwd_fees
    
    // Constants from TON config (basechain)
    const GAS_PRICE = 0.0000004; // TON per gas unit
    const LUMP_PRICE = 0.0004; // Base forward fee
    const BIT_PRICE = 0.000001; // Per bit forward fee
    const CELL_PRICE = 0.0004; // Per cell forward fee
    
    // Estimated gas usage for wallet v5r1 transfer
    const BASE_GAS = 5000; // Base compute gas
    const GAS_PER_MESSAGE = 3000; // Additional gas per outgoing message
    
    // Calculate compute fee
    const totalGas = BASE_GAS + (messageCount * GAS_PER_MESSAGE);
    const computeFee = totalGas * GAS_PRICE;
    
    // Calculate forward fees (for each outgoing message)
    // Simple TON transfer message: ~128 bits header + body
    const baseBits = 128;
    const commentBits = hasComment ? 256 : 0; // Approximate comment size
    const bitsPerMessage = baseBits + commentBits;
    const cellsPerMessage = hasComment ? 2 : 1;
    
    let totalForwardFee = 0;
    for (let i = 0; i < messageCount; i++) {
      const msgFwdFee = LUMP_PRICE + (BIT_PRICE * bitsPerMessage) + (CELL_PRICE * cellsPerMessage);
      const actionFee = msgFwdFee / 3; // Action fee is ~1/3 of forward fee
      totalForwardFee += msgFwdFee + actionFee;
    }
    
    // Storage fee is negligible for simple transfers
    const storageFee = 0.0001;
    
    // Total fee with 10% buffer for network fluctuations
    const totalFee = (computeFee + totalForwardFee + storageFee) * 1.1;
    
    return totalFee;
  };

  const estimateFee = async () => {
    setIsEstimating(true);
    try {
      const storedMnemonic = localStorage.getItem("quantum_wallet_mnemonic");
      if (!storedMnemonic) {
        throw new Error("Wallet not found");
      }

      const mnemonic = storedMnemonic.split(" ");
      const keyPair = await mnemonicToPrivateKey(mnemonic);
      
      const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });

      const ta = new TonApiClient({ baseUrl: TON_API_BASE_URL });
      const adapter = new ContractAdapter(ta);
      const contract = adapter.open(wallet);
      const toAddress = Address.parse(resolvedAddress);
      
      // Calculate QC service fee (0.5% deducted by Fee Router)
      const qcFeeAmount = calculateServiceFee(parseFloat(amount));
      setServiceFee(qcFeeAmount.toFixed(6));

      let networkFee: number;

      if (selectedAsset?.type === "ton") {
        // Fee Router: Single message to router contract
        // Router handles: deduct 0.5% fee, forward remainder to recipient
        const hasComment = comment.trim().length > 0;
        
        // Network fee for sending to router
        networkFee = calculateNetworkFee(1, hasComment);
        networkFee = Math.max(networkFee, 0.00338);
        
        // Router reserves gas for forwarding
        const routerGas = 0.01;
        networkFee += routerGas;
        
        // Build message for Fee Router
        const feeRouterAddress = Address.parse(getFeeRouterAddress(USE_TESTNET));
        const routeBody = buildRouteMessageBody(toAddress, comment.trim() || undefined);
        
        const messages = [
          internal({
            to: feeRouterAddress,
            value: toNano(amount),
            body: routeBody,
            bounce: false
          }),
        ];

        // Try to get more accurate fee from emulation
        let seqno = 0;
        try {
          seqno = await contract.getSeqno();
        } catch {
          // New wallet, seqno is 0
        }

        // Create transfer for emulation
        const transfer = wallet.createTransfer({
          seqno,
          secretKey: keyPair.secretKey,
          sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
          messages,
        });

        // Build external message for emulation
        const externalMessage = beginCell()
          .storeWritable((builder) => {
            builder.storeUint(0b10, 2);
            builder.storeUint(0, 2);
            builder.storeAddress(wallet.address);
            builder.storeCoins(0);
          })
          .storeBuilder(
            beginCell()
              .storeBit(false)
              .storeBit(true)
              .storeRef(transfer)
          )
          .endCell();

        // Use TON API emulation for accurate fee
        try {
          const emulateResponse = await fetch(
            `${TON_API_BASE_URL}/v2/emulation/emulateMessageToTrace`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                boc: externalMessage.toBoc().toString("base64"),
                ignore_signature_check: true
              })
            }
          );

          if (emulateResponse.ok) {
            const emulateData = await emulateResponse.json();
            const transactions = emulateData.transactions || [];
            let totalFees = 0;
            
            for (const tx of transactions) {
              const computeFee = tx.compute_phase?.gas_fees || 0;
              const storageFee = tx.storage_phase?.storage_fees_collected || 0;
              const actionFee = tx.action_phase?.total_action_fees || 0;
              totalFees += computeFee + storageFee + actionFee;
            }
            
            networkFee = totalFees / 1e9;
            if (networkFee < 0.001) {
              networkFee = 0.005; // Single message base fee
            }
            networkFee = networkFee * 1.15; // 15% buffer
          } else {
            throw new Error("Emulation failed");
          }
        } catch {
          // Fallback to calculated fee
          networkFee = calculateNetworkFee(1, hasComment) + routerGas;
        }
        
        networkFee = Math.max(networkFee, 0.00338);
        networkFee = Math.min(networkFee, 0.025);
        
        // Add router gas reserve
        networkFee += routerGas;
        
      } else {
        // Jetton transfer - more complex, higher fees
        networkFee = 0.05;
        
        if (selectedAsset?.decimals && selectedAsset.decimals < 6) {
          networkFee += 0.01;
        }
      }
      
      setEstimatedFee(networkFee.toFixed(6));
      setStep("confirm");
    } catch (error) {
      console.error("Fee estimation failed", error);
      // Fallback to safe default estimates
      const qcFee = calculateServiceFee(parseFloat(amount));
      const hasComment = comment.trim().length > 0;
      const baseFee = selectedAsset?.type === "ton" 
        ? calculateNetworkFee(1, hasComment) + 0.01 // +0.01 for router gas
        : 0.06;
      setEstimatedFee(Math.max(baseFee, 0.00338).toFixed(6));
      setServiceFee(qcFee.toFixed(6));
      setStep("confirm");
    } finally {
      setIsEstimating(false);
    }
  };

  const handleContinue = async () => {
    if (validateInput()) {
      await estimateFee();
    }
  };

  const handleConfirmSend = async () => {
    analyticsEvents.transactionSentForSignature(
      walletAddress || "",
      [{ address: resolvedAddress, amount: amount }]
    );

    const authenticated = await requestAuth();
    
    if (authenticated) {
      await executeSend();
    } else {
      toast.error("Authentication required to send transaction");
    }
  };

  const executeSend = async () => {
    const storedMnemonic = localStorage.getItem("quantum_wallet_mnemonic");
    if (!storedMnemonic) {
      toast.error("Wallet credentials not found");
      analyticsEvents.transactionSigningFailed("Wallet credentials not found");
      return;
    }

    setIsSending(true);
    setStep("processing");

    try {
      const mnemonic = storedMnemonic.split(" ");
      const keyPair = await mnemonicToPrivateKey(mnemonic);
      
      const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });

      const ta = new TonApiClient({ baseUrl: TON_API_BASE_URL });
      const adapter = new ContractAdapter(ta);
      const contract = adapter.open(wallet);
      const seqno = await contract.getSeqno();
      const toAddress = Address.parse(resolvedAddress);

      if (selectedAsset?.type === "ton") {
        const totalAmount = parseFloat(amount);
        
        // Check if Fee Router is deployed
        if (!isFeeRouterDeployed(USE_TESTNET)) {
          toast.error("Fee Router contract not deployed. Contact support.");
          setStep("input");
          setIsSending(false);
          return;
        }
        
        // Use Fee Router Smart Contract for secure fee collection
        const feeRouterAddress = Address.parse(getFeeRouterAddress(USE_TESTNET));
        
        // Send full amount to router - it handles fee deduction and forwarding
        const routeBody = buildRouteMessageBody(toAddress, comment.trim() || undefined);
        
        await contract.sendTransfer({
          seqno,
          secretKey: keyPair.secretKey,
          sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
          messages: [
            internal({
              to: feeRouterAddress,
              value: toNano(totalAmount.toFixed(9)),
              body: routeBody,
              bounce: false
            }),
          ],
        });
      } else if (selectedAsset?.type === "jetton" && selectedAsset.walletAddress) {
        // For jettons: send directly (no fee router support yet)
        const totalAmount = parseFloat(amount);
        const qcFeeAmount = parseFloat(serviceFee);
        const recipientAmount = totalAmount - qcFeeAmount;
        
        if (recipientAmount <= 0) {
          toast.error("Amount too small to cover fees");
          setStep("input");
          setIsSending(false);
          return;
        }
        
        const jettonAmount = BigInt(Math.floor(recipientAmount * Math.pow(10, selectedAsset.decimals)));
        const jettonWallet = Address.parse(selectedAsset.walletAddress);
        
        const body = beginCell()
          .storeUint(0xf8a7ea5, 32)
          .storeUint(0, 64)
          .storeCoins(jettonAmount)
          .storeAddress(toAddress)
          .storeAddress(wallet.address)
          .storeBit(false)
          .storeCoins(BigInt(1))
          .storeMaybeRef(undefined)
          .endCell();

        await contract.sendTransfer({
          seqno,
          secretKey: keyPair.secretKey,
          sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
          messages: [
            internal({
              to: jettonWallet,
              value: toNano("0.05"),
              body: body,
              bounce: false
            }),
          ],
        });
      }

      // Track successful transaction
      analyticsEvents.transactionSigned(
        walletAddress || "",
        [{ address: recipient, amount: amount }]
      );

      setStep("success");
      toast.success("Transaction sent!");
      
      // Refresh assets after delay
      setTimeout(() => {
        fetchWalletAssets();
      }, 3000);

    } catch (error) {
      console.error("Send failed:", error);
      
      // Track failed transaction
      const errorMessage = error instanceof Error ? error.message : "Transaction failed";
      analyticsEvents.transactionSigningFailed(errorMessage);
      
      // Show detailed error to user
      toast.error(`Transaction failed: ${errorMessage}`);
      setStep("input");
    } finally {
      setIsSending(false);
    }
  };

  if (isContextLoading && !selectedAsset) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pt-6">
      <div className="max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">Send Assets</h1>
        </div>

        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Asset Selection */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Asset</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full bg-[#111] border-[#222] h-16 px-4 justify-between hover:bg-[#1a1a1a] hover:border-[#333] transition-all rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        {selectedAsset?.image ? (
                          <Image src={selectedAsset.image} alt={selectedAsset.symbol} width={32} height={32} className="w-8 h-8 rounded-full" unoptimized />
                        ) : (
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                            {selectedAsset?.symbol?.slice(0, 2)}
                          </div>
                        )}
                        <div className="text-left">
                          <div className="font-bold text-white">{selectedAsset?.symbol}</div>
                          <div className="text-xs text-gray-500">Balance: {selectedAsset?.balance}</div>
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-md bg-[#1a1a1a] border-[#333] text-white">
                    <DropdownMenuLabel>Select Asset</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#333]" />
                    {sendableAssets.map((asset) => (
                      <DropdownMenuItem
                        key={asset.symbol}
                        onClick={() => setSelectedAsset(asset)}
                        className="flex items-center gap-3 p-3 hover:bg-[#222] cursor-pointer"
                      >
                        {asset.image ? (
                          <Image src={asset.image} alt={asset.symbol} width={32} height={32} className="w-8 h-8 rounded-full" unoptimized />
                        ) : (
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                            {asset.symbol.slice(0, 2)}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-bold">{asset.symbol}</div>
                          <div className="text-xs text-gray-400">{asset.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{asset.balance}</div>
                          {asset.priceUsd && (
                            <div className="text-xs text-gray-500">
                              ${(parseFloat(asset.balance) * asset.priceUsd).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Recipient */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1">Recipient Address or .ton Domain</label>
                <div className="relative">
                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter TON address or name.ton"
                    className={`bg-[#111] border-[#222] h-14 pl-4 pr-10 text-white placeholder:text-gray-600 rounded-xl transition-all font-mono text-sm ${
                      addressError ? 'border-red-500 focus:border-red-500' : 
                      resolvedAddress ? 'border-green-500/50 focus:border-green-500' : 'focus:border-blue-500/50'
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isResolvingAddress ? (
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    ) : resolvedAddress ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Wallet className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                </div>
                {isDomainAddress && resolvedAddress && (
                  <p className="text-xs text-green-400 ml-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Resolved to: {resolvedAddress.slice(0, 8)}...{resolvedAddress.slice(-6)}
                  </p>
                )}
                {addressError && (
                  <p className="text-xs text-red-500 ml-1 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    {addressError}
                  </p>
                )}
              </div>

              {/* Comment (Optional) */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400 ml-1 flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" />
                  Comment (Optional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a message to your transaction..."
                  className="bg-[#111] border-[#222] text-white placeholder:text-gray-600 rounded-xl focus:border-blue-500/50 transition-all resize-none h-20"
                  maxLength={120}
                />
                <p className="text-xs text-gray-500 text-right">{comment.length}/120</p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm text-gray-400">Amount</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {selectedAsset?.balance} {selectedAsset?.symbol}
                    </span>
                    <button 
                      onClick={handleMaxAmount}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase"
                    >
                      Max
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className={`bg-[#111] border-[#222] h-14 pl-4 pr-20 text-2xl font-bold text-white placeholder:text-gray-700 rounded-xl transition-all ${
                      insufficientFunds ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500/50'
                    }`}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-right">
                    <div className="text-sm font-bold text-white">{selectedAsset?.symbol}</div>
                    {amount && selectedAsset?.priceUsd && (
                      <div className="text-xs text-gray-500">
                        ≈ ${(parseFloat(amount) * selectedAsset.priceUsd).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
                {insufficientFunds ? (
                  <p className="text-xs text-red-500 ml-1 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Insufficient funds. You have {selectedAsset?.balance} {selectedAsset?.symbol} available.
                  </p>
                ): needMinimum ? (
                  <p className="text-xs text-yellow-400 ml-1 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                    Min 0.01 {selectedAsset?.symbol}
                  </p>
                ) : null}
              </div>

              <Button
                onClick={handleContinue}
                disabled={!recipient || !resolvedAddress || !amount || parseFloat(amount) <= 0 || isEstimating || insufficientFunds || isResolvingAddress}
                className="w-full h-14 bg-white text-black hover:bg-gray-200 rounded-xl font-bold text-lg mt-8"
              >
                {isEstimating ? (
                  <div className="flex items-center gap-2">
                    <ButtonLoader />
                    Estimating Fee...
                  </div>
                ) : (
                  "Continue"
                )}
              </Button>
            </motion.div>
          )}

          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {USE_TESTNET && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-yellow-500 shrink-0" />
                  <span className="text-xs text-yellow-400 font-medium">Testnet Mode - For testing only</span>
                </div>
              )}
              
              <Card className="bg-[#111] border-[#222] overflow-hidden">
                <CardContent className="p-6 space-y-6">
                  <div className="text-center space-y-1">
                    <div className="text-sm text-gray-400">Sending</div>
                    <div className="text-3xl font-bold text-white">
                      {amount} <span className="text-blue-400">{selectedAsset?.symbol}</span>
                    </div>
                    {amount && selectedAsset?.priceUsd && (
                      <div className="text-sm text-gray-500">
                        ≈ ${(parseFloat(amount) * selectedAsset.priceUsd).toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[#222]">
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-gray-400">To</span>
                      <div className="text-right flex-1 pl-8">
                        {isDomainAddress ? (
                          <div>
                            <div className="text-sm font-medium text-blue-400">{recipient}</div>
                            <div className="text-xs font-mono text-gray-500 break-all mt-1">
                              {resolvedAddress.slice(0, 12)}...{resolvedAddress.slice(-8)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-mono text-white break-all">{resolvedAddress}</div>
                        )}
                      </div>
                    </div>

                    {comment.trim() && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Comment
                        </span>
                        <div className="text-right flex-1 pl-8">
                          <div className="text-sm text-gray-300 italic">&ldquo;{comment.trim()}&rdquo;</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Network Fee</span>
                      <span className="text-sm text-white">≈ {estimatedFee} TON</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">QC Service Fee ({QC_SERVICE_FEE_PERCENT}%)</span>
                      <span className="text-sm text-white">{serviceFee} {selectedAsset?.symbol}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-[#333]">
                      <span className="text-sm text-gray-400 font-medium">Total Fees</span>
                      <span className="text-sm text-orange-400 font-bold">
                        {selectedAsset?.type === "ton" 
                          ? `${(parseFloat(serviceFee) + parseFloat(estimatedFee)).toFixed(6)} TON`
                          : `${parseFloat(serviceFee).toFixed(6)} ${selectedAsset?.symbol} + ${estimatedFee} TON`
                        }
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-400 font-medium">Recipient receives</span>
                      <span className="text-sm text-green-400 font-bold">
                        {selectedAsset?.type === "ton"
                          ? `${(parseFloat(amount) - parseFloat(serviceFee) - parseFloat(estimatedFee)).toFixed(6)} TON`
                          : `${(parseFloat(amount) - parseFloat(serviceFee)).toFixed(6)} ${selectedAsset?.symbol}`
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-400/90 leading-relaxed">
                  Please verify the recipient address carefully. Transactions on the blockchain are irreversible.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setStep("input")}
                  className="h-14 bg-[#111] border-[#333] text-white hover:bg-[#1a1a1a] rounded-xl font-bold"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmSend}
                  disabled={isSending}
                  className="h-14 bg-white text-black hover:bg-gray-200 rounded-xl font-bold"
                >
                  {isSending ? (
                    <div className="flex items-center gap-2">
                      <ButtonLoader />
                      Sending...
                    </div>
                  ) : (
                    "Confirm & Send"
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 space-y-6"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-white">Processing Transaction</h2>
                <p className="text-gray-400 text-sm">Please wait while we broadcast your transaction...</p>
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-10 space-y-6"
            >
              <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
                <Check className="w-12 h-12 text-green-500" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Transaction Sent!</h2>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                  Your transaction has been successfully broadcasted to the network.
                </p>
              </div>
              
              <div className="w-full pt-8">
                <Button
                  onClick={() => router.push("/wallet")}
                  className="w-full h-14 bg-white text-black hover:bg-gray-200 rounded-xl font-bold"
                >
                  Back to Wallet
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Biometric/PIN Authentication Modal */}
      <BiometricAuth
        isOpen={isAuthOpen}
        onSuccess={handleAuthSuccess}
        onCancel={handleAuthCancel}
        title="Confirm Transaction"
        description={`Authenticate to send ${amount} ${selectedAsset?.symbol || ''} to ${recipient ? recipient.slice(0, 8) + '...' : 'recipient'}`}
      />
    </div>
  );
}
