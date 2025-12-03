"use client";

import { useState, useEffect, useMemo, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { Check, ChevronDown, Wallet, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  
  // Biometric authentication hook
  const { isOpen: isAuthOpen, requestAuth, handleSuccess: handleAuthSuccess, handleCancel: handleAuthCancel } = useBiometricAuth();
  
  // Use shared wallet context
  const { 
    walletAddress,
    tonBalance, 
    tonPrice, 
    jettons, 
    isLoadingAssets: isContextLoading,
    hasFetched,
    fetchWalletAssets 
  } = useWallet();

  // QC Service fee (0.5%)
  const QC_SERVICE_FEE_PERCENT = 0.5;

  // Send State
  const [step, setStep] = useState<"input" | "confirm" | "processing" | "success">("input");
  const [selectedAsset, setSelectedAsset] = useState<SendableAsset | null>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [estimatedFee, setEstimatedFee] = useState("0.01");
  const [serviceFee, setServiceFee] = useState("0");
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [needMinimum, setNeedMinimum] = useState(false);

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
      // Simply set the full balance as the amount
      // Fees will be shown and deducted on the confirmation screen
      setAmount(selectedAsset.balance);
      setInsufficientFunds(false);
    }
  };

  const validateInput = () => {
    if (!recipient) {
      toast.error("Please enter a recipient address");
      return false;
    }
    try {
      Address.parse(recipient);
    } catch {
      toast.error("Invalid recipient address");
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

      const ta = new TonApiClient({ baseUrl: "https://tonapi.io" });
      const adapter = new ContractAdapter(ta);
      const contract = adapter.open(wallet);
      const toAddress = Address.parse(recipient.trim());
      const QC_TREASURY_ADDRESS = Address.parse("UQBUSXMd54HOJlmmh4TsuMvIcwB91kkIlz6HTgj62dN43S3U");
      
      // Calculate QC service fee first
      const qcFeeAmount = parseFloat(amount) * QC_SERVICE_FEE_PERCENT / 100;
      setServiceFee(qcFeeAmount.toFixed(6));

      let networkFee: number;

      if (selectedAsset?.type === "ton") {
        const totalAmount = parseFloat(amount);
        // Reserve 0.02 TON for fees initially (will be refined)
        const estimatedReserve = 0.02;
        const recipientAmount = totalAmount - qcFeeAmount - estimatedReserve;
        
        if (recipientAmount <= 0) {
          throw new Error("Amount too small");
        }

        // Build actual messages for emulation
        const messages = [
          internal({
            to: toAddress,
            value: toNano(recipientAmount.toFixed(9)),
            body: "",
            bounce: false
          }),
        ];
        
        if (qcFeeAmount > 0.000001) {
          messages.push(
            internal({
              to: QC_TREASURY_ADDRESS,
              value: toNano(qcFeeAmount.toFixed(9)),
              body: "QC Service Fee",
              bounce: false
            })
          );
        }

        // Get current seqno for accurate estimation
        let seqno = 0;
        try {
          seqno = await contract.getSeqno();
        } catch {
          // New wallet, seqno is 0
        }

        // Create the actual transfer for emulation
        const transfer = wallet.createTransfer({
          seqno,
          secretKey: keyPair.secretKey,
          sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
          messages,
        });

        // Build external message for emulation
        const externalMessage = beginCell()
          .storeWritable((builder) => {
            builder.storeUint(0b10, 2); // ext_in_msg_info
            builder.storeUint(0, 2); // src -> addr_none
            builder.storeAddress(wallet.address); // dest
            builder.storeCoins(0); // import_fee
          })
          .storeBuilder(
            beginCell()
              .storeBit(false) // no state init
              .storeBit(true) // body is a reference
              .storeRef(transfer)
          )
          .endCell();

        // Use TON API emulation to get accurate fee
        try {
          const emulateResponse = await fetch(
            `https://tonapi.io/v2/emulation/emulateMessageToTrace`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                boc: externalMessage.toBoc().toString("base64"),
                ignore_signature_check: true
              })
            }
          );

          if (emulateResponse.ok) {
            const emulateData = await emulateResponse.json();
            // Extract total fee from the trace
            // The "extra" field in transaction contains the fee info
            const transactions = emulateData.transactions || [];
            let totalFees = 0;
            
            for (const tx of transactions) {
              // Each transaction has compute_phase and action_phase fees
              const computeFee = tx.compute_phase?.gas_fees || 0;
              const storageFee = tx.storage_phase?.storage_fees_collected || 0;
              const actionFee = tx.action_phase?.total_action_fees || 0;
              totalFees += computeFee + storageFee + actionFee;
            }
            
            // Convert from nanoTON to TON
            networkFee = totalFees / 1e9;
            
            // If emulation returned 0 or very small, use calculated fallback
            if (networkFee < 0.001) {
              // Calculate based on message count
              // Base compute: ~5000 gas = ~0.002 TON
              // Forward fee per message: ~0.001 TON
              // Action fee: ~0.0005 TON per message
              const messageCount = messages.length;
              networkFee = 0.002 + (messageCount * 0.0015);
            }
            
            // Add 15% buffer for network fluctuations
            networkFee = networkFee * 1.15;
          } else {
            throw new Error("Emulation failed");
          }
        } catch (emulationError) {
          console.warn("Emulation failed, using calculated fee:", emulationError);
          // Fallback: Calculate based on TON fee formula
          // transaction_fee = storage_fees + compute_fees + action_fees + fwd_fees
          //
          // For a simple transfer:
          // - Compute: ~5000 gas × 0.0000004 TON/gas = ~0.002 TON
          // - Forward: lump_price (0.0004) + message fees (~0.0001) = ~0.0005 TON per message
          // - Action: ~1/3 of forward fee = ~0.00017 TON per message
          //
          // For 2 messages (recipient + treasury):
          // Total: 0.002 + (2 × 0.0005) + (2 × 0.00017) ≈ 0.0033 TON
          const messageCount = messages.length;
          const computeFee = 0.002;
          const forwardFeePerMessage = 0.0006;
          const actionFeePerMessage = 0.0002;
          networkFee = computeFee + (messageCount * (forwardFeePerMessage + actionFeePerMessage));
          // Add 20% buffer for safety
          networkFee = networkFee * 1.2;
        }
        
        // Ensure minimum fee of 0.003 TON
        networkFee = Math.max(networkFee, 0.003);
        // Cap at reasonable maximum
        networkFee = Math.min(networkFee, 0.025);
        
      } else {
        // Jetton transfer - more complex, higher fees
        // Jetton transfers involve multiple contract calls:
        // 1. User wallet -> Jetton wallet (compute + forward)
        // 2. Jetton wallet -> Recipient jetton wallet (internal transfer)
        // 3. Notification to recipient
        // Total: typically 0.04-0.06 TON
        networkFee = 0.05;
        
        // Add extra for complex jetton contracts or unusual decimals
        if (selectedAsset?.decimals && selectedAsset.decimals < 6) {
          networkFee += 0.01;
        }
      }
      
      setEstimatedFee(networkFee.toFixed(6));
      setStep("confirm");
    } catch (error) {
      console.error("Fee estimation failed", error);
      // Fallback to safe default estimates
      const baseFee = selectedAsset?.type === "ton" ? 0.008 : 0.06;
      setEstimatedFee(baseFee.toFixed(6));
      const qcFee = (parseFloat(amount) * QC_SERVICE_FEE_PERCENT / 100);
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

  // Handle confirm button - requires biometric/PIN authentication
  const handleConfirmSend = async () => {
    // Track that transaction was sent for signature
    analyticsEvents.transactionSentForSignature(
      walletAddress || "",
      [{ address: recipient, amount: amount }]
    );

    // Request biometric/PIN authentication
    const authenticated = await requestAuth();
    
    if (authenticated) {
      // User authenticated successfully, execute the transaction
      await executeSend();
    } else {
      // User cancelled authentication
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

      const ta = new TonApiClient({ baseUrl: "https://tonapi.io" });
      const adapter = new ContractAdapter(ta);
      const contract = adapter.open(wallet);
      const seqno = await contract.getSeqno();
      const toAddress = Address.parse(recipient.trim());

      // QC Treasury address for service fees (quantumclub.ton)
      const QC_TREASURY_ADDRESS = Address.parse("UQBUSXMd54HOJlmmh4TsuMvIcwB91kkIlz6HTgj62dN43S3U");

      if (selectedAsset?.type === "ton") {
        // Calculate amounts:
        // User sends: amount (total from balance)
        // Service fee: goes to QC treasury
        // Network fee: deducted by network automatically
        // Recipient gets: amount - serviceFee - networkFee
        const totalAmount = parseFloat(amount);
        const qcFeeAmount = parseFloat(serviceFee);
        const networkFeeAmount = parseFloat(estimatedFee);
        const recipientAmount = totalAmount - qcFeeAmount - networkFeeAmount;
        
        if (recipientAmount <= 0) {
          toast.error("Amount too small to cover fees");
          setStep("input");
          setIsSending(false);
          return;
        }
        
        const messages = [
          internal({
            to: toAddress,
            value: toNano(recipientAmount.toFixed(9)),
            body: "",
            bounce: false
          }),
        ];
        
        // Add QC service fee transaction if fee is > 0
        if (qcFeeAmount > 0.000001) {
          messages.push(
            internal({
              to: QC_TREASURY_ADDRESS,
              value: toNano(qcFeeAmount.toFixed(9)),
              body: "QC Service Fee",
              bounce: false
            })
          );
        }

        await contract.sendTransfer({
          seqno,
          secretKey: keyPair.secretKey,
          sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
          messages,
        });
      } else if (selectedAsset?.type === "jetton" && selectedAsset.walletAddress) {
        // For jettons: recipient receives amount - serviceFee (network fee is in TON)
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
                <label className="text-sm text-gray-400 ml-1">Recipient Address</label>
                <div className="relative">
                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter TON address"
                    className="bg-[#111] border-[#222] h-14 pl-4 pr-10 text-white placeholder:text-gray-600 rounded-xl focus:border-blue-500/50 transition-all font-mono text-sm"
                  />
                  <Wallet className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                </div>
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
                disabled={!recipient || !amount || parseFloat(amount) <= 0 || isEstimating || insufficientFunds}
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
                        <div className="text-sm font-mono text-white break-all">{recipient}</div>
                      </div>
                    </div>
                    
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
