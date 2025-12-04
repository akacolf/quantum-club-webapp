"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { 
  Settings, 
  RefreshCw, 
  FlaskConical, 
  Copy, 
  Check, 
  LogOut, 
  Eye, 
  EyeOff, 
  Send, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  History,
  Plus,
  Download,
  ShieldAlert
} from "lucide-react";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Loader from "@/app/(components)/Loader";
import { mnemonicNew, mnemonicToWalletKey } from "@ton/crypto";
import { WalletContractV5R1 } from "@ton/ton";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import { useWallet } from "./WalletContext";
import { DeletePin } from "@/components/ui/biometric-auth";

export default function WalletPage() {
  const router = useRouter();
  const { MainQuantAmount } = useGameContext();
  const { 
    walletAddress, 
    setWalletAddress: setContextWalletAddress,
    tonBalance, 
    tonUsdValue, 
    totalUsdBalance, 
    jettons,
    isLoadingAssets, 
    hasFetched,
    hideBalance,
    isTestnet,
    fetchWalletAssets,
    toggleHideBalance
  } = useWallet();
  const { telegramId } = useGameContext();

  const [hasWallet, setHasWallet] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const storedWallet = localStorage.getItem("quantum_wallet_address");
    
    if (storedWallet) {
      setContextWalletAddress(storedWallet);
      setHasWallet(true);
    }
    setIsChecking(false);
  }, [setContextWalletAddress]);

  const createWallet = async () => {
    setIsLoading(true);
    try {
      const mnemonic = await mnemonicNew(24);
      const keyPair = await mnemonicToWalletKey(mnemonic);
      const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      const address = wallet.address.toString({ bounceable: false, testOnly: isTestnet });
      sessionStorage.setItem("pending_wallet_mnemonic", mnemonic.join(" "));
      sessionStorage.setItem("pending_wallet_address", address);
      router.push("/wallet/backup");
    } catch (error) {
      console.error("Wallet creation error:", error);
      toast.error("Failed to create wallet. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const walletExit = () => { 
    localStorage.removeItem("quantum_wallet_address");
    localStorage.removeItem("quantum_wallet_mnemonic");
    setHasWallet(false);
    setContextWalletAddress("");
    DeletePin(telegramId||"");
  }
  if (isChecking) {
    return <Loader />;
  }

  if (!hasWallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 w-full">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md text-center space-y-8"
        >
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="pt-10 pb-8 px-6 flex flex-col items-center gap-6">
              <div className="w-24 h-24 bg-[#222] rounded-3xl flex items-center justify-center border border-[#333]">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" className="text-gray-400">
                  <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
                    <path d="M21.1 8.004q-.085-.005-.181-.004h-2.525c-2.068 0-3.837 1.628-3.837 3.75s1.77 3.75 3.837 3.75h2.525q.096.001.182-.004a1.755 1.755 0 0 0 1.645-1.628c.004-.06.004-.125.004-.185V9.817c0-.06 0-.125-.004-.185a1.755 1.755 0 0 0-1.645-1.628m-2.928 4.746c.532 0 .963-.448.963-1s-.431-1-.963-1c-.533 0-.964.448-.964 1s.431 1 .964 1" />
                    <path d="M20.918 17a.22.22 0 0 1 .221.278c-.2.712-.519 1.32-1.03 1.83c-.749.75-1.698 1.081-2.87 1.239c-1.14.153-2.595.153-4.433.153h-2.112c-1.838 0-3.294 0-4.433-.153c-1.172-.158-2.121-.49-2.87-1.238c-.748-.749-1.08-1.698-1.238-2.87C2 15.099 2 13.644 2 11.806v-.112C2 9.856 2 8.4 2.153 7.26c.158-1.172.49-2.121 1.238-2.87c.749-.748 1.698-1.08 2.87-1.238C7.401 3 8.856 3 10.694 3h2.112c1.838 0 3.294 0 4.433.153c1.172.158 2.121.49 2.87 1.238c.511.512.83 1.119 1.03 1.831a.22.22 0 0 1-.221.278h-2.524c-2.837 0-5.337 2.24-5.337 5.25s2.5 5.25 5.337 5.25zM5.75 7a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5z" />
                  </g>
                </svg>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-2xl font-bold text-white">QC Wallet</h3>
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">
                    BETA
                  </Badge>
                </div>
                <p className="text-gray-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                  The official wallet of Quantum Club. Secure, fast, and built for the future.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-3 w-full">
            <Button
              onClick={createWallet}
              disabled={isLoading}
              className="w-full bg-white text-black hover:bg-gray-200 h-12 rounded-xl font-semibold text-base shadow-lg shadow-white/5"
            >
              {isLoading ? (
                <ButtonLoader />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Wallet
                </>
              )}
            </Button>
            
            <Link href="/wallet/import" className="block w-full">
              <Button
                variant="outline"
                className="w-full bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222] border-[#333] h-12 rounded-xl font-semibold text-base"
              >
                <Download className="w-4 h-4 mr-2" />
                Import Existing Wallet
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchWalletAssets();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 space-y-6">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full"
      >
        <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border-[#333] rounded-3xl relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
          
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-black/40 rounded-full px-3 py-1.5 border border-white/5">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-gray-300">
                    {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={copyAddress} 
                    className="ml-1 h-5 w-5 p-0 text-gray-500 hover:text-white hover:bg-transparent"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-8 w-8 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 rounded-full disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/wallet/settings")}
                  className="h-8 w-8 bg-[#222] text-gray-400 hover:bg-[#333] hover:text-white rounded-full"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => walletExit()}
                  className="h-8 w-8 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500 rounded-full"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Total Balance</span>
                {isTestnet && (
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-orange-500/20 text-[10px] py-0 px-1.5 h-5">
                    <FlaskConical className="w-3 h-3 mr-1" />
                    TESTNET
                  </Badge>
                )}
                <button 
                  onClick={toggleHideBalance}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {hideBalance ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="flex items-baseline gap-1">
                {isLoadingAssets ? (
                  <Skeleton className="h-10 w-32 bg-[#222]" />
                ) : (
                  <h2 className="text-4xl font-bold text-white tracking-tight">
                    {hideBalance ? "••••••" : `$${totalUsdBalance}`}
                  </h2>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-8">
              {[
                { icon: <Send className="w-5 h-5" />, label: "Send", href: "/wallet/send" },
                { icon: <ArrowDownLeft className="w-5 h-5" />, label: "Receive", href: "/wallet/receive" },
                { icon: <ArrowLeftRight className="w-5 h-5" />, label: "Swap", onClick: () => {}, disabled: true },
                { icon: <History className="w-5 h-5" />, label: "History", href: "/wallet/history" },
              ].map((action, i) => {
                const ButtonContent = () => (
                  <>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                      action.disabled 
                        ? 'bg-[#222] text-gray-600' 
                        : 'bg-[#222] text-gray-400 group-hover:bg-[#333] group-hover:text-white group-hover:scale-105 shadow-lg shadow-black/20'
                    }`}>
                      {action.icon}
                    </div>
                    <span className={`text-xs font-medium transition-colors ${
                      action.disabled ? 'text-gray-600' : 'text-gray-500 group-hover:text-gray-300'
                    }`}>
                      {action.label}
                    </span>
                  </>
                );

                if (action.href) {
                  return (
                    <Link 
                      key={i}
                      href={action.href}
                      prefetch={true}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <ButtonContent />
                    </Link>
                  );
                }

                return (
                  <button 
                    key={i} 
                    onClick={action.onClick} 
                    disabled={action.disabled}
                    className={`flex flex-col items-center gap-2 group ${action.disabled ? 'cursor-not-allowed' : ''}`}
                  >
                    <ButtonContent />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="w-full space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-white">QNTM Balance</h3>
        </div>
        <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/5 border-orange-500/20 rounded-2xl shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center border border-orange-500/30 shadow-lg shadow-orange-500/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 32 32" className="text-white">
                    <path fill="currentColor" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">QNTM</h4>
                  <p className="text-xs text-gray-400">In-app currency</p>
                </div>
              </div>
              <div className="text-right">
                <h4 className="font-bold text-orange-400 text-xl">{MainQuantAmount}</h4>
                <p className="text-xs text-gray-500">QC Points</p>
              </div>
            </div>
            <Link href="/wallet/send-qntm" className="block w-full">
              <Button 
                className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-bold hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4 mr-2" />
                Send QNTM
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="w-full bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
        <p className="text-xs text-yellow-500/90 leading-relaxed">
          This wallet only supports TON assets. Sending other tokens may result in permanent loss.
        </p>
      </div>

      <div className="w-full space-y-4 pb-24">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-white">Assets</h3>
        </div>
        <div className="space-y-3">
          <Card className="bg-[#111] border-[#222] rounded-2xl shadow-none hover:bg-[#161616] transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="text-white">
                    <path fill="currentColor" d="m20.661 7.22l-7.846 12.494a1.06 1.06 0 0 1-1.794-.006L3.328 7.214A2.2 2.2 0 0 1 3 6.05a2.29 2.29 0 0 1 2.324-2.255h13.362C19.963 3.794 21 4.8 21 6.044c0 .413-.116.82-.339 1.175M5.218 6.8l5.723 8.826V5.912H5.816c-.592 0-.857.392-.598.89m7.84 8.826L18.783 6.8c.265-.497-.006-.89-.599-.89H13.06z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-white">TON</h4>
                  <p className="text-xs text-gray-500">Toncoin</p>
                </div>
              </div>
              <div className="text-right">
                {isLoadingAssets ? (
                  <div className="space-y-1 flex flex-col items-end">
                    <Skeleton className="h-5 w-24 bg-[#222]" />
                    <Skeleton className="h-3 w-16 bg-[#222]" />
                  </div>
                ) : (
                  <>
                    <h4 className="font-bold text-white">{hideBalance ? "••••" : tonBalance}</h4>
                    <p className="text-xs text-gray-500">{hideBalance ? "••••" : `$${tonUsdValue}`}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {(isLoadingAssets || !hasFetched) && jettons.length === 0 && (
            <>
              {[1, 2].map((i) => (
                <Card key={i} className="bg-[#111] border-[#222] rounded-2xl shadow-none">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full bg-[#222]" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-14 bg-[#222]" />
                        <Skeleton className="h-3 w-20 bg-[#222]" />

                      </div>
                    </div>
                    <div className="space-y-1.5 flex flex-col items-end">
                      <Skeleton className="h-4 w-16 bg-[#222]" />
                      <Skeleton className="h-3 w-10 bg-[#222]" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {!isLoadingAssets && hasFetched && jettons.length === 0 && (
            <div className="py-8 text-center bg-[#111] rounded-2xl border border-[#222] border-dashed">
              <p className="text-sm text-gray-500">Tokens will appear here automatically.</p>
            </div>
          )}

          {jettons.map((jetton, index) => {
            const formattedBalance = (parseFloat(jetton.balance) / Math.pow(10, jetton.decimals)).toFixed(4);
            const usdDisplay = jetton.usdValue && jetton.usdValue > 0 ? `$${jetton.usdValue.toFixed(2)}` : "~";
            return (
              <Card key={index} className="bg-[#111] border-[#222] rounded-2xl shadow-none hover:bg-[#161616] transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#222] rounded-full flex items-center justify-center overflow-hidden border border-[#333]">
                      {jetton.image ? (
                        <Image src={jetton.image} alt={jetton.symbol} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <span className="text-white text-xs font-bold">{jetton.symbol.slice(0, 2)}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{jetton.symbol}</h4>
                      <p className="text-xs text-gray-500 truncate max-w-[120px]">{jetton.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right min-w-[80px]">
                      <h4 className="font-bold text-white">{hideBalance ? "••••" : formattedBalance}</h4>
                      <p className="text-xs text-gray-500">{hideBalance ? "••••" : usdDisplay}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );
}