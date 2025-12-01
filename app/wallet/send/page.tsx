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
import { toNano, Address, beginCell, fromNano } from "@ton/core";
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
    }
  };

  const handleMaxAmount = () => {
    if (selectedAsset) {
      setAmount(selectedAsset.balance);
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
      return false;
    }
    return true;
  };

  const estimateFee = async () => {
    setIsEstimating(true);
    try {
      // Try to estimate via TON API emulation
      try {
        const emulateResponse = await fetch(`https://tonapi.io/v2/wallet/emulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            boc: "", // Would need actual BOC for real emulation
            params: [{ address: walletAddress }]
          })
        });
        
        if (emulateResponse.ok) {
          const emulateData = await emulateResponse.json();
          if (emulateData.trace?.transaction?.total_fees) {
            const feeInTon = parseFloat(fromNano(emulateData.trace.transaction.total_fees));
            setEstimatedFee(feeInTon.toFixed(6));
          }
        }
      } catch {
        // If emulation fails, use estimated values based on transaction type
        const baseFee = selectedAsset?.type === "ton" ? 0.005 : 0.05;
        setEstimatedFee(baseFee.toFixed(6));
      }

      // Calculate QC service fee
      const qcFee = (parseFloat(amount) * QC_SERVICE_FEE_PERCENT / 100);
      setServiceFee(qcFee.toFixed(6));

      setStep("confirm");
    } catch (error) {
      console.error("Fee estimation failed", error);
      // Fallback to default estimates
      const baseFee = selectedAsset?.type === "ton" ? 0.005 : 0.05;
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

      // QC Treasury address for service fees
      const QC_TREASURY_ADDRESS = Address.parse("UQBo9RblcXn3KHK18mEGcKUQbzc5OsUfMXi2J6xxB9tCIuDr");

      if (selectedAsset?.type === "ton") {
        // Calculate amounts: recipient gets amount, QC gets service fee
        const recipientAmount = parseFloat(amount);
        const qcFeeAmount = parseFloat(serviceFee);
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
        // For jettons, send the amount to recipient (service fee would need separate handling)
        const jettonAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, selectedAsset.decimals)));
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
      analyticsEvents.transactionSigningFailed(
        error instanceof Error ? error.message : "Transaction failed"
      );
      
      toast.error("Transaction failed");
      setStep("confirm");
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
                    className="bg-[#111] border-[#222] h-14 pl-4 pr-20 text-2xl font-bold text-white placeholder:text-gray-700 rounded-xl focus:border-blue-500/50 transition-all"
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
              </div>

              <Button
                onClick={handleContinue}
                disabled={!recipient || !amount || parseFloat(amount) <= 0 || isEstimating}
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
                    <div className="text-sm text-gray-400">You are sending</div>
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
                      <span className="text-sm text-gray-400 font-medium">Total Deducted</span>
                      <span className="text-sm text-white font-bold">
                        {(parseFloat(amount) + parseFloat(serviceFee) + (selectedAsset?.type === "ton" ? parseFloat(estimatedFee) : 0)).toFixed(6)} {selectedAsset?.symbol}
                        {selectedAsset?.type !== "ton" && ` + ${estimatedFee} TON`}
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
