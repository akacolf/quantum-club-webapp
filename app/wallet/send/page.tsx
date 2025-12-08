"use client";

import { useState, useEffect, useMemo, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { Check, ChevronDown, Wallet, Info, MessageSquare, Loader2, ExternalLink } from "lucide-react";
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
import { useWallet, IS_TESTNET } from "../WalletContext";
import { analyticsEvents } from "@/lib/telegramAnalytics";
import { resolveTonAddress } from "@/lib/tonAddressResolver";

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

  const TON_API_BASE_URL = IS_TESTNET ? "https://testnet.tonapi.io" : "https://tonapi.io";

  const [step, setStep] = useState<"input" | "confirm" | "processing" | "success">("input");
  const [selectedAsset, setSelectedAsset] = useState<SendableAsset | null>(null);
  const [recipient, setRecipient] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [isDomainAddress, setIsDomainAddress] = useState(false);
  const [comment, setComment] = useState("");
  const [amount, setAmount] = useState("");
  const [estimatedFee, setEstimatedFee] = useState("0.005");
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [needMinimum, setNeedMinimum] = useState(false);
  const [isFirstTransaction, setIsFirstTransaction] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  // Deployment fee for first transaction (wallet contract deployment)
  const DEPLOYMENT_FEE = 0.005;

  // Explorer URL based on network
  const EXPLORER_BASE_URL = IS_TESTNET ? "https://testnet.tonviewer.com" : "https://tonviewer.com";
  const fetchHistory = async (address: string) => {
      if (!address) return;
      if(history.length > 0) return;

      try {
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
        setHistory(data.events || [])
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
              return;
          } else {
           return;
          }
        }
      }
    };
  // Resolve .ton domain addresses
  useEffect(() => {
    const resolveAddress = async () => {
      await fetchHistory(walletAddress)
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
        if(numValue < (history.length > 0 ? 0.01 : 0.052)) {
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
      // Set amount to full balance - fee will be deducted before sending
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
    
    // Check that amount doesn't exceed balance
    if (selectedAsset && parseFloat(amount) > parseFloat(selectedAsset.balance)) {
      toast.error("Insufficient balance");
      setInsufficientFunds(true);
      return false;
    }
    
    // For TON, check minimum after fee deduction
    if (selectedAsset?.type === "ton") {
      const sendAmount = parseFloat(amount);
      const estimatedFeeAmount = history.length > 0 ? 0.01 : 0.05; // Conservative estimate for fees
      const recipientWouldReceive = sendAmount - estimatedFeeAmount;
      
      if (recipientWouldReceive < 0.001) {
        toast.error("Amount too small - recipient would receive less than 0.001 TON after fees");
        return false;
      }
    }
    
    if (parseFloat(amount) < (history.length > 0 ? 0.01 : 0.05)) {
      toast.error(`Minimum send amount is ${history.length > 0 ? "0.01" : "0.05"} TON`);
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

      let networkFee: number;

      if (selectedAsset?.type === "ton") {
        // Direct P2P transfer
        const hasComment = comment.trim().length > 0;
        
        // Calculate network fee for single message
        networkFee = calculateNetworkFee(1, hasComment);
        networkFee = Math.max(networkFee, 0.003);
        
        // Build comment body if provided
        const messageBody = hasComment
          ? beginCell()
              .storeUint(0, 32)
              .storeStringTail(comment.trim())
              .endCell()
          : undefined;
        
        const messages = [
          internal({
            to: toAddress,
            value: toNano(amount),
            body: messageBody,
            bounce: false
          }),
        ];

        // Check if wallet is deployed by getting account state
        let seqno = 0;
        let isNewWallet = false;
        
        try {
          const state = await ta.accounts.getAccount(wallet.address);
          isNewWallet = state.status !== 'active';
          
          if (!isNewWallet) {
            seqno = await contract.getSeqno();
          }
        } catch {
          // If we can't get state, assume wallet is not deployed
          isNewWallet = true;
          seqno = 0;
        }
        
        // Track if this is first transaction for UI display
        setIsFirstTransaction(isNewWallet);

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
              networkFee = 0.005;
            }
            networkFee = networkFee * 1.15; // 15% buffer
          } else {
            throw new Error("Emulation failed");
          }
        } catch {
          // Fallback to calculated fee
          networkFee = calculateNetworkFee(1, hasComment);
        }
        
        networkFee = Math.max(networkFee, 0.003);
        networkFee = Math.min(networkFee, 0.02);
        
        // Add deployment fee for first transaction
        if (isNewWallet) {
          networkFee += DEPLOYMENT_FEE;
        }
        
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
      const hasComment = comment.trim().length > 0;
      const baseFee = selectedAsset?.type === "ton" 
        ? calculateNetworkFee(1, hasComment)
        : 0.06;
      setEstimatedFee(Math.max(baseFee, 0.003).toFixed(6));
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
      
      // Check if wallet is deployed by getting its state
      let seqno = 0;
      let isWalletDeployed = false;
      
      try {
        // Try to get the contract state to check if it's active
        const state = await ta.accounts.getAccount(wallet.address);
        isWalletDeployed = state.status === 'active';
        
        if (isWalletDeployed) {
          seqno = await contract.getSeqno();
        }
      } catch {
        // If we can't get state or seqno, assume wallet is not deployed
        isWalletDeployed = false;
        seqno = 0;
      }
      
      const toAddress = Address.parse(resolvedAddress);

      if (selectedAsset?.type === "ton") {
        // Calculate the actual amount recipient will receive (amount minus fees)
        const inputAmount = parseFloat(amount);
        const fee = parseFloat(estimatedFee);
        const recipientAmount = Math.max(0, inputAmount - fee);
        
        // Build comment body if provided
        const messageBody = comment.trim()
          ? beginCell()
              .storeUint(0, 32)
              .storeStringTail(comment.trim())
              .endCell()
          : undefined;
        
        // For first transaction with undeployed wallet, we need to manually send with StateInit
        if (!isWalletDeployed && seqno === 0) {
          // Create the transfer message
          const transfer = wallet.createTransfer({
            seqno: 0,
            secretKey: keyPair.secretKey,
            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
            messages: [
              internal({
                to: toAddress,
                value: toNano(recipientAmount.toFixed(9)),
                body: messageBody,
                bounce: false
              }),
            ],
          });
          
          // Build external message with StateInit for wallet deployment
          const externalMessage = beginCell()
            .storeWritable((builder) => {
              builder.storeUint(0b10, 2); // ext_in_msg_info$10
              builder.storeUint(0, 2); // src: addr_none$00
              builder.storeAddress(wallet.address); // dest
              builder.storeCoins(0); // import_fee
            })
            .storeBit(true) // state_init present
            .storeBit(true) // state_init in ref
            .storeRef(
              beginCell()
                .storeUint(0, 2) // split_depth = 0, special = 0
                .storeMaybeRef(wallet.init.code) // code
                .storeMaybeRef(wallet.init.data) // data
                .storeUint(0, 1) // library = 0
                .endCell()
            )
            .storeBit(true) // body in ref
            .storeRef(transfer)
            .endCell();
          
          // Send the external message via TonAPI
          const boc = externalMessage.toBoc().toString('base64');
          await fetch(`${TON_API_BASE_URL}/v2/blockchain/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boc })
          });
        } else {
          // Normal transfer for deployed wallet
          await contract.sendTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
            messages: [
              internal({
                to: toAddress,
                value: toNano(recipientAmount.toFixed(9)),
                body: messageBody,
                bounce: false
              }),
            ],
          });
        }
      } else if (selectedAsset?.type === "jetton" && selectedAsset.walletAddress) {
        // Jetton transfer - requires deployed wallet
        if (!isWalletDeployed) {
          throw new Error("Your wallet needs to have some TON first. Send TON to your wallet address to activate it, then try again.");
        }
        
        const sendAmount = parseFloat(amount);
        
        const jettonAmount = BigInt(Math.floor(sendAmount * Math.pow(10, selectedAsset.decimals)));
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

      // Store wallet address for explorer link (transaction will appear in account history)
      setLastTxHash(walletAddress || "");
      
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
                    Min {history.length > 0 ? "0.01" : "0.052"} {selectedAsset?.symbol}
                  </p>
                ) : null}
              </div>

              <Button
                onClick={handleContinue}
                disabled={!recipient || !resolvedAddress || !amount || parseFloat(amount) <= 0 || isEstimating || insufficientFunds || isResolvingAddress||needMinimum}
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
              {IS_TESTNET && (
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
                      <span className="text-sm text-gray-400">
                        Network Fee
                        {isFirstTransaction && (
                          <span className="text-xs text-yellow-500 ml-1">(incl. wallet activation)</span>
                        )}
                      </span>
                      <span className="text-sm text-white">≈ {estimatedFee} TON</span>
                    </div>
                    
                    {isFirstTransaction && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 -mx-1">
                        <p className="text-xs text-yellow-500/90 text-center">
                          First transaction includes one-time wallet activation fee
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2 border-t border-[#333]">
                      <span className="text-sm text-green-400 font-medium">Recipient receives</span>
                      <span className="text-sm text-green-400 font-bold">
                        {selectedAsset?.type === "ton" 
                          ? `${Math.max(0, parseFloat(amount) - parseFloat(estimatedFee)).toFixed(6)} TON`
                          : `${amount} ${selectedAsset?.symbol}`
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
              
              <div className="w-full space-y-3 pt-8">
                {lastTxHash && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(`${EXPLORER_BASE_URL}/${lastTxHash}`, "_blank")}
                    className="w-full h-12 bg-[#111] border-[#333] text-white hover:bg-[#1a1a1a] rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View in Explorer
                  </Button>
                )}
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
