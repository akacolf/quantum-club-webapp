"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  AlertTriangle,
  ExternalLink,
  Info,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import Loader from "@/app/(components)/Loader";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { useWallet } from "../WalletContext";
import {
  isValidEthAddress,
  isValidSolAddress,
  isValidTrxAddress,
  estimateEthGas,
  estimateSolFee,
  estimateTrxFee,
  sendEthTransaction,
  sendSolTransaction,
  sendTrxTransaction,
} from "../utils/multichain";

type SendableChain = "eth" | "sol" | "trx";

interface ChainOption {
  id: SendableChain;
  name: string;
  symbol: string;
  balance: number;
  usdValue: number;
  price: number;
  image: string;
  color: string;
  explorerUrl: string;
}

export default function SendMultichainPage() {
  useTelegramBackButton("/wallet");
  const router = useRouter();

  const {
    isOpen: isAuthOpen,
    requestAuth,
    handleSuccess: handleAuthSuccess,
    handleCancel: handleAuthCancel,
  } = useBiometricAuth();

  const {
    walletAddress,
    ethAddress,
    ethBalance,
    solBalance,
    trxBalance,
    ethUsdValue,
    solUsdValue,
    trxUsdValue,
    ethPrice,
    solPrice,
    trxPrice,
    fetchMultiChainBalances,
    isTestnet,
  } = useWallet();

  // State
  const [step, setStep] = useState<"input" | "confirm" | "processing" | "success">("input");
  const [selectedChain, setSelectedChain] = useState<SendableChain>("eth");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [estimatedFee, setEstimatedFee] = useState("0");
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [addressError, setAddressError] = useState("");

  // Chain options
  const chainOptions: ChainOption[] = useMemo(() => [
    {
      id: "eth",
      name: "Ethereum",
      symbol: "ETH",
      balance: ethBalance,
      usdValue: ethUsdValue,
      price: ethPrice,
      image: "/svg/eth-logo.svg",
      color: "#627EEA",
      explorerUrl: "https://etherscan.io/tx/",
    },
    {
      id: "sol",
      name: "Solana",
      symbol: "SOL",
      balance: solBalance,
      usdValue: solUsdValue,
      price: solPrice,
      image: "/svg/sol-logo.svg",
      color: "#9945FF",
      explorerUrl: "https://solscan.io/tx/",
    },
    {
      id: "trx",
      name: "TRON",
      symbol: "TRX",
      balance: trxBalance,
      usdValue: trxUsdValue,
      price: trxPrice,
      image: "/svg/trx-logo.svg",
      color: "#FF0013",
      explorerUrl: "https://tronscan.org/#/transaction/",
    },
  ], [ethBalance, ethUsdValue, ethPrice, solBalance, solUsdValue, solPrice, trxBalance, trxUsdValue, trxPrice]);

  const currentChain = chainOptions.find(c => c.id === selectedChain) || chainOptions[0];

  // Validate address based on chain
  useEffect(() => {
    if (!recipient.trim()) {
      setAddressError("");
      return;
    }

    const debounceTimer = setTimeout(() => {
      let isValid = false;
      switch (selectedChain) {
        case "eth":
          isValid = isValidEthAddress(recipient);
          break;
        case "sol":
          isValid = isValidSolAddress(recipient);
          break;
        case "trx":
          isValid = isValidTrxAddress(recipient);
          break;
      }

      if (!isValid && recipient.length > 10) {
        setAddressError(`Invalid ${currentChain.symbol} address`);
      } else {
        setAddressError("");
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [recipient, selectedChain, currentChain.symbol]);

  // Estimate fee when amount changes
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setEstimatedFee("0");
      return;
    }

    const estimateFee = async () => {
      setIsEstimating(true);
      try {
        let fee = "0";
        switch (selectedChain) {
          case "eth":
            const ethGas = await estimateEthGas(ethAddress, recipient || ethAddress, amount);
            fee = ethGas.estimatedFee;
            break;
          case "sol":
            fee = await estimateSolFee();
            break;
          case "trx":
            fee = await estimateTrxFee();
            break;
        }
        setEstimatedFee(fee);
      } catch (error) {
        console.error("Fee estimation error:", error);
      } finally {
        setIsEstimating(false);
      }
    };

    const debounce = setTimeout(estimateFee, 500);
    return () => clearTimeout(debounce);
  }, [amount, selectedChain, ethAddress, recipient]);

  // Check if funds are insufficient
  const insufficientFunds = useMemo(() => {
    const amountNum = parseFloat(amount) || 0;
    const feeNum = parseFloat(estimatedFee) || 0;
    return amountNum + feeNum > currentChain.balance;
  }, [amount, estimatedFee, currentChain.balance]);

  // USD value of amount
  const amountUsd = useMemo(() => {
    const amountNum = parseFloat(amount) || 0;
    return (amountNum * currentChain.price).toFixed(2);
  }, [amount, currentChain.price]);

  // Handle max button
  const handleMax = () => {
    const feeNum = parseFloat(estimatedFee) || 0;
    const maxAmount = Math.max(0, currentChain.balance - feeNum - 0.0001);
    setAmount(maxAmount.toFixed(6));
  };

  // Validate form
  const isFormValid = useMemo(() => {
    return (
      recipient.trim() !== "" &&
      !addressError &&
      parseFloat(amount) > 0 &&
      !insufficientFunds
    );
  }, [recipient, addressError, amount, insufficientFunds]);

  // Handle confirmation
  const handleConfirm = () => {
    if (!isFormValid) return;
    setStep("confirm");
  };

  // Handle send with biometric auth
  const handleSend = async () => {
    const mnemonic = localStorage.getItem("quantum_wallet_mnemonic");
    if (!mnemonic) {
      toast.error("Wallet not found");
      return;
    }

    setStep("processing");
    setIsSending(true);

    try {
      let result: { success: boolean; txHash?: string; error?: string };

      switch (selectedChain) {
        case "eth":
          result = await sendEthTransaction(mnemonic, recipient, amount);
          break;
        case "sol":
          result = await sendSolTransaction(mnemonic, recipient, amount);
          break;
        case "trx":
          result = await sendTrxTransaction(mnemonic, recipient, amount);
          break;
        default:
          throw new Error("Unsupported chain");
      }

      if (result.success && result.txHash) {
        setLastTxHash(result.txHash);
        setStep("success");
        toast.success("Transaction sent!");
        // Refresh balances
        setTimeout(() => fetchMultiChainBalances(), 3000);
      } else {
        throw new Error(result.error || "Transaction failed");
      }
    } catch (error) {
      console.error("Send error:", error);
      toast.error(error instanceof Error ? error.message : "Transaction failed");
      setStep("confirm");
    } finally {
      setIsSending(false);
    }
  };

  // Request biometric auth before sending
  const handleSendWithAuth = async () => {
    const authenticated = await requestAuth();
    if (authenticated) {
      await handleSend();
    }
  };

  // Redirect if no wallet or testnet
  useEffect(() => {
    if (!walletAddress) {
      router.push("/wallet");
    }
  }, [walletAddress, router]);

  // Show warning for testnet
  if (isTestnet) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="bg-[#111] border-[#222] rounded-2xl max-w-sm">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">Multi-chain Unavailable</h2>
            <p className="text-gray-400 text-sm mb-4">
              Multi-chain sending is only available on mainnet. Switch to mainnet in wallet settings.
            </p>
            <Button onClick={() => router.push("/wallet/settings")} className="w-full">
              Go to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!walletAddress) {
    return <Loader />;
  }

  // Success state
  if (step === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6"
        >
          <Check className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">Transaction Sent!</h2>
        <p className="text-gray-400 text-center mb-6">
          Your {currentChain.symbol} has been sent successfully
        </p>
        
        <Card className="bg-[#111] border-[#222] rounded-2xl w-full max-w-sm mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Amount</span>
              <span className="text-white font-medium">{amount} {currentChain.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">To</span>
              <span className="text-white font-mono text-xs">
                {recipient.slice(0, 8)}...{recipient.slice(-6)}
              </span>
            </div>
          </CardContent>
        </Card>

        {lastTxHash && (
          <Button
            variant="outline"
            onClick={() => window.open(`${currentChain.explorerUrl}${lastTxHash}`, "_blank")}
            className="mb-4 bg-[#1a1a1a] border-[#333] text-gray-300 hover:text-white"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Explorer
          </Button>
        )}

        <Button onClick={() => router.push("/wallet")} className="w-full max-w-sm">
          Back to Wallet
        </Button>
      </div>
    );
  }

  // Processing state
  if (step === "processing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Loader2 className="w-16 h-16 text-white animate-spin mb-6" />
        <h2 className="text-xl font-bold text-white mb-2">Sending Transaction</h2>
        <p className="text-gray-400 text-center">
          Please wait while your transaction is being processed...
        </p>
      </div>
    );
  }

  // Confirmation state
  if (step === "confirm") {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-md mx-auto space-y-6">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <h1 className="text-2xl font-bold text-white mb-1">Confirm Transaction</h1>
            <p className="text-gray-400 text-sm">Review your transaction details</p>
          </motion.div>

          <Card className="bg-[#111] border-[#222] rounded-2xl">
            <CardContent className="p-5 space-y-4">
              {/* Chain */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Network</span>
                <div className="flex items-center gap-2">
                  <Image src={currentChain.image} alt={currentChain.symbol} width={20} height={20} />
                  <span className="text-white font-medium">{currentChain.name}</span>
                </div>
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Amount</span>
                <div className="text-right">
                  <p className="text-white font-bold">{amount} {currentChain.symbol}</p>
                  <p className="text-gray-500 text-xs">${amountUsd}</p>
                </div>
              </div>

              {/* Recipient */}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">To</span>
                <span className="text-white font-mono text-xs">
                  {recipient.slice(0, 10)}...{recipient.slice(-8)}
                </span>
              </div>

              {/* Fee */}
              <div className="flex items-center justify-between pt-3 border-t border-[#222]">
                <span className="text-gray-400 text-sm">Network Fee</span>
                <span className="text-white font-medium">~{estimatedFee} {currentChain.symbol}</span>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Total</span>
                <span className="text-white font-bold">
                  {(parseFloat(amount) + parseFloat(estimatedFee)).toFixed(6)} {currentChain.symbol}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep("input")}
              className="flex-1 bg-[#1a1a1a] border-[#333] text-gray-300 hover:text-white h-12"
            >
              Back
            </Button>
            <Button
              onClick={handleSendWithAuth}
              disabled={isSending}
              className="flex-1 h-12 font-semibold"
            >
              {isSending ? <ButtonLoader /> : "Send"}
            </Button>
          </div>
        </div>

        <BiometricAuth
          isOpen={isAuthOpen}
          onSuccess={handleAuthSuccess}
          onCancel={handleAuthCancel}
        />
      </div>
    );
  }

  // Input state
  return (
    <div className="min-h-screen pb-24">
      <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full"
        >
          <h1 className="text-2xl font-bold text-white mb-1">Send Crypto</h1>
          <p className="text-gray-400 text-sm">Send ETH, SOL, or TRX to any address</p>
        </motion.div>

        {/* Chain Selector */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full"
        >
          <Label className="text-gray-400 text-sm mb-2 block">Select Network</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-14 bg-[#111] border-[#222] hover:bg-[#1a1a1a] justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <Image
                      src={currentChain.image}
                      alt={currentChain.symbol}
                      width={32}
                      height={32}
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">{currentChain.name}</p>
                    <p className="text-gray-500 text-xs">
                      Balance: {currentChain.balance.toFixed(4)} {currentChain.symbol}
                    </p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-md bg-[#111] border-[#222]">
              {chainOptions.map((chain) => (
                <DropdownMenuItem
                  key={chain.id}
                  onClick={() => {
                    setSelectedChain(chain.id);
                    setRecipient("");
                    setAmount("");
                    setAddressError("");
                  }}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#1a1a1a]"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <Image src={chain.image} alt={chain.symbol} width={32} height={32} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{chain.name}</p>
                    <p className="text-gray-500 text-xs">
                      {chain.balance.toFixed(4)} {chain.symbol}
                    </p>
                  </div>
                  {selectedChain === chain.id && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>

        {/* Recipient */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full"
        >
          <Label className="text-gray-400 text-sm mb-2 block">Recipient Address</Label>
          <Input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            placeholder={`Enter ${currentChain.symbol} address`}
            className="h-12 bg-[#111] border-[#222] text-white placeholder:text-gray-600 font-mono text-sm"
          />
          {addressError && (
            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {addressError}
            </p>
          )}
        </motion.div>

        {/* Amount */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full"
        >
          <div className="flex items-center justify-between mb-2">
            <Label className="text-gray-400 text-sm">Amount</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMax}
              className="text-xs text-blue-400 hover:text-blue-300 h-auto p-0"
            >
              MAX
            </Button>
          </div>
          <div className="relative">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-14 bg-[#111] border-[#222] text-white text-xl font-bold pr-20"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-gray-400 font-medium">{currentChain.symbol}</span>
            </div>
          </div>
          {amount && (
            <p className="text-gray-500 text-xs mt-1.5">≈ ${amountUsd} USD</p>
          )}
          {insufficientFunds && (
            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Insufficient funds (including fee)
            </p>
          )}
        </motion.div>

        {/* Fee Info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full"
        >
          <Card className="bg-[#111] border-[#222] rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Estimated Fee</span>
                  <Popover>
                    <PopoverTrigger>
                      <Info className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                    </PopoverTrigger>
                    <PopoverContent className="bg-[#1a1a1a] border-[#333] text-xs text-gray-300 max-w-[200px]">
                      Network fees are paid to validators to process your transaction.
                    </PopoverContent>
                  </Popover>
                </div>
                <span className="text-white font-medium">
                  {isEstimating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `~${estimatedFee} ${currentChain.symbol}`
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Warning */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full"
        >
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-500/90 leading-relaxed">
              Double-check the recipient address. {currentChain.symbol} transactions are irreversible.
            </p>
          </div>
        </motion.div>

        {/* Send Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full"
        >
          <Button
            onClick={handleConfirm}
            disabled={!isFormValid || isEstimating}
            className="w-full h-12 font-semibold text-base"
          >
            Continue
          </Button>
        </motion.div>
      </div>

      <BiometricAuth
        isOpen={isAuthOpen}
        onSuccess={handleAuthSuccess}
        onCancel={handleAuthCancel}
      />
    </div>
  );
}
