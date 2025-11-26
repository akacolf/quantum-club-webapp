"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback, ChangeEvent } from "react";
import toast from "react-hot-toast";
import QRCode from "react-qr-code";
import { Copy, Check, Eye, EyeOff, ShieldAlert, ArrowLeft, RefreshCw, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mnemonicNew, mnemonicToWalletKey, mnemonicValidate, mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { fromNano, toNano, Address, beginCell } from "@ton/core";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";

interface WalletSectionProps {
  mainQuantAmount: string;
}

interface JettonBalance {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  image?: string;
  usdValue?: number;
  priceUsd?: number;
  jettonAddress?: string;
  walletAddress?: string;
}

interface SendableAsset {
  type: "ton" | "jetton";
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  image?: string;
  jettonAddress?: string;
  walletAddress?: string;
}

export default function WalletSection({ 
  mainQuantAmount 
}: WalletSectionProps) {
  const [hasWallet, setHasWallet] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"main" | "import" | "backup" | "receive" | "send">("main");
  const [seedPhrase, setSeedPhrase] = useState<string[]>(Array(24).fill(""));
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string[]>([]);
  
  // Send states
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("0");
  const [selectedAsset, setSelectedAsset] = useState<SendableAsset | null>(null);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendMnemonic, setSendMnemonic] = useState<string[]>(Array(24).fill(""));
  const [sendStep, setSendStep] = useState<"details" | "confirm" | "mnemonic">("details");
  const [isRevealed, setIsRevealed] = useState(false);
  
  // Asset states
  const [tonBalance, setTonBalance] = useState("0");
  const [tonUsdValue, setTonUsdValue] = useState("0.00");
  const [totalUsdBalance, setTotalUsdBalance] = useState("0.00");
  const [jettons, setJettons] = useState<JettonBalance[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [tonPrice, setTonPrice] = useState(0);

  // Fetch TON price
  const fetchTonPrice = useCallback(async () => {
    try {
      const response = await fetch("https://tonapi.io/v2/rates?tokens=ton&currencies=usd");
      if (response.ok) {
        const data = await response.json();
        const price = data.rates?.TON?.prices?.USD || 0;
        setTonPrice(price);
        return price;
      }
    } catch (error) {
      console.error("Failed to fetch TON price:", error);
    }
    return 0;
  }, []);

  // Fetch wallet assets (TON balance + Jettons)
  const fetchWalletAssets = useCallback(async (address: string) => {
    if (!address) return;
    
    setIsLoadingAssets(true);
    try {
      // Fetch TON price first
      const price = await fetchTonPrice();
      
      // Fetch TON balance using TON API
      let tonUsd = 0;
      const balanceResponse = await fetch(`https://tonapi.io/v2/accounts/${address}`);
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        const balanceInNano = balanceData.balance || "0";
        const balanceInTon = fromNano(balanceInNano);
        setTonBalance(parseFloat(balanceInTon).toFixed(4));
        
        // Calculate USD value
        tonUsd = parseFloat(balanceInTon) * price;
        setTonUsdValue(tonUsd.toFixed(2));
      }

      // Fetch Jettons (tokens) balance with USD prices
      let jettonsUsdTotal = 0;
      const jettonsResponse = await fetch(`https://tonapi.io/v2/accounts/${address}/jettons?currencies=usd`);
      if (jettonsResponse.ok) {
        const jettonsData = await jettonsResponse.json();
        const jettonBalances: JettonBalance[] = (jettonsData.balances || []).map((jetton: { 
          balance: string;
          wallet_address?: { address?: string };
          price?: {
            prices?: { USD?: number };
          };
          jetton: { 
            address?: string;
            symbol?: string; 
            name?: string; 
            decimals?: number; 
            image?: string;
          } 
        }) => {
          const decimals = jetton.jetton?.decimals || 9;
          const rawBalance = parseFloat(jetton.balance || "0");
          const actualBalance = rawBalance / Math.pow(10, decimals);
          const priceUsd = jetton.price?.prices?.USD || 0;
          const usdValue = actualBalance * priceUsd;
          
          jettonsUsdTotal += usdValue;
          
          return {
            symbol: jetton.jetton?.symbol || "Unknown",
            name: jetton.jetton?.name || "Unknown Token",
            balance: jetton.balance || "0",
            decimals: decimals,
            image: jetton.jetton?.image,
            usdValue: usdValue,
            priceUsd: priceUsd,
            jettonAddress: jetton.jetton?.address,
            walletAddress: jetton.wallet_address?.address,
          };
        });
        setJettons(jettonBalances);
      }
      
      // Set total USD balance (TON + all Jettons)
      setTotalUsdBalance((tonUsd + jettonsUsdTotal).toFixed(2));
    } catch (error) {
      console.error("Failed to fetch wallet assets:", error);
    } finally {
      setIsLoadingAssets(false);
      setHasFetched(true);
    }
  }, [fetchTonPrice]);

  useEffect(() => {
    // Check if wallet exists in local storage
    const storedWallet = localStorage.getItem("quantum_wallet_address");
    if (storedWallet) {
      setWalletAddress(storedWallet);
      setHasWallet(true);
    }
    setIsChecking(false);
  }, []);

  // Fetch assets when wallet address is available
  useEffect(() => {
    if (walletAddress && hasWallet) {
      fetchWalletAssets(walletAddress);
    }
  }, [walletAddress, hasWallet, fetchWalletAssets]);

  const createWallet = async () => {
    setIsLoading(true);
    try {
      // Generate a new 24-word mnemonic
      const mnemonic = await mnemonicNew(24);
      setGeneratedMnemonic(mnemonic);
      
      // Derive keypair from mnemonic
      const keyPair = await mnemonicToWalletKey(mnemonic);
      
      // Create wallet contract (V5R1 is the latest version)
      const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      
      // Get the wallet address
      const address = wallet.address.toString({ bounceable: false });
      
      // Store the address (NOT the mnemonic - user must back it up themselves)
      localStorage.setItem("quantum_wallet_address", address);
      setWalletAddress(address);
      
      // Show backup screen
      setView("backup");
      setIsLoading(false);
    } catch (error) {
      console.error("Wallet creation error:", error);
      toast.error("Failed to create wallet. Please try again.");
      setIsLoading(false);
    }
  };

  const confirmBackup = () => {
    setHasWallet(true);
    setView("main");
    setGeneratedMnemonic([]);
    toast.success("Wallet created successfully!");
  };

  const copyMnemonic = () => {
    if (generatedMnemonic.length > 0) {
      navigator.clipboard.writeText(generatedMnemonic.join(" "));
      toast.success("Recovery phrase copied! Store it safely.");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImport = async () => {
    setIsLoading(true);
    
    // Basic validation - check all fields are filled
    const cleanedPhrase = seedPhrase.map(word => word.trim().toLowerCase());
    if (cleanedPhrase.some(word => !word)) {
      toast.error("Please fill in all 24 words");
      setIsLoading(false);
      return;
    }

    try {
      // Validate the mnemonic phrase
      const isValid = await mnemonicValidate(cleanedPhrase);
      if (!isValid) {
        toast.error("Invalid recovery phrase.");
        setIsLoading(false);
        return;
      }

      // Derive keypair from the imported mnemonic
      const keyPair = await mnemonicToWalletKey(cleanedPhrase);
      
      // Create wallet contract (V5R1)
      const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      
      // Get the wallet address
      const address = wallet.address.toString({ bounceable: false });
      
      localStorage.setItem("quantum_wallet_address", address);
      setWalletAddress(address);
      setHasWallet(true);
      setSeedPhrase(Array(24).fill(""));
      setIsLoading(false);
      toast.success("Wallet imported successfully!");
      setView("main");
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import wallet. Please try again.");
      setIsLoading(false);
    }
  };

  const handleWordChange = (index: number, value: string) => {
    const newPhrase = [...seedPhrase];
    newPhrase[index] = value;
    setSeedPhrase(newPhrase);
  };

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get list of sendable assets (TON + Jettons)
  const getSendableAssets = useCallback((): SendableAsset[] => {
    const assets: SendableAsset[] = [
      {
        type: "ton",
        symbol: "TON",
        name: "Toncoin",
        balance: tonBalance,
        decimals: 9,
        image: "https://ton.org/download/ton_symbol.png",
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
      });
    });
    
    return assets;
  }, [tonBalance, jettons]);

  // Open send view
  const openSendView = () => {
    const assets = getSendableAssets();
    setSelectedAsset(assets[0]); // Default to TON
    setSendRecipient("");
    setSendAmount("");
    setSendMnemonic(Array(24).fill(""));
    setSendStep("details");
    setView("send");
  };

  // Handle send mnemonic word change
  const handleSendMnemonicChange = (index: number, value: string) => {
    const newMnemonic = [...sendMnemonic];
    newMnemonic[index] = value;
    setSendMnemonic(newMnemonic);
  };

  // Validate send inputs
  const validateSendInputs = (): boolean => {
    if (!sendRecipient.trim()) {
      toast.error("Please enter a recipient address");
      return false;
    }
    
    try {
      Address.parse(sendRecipient.trim());
    } catch {
      toast.error("Invalid recipient address");
      return false;
    }
    
    if (!sendAmount || parseFloat(sendAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return false;
    }
    
    if (!selectedAsset) {
      toast.error("Please select an asset");
      return false;
    }
    
    const balance = parseFloat(selectedAsset.balance);
    const amount = parseFloat(sendAmount);
    
    if (amount > balance) {
      toast.error("Insufficient balance");
      return false;
    }
    
    // For TON, ensure user keeps some for gas
    if (selectedAsset.type === "ton" && amount > balance - 0.01) {
      toast.error("Keep at least 0.01 TON for transaction fees");
      return false;
    }
    
    return true;
  };

  // Execute send transaction
  const executeSend = async () => {
    const cleanedMnemonic = sendMnemonic.map(word => word.trim().toLowerCase());
    
    if (cleanedMnemonic.some(word => !word)) {
      toast.error("Please fill in all 24 words of your recovery phrase");
      return;
    }

    setIsSending(true);
    
    try {
      // Validate the mnemonic
      const isValid = await mnemonicValidate(cleanedMnemonic);
      if (!isValid) {
        toast.error("Invalid recovery phrase");
        setIsSending(false);
        return;
      }

      // Initialize TonApi client
      const ta = new TonApiClient({
        baseUrl: "https://tonapi.io",
      });

      // Create adapter for contract interactions
      const adapter = new ContractAdapter(ta);

      // Get keypair from mnemonic
      const keyPair = await mnemonicToPrivateKey(cleanedMnemonic);

      // Create wallet contract
      const wallet = WalletContractV5R1.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });

      // Verify the wallet address matches
      const derivedAddress = wallet.address.toString({ bounceable: false });
      if (derivedAddress !== walletAddress) {
        toast.error("Recovery phrase does not match this wallet");
        setIsSending(false);
        return;
      }

      const contract = adapter.open(wallet);
      const seqno = await contract.getSeqno();
      const recipient = Address.parse(sendRecipient.trim());

      if (selectedAsset?.type === "ton") {
        // Send TON
        await contract.sendTransfer({
          seqno,
          secretKey: keyPair.secretKey,
          sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
          messages: [
            internal({
              to: recipient,
              value: toNano(sendAmount),
              body: "",
              bounce:false
            }),
          ],
        });
      } else if (selectedAsset?.type === "jetton" && selectedAsset.walletAddress) {
        // Send Jetton
        const jettonAmount = BigInt(Math.floor(parseFloat(sendAmount) * Math.pow(10, selectedAsset.decimals)));
        const jettonWallet = Address.parse(selectedAsset.walletAddress);

        const jettonTransferPayload = beginCell()
          .storeUint(0xf8a7ea5, 32) // JETTON_TRANSFER_OP_CODE
          .storeUint(0, 64) // Query ID
          .storeCoins(jettonAmount) // Amount
          .storeAddress(recipient) // Recipient
          .storeAddress(wallet.address) // Response address
          .storeBit(false) // No custom payload
          .storeCoins(BigInt(1)) // Forward fee
          .storeMaybeRef(undefined)
          .endCell();

        await contract.sendTransfer({
          seqno,
          secretKey: keyPair.secretKey,
          sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
          messages: [
            internal({
              to: jettonWallet,
              value: toNano("0.05"), // Gas fee for jetton transfer
              body: jettonTransferPayload,
              bounce:false
            }),
          ],
        });
      }
      toast.success("Transaction sent successfully!");
      
      // Reset and go back
      setSendMnemonic(Array(24).fill(""));
      setSendRecipient("");
      setSendAmount("");
      setSelectedAsset(null);
      setSendStep("details");
      setView("main");
      
      // Refresh balances after a delay
      setTimeout(() => {
        fetchWalletAssets(walletAddress);
      }, 3000);
      
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send transaction. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasWallet) {
    // Backup screen after wallet creation
    if (view === "backup" && generatedMnemonic.length > 0) {
      return (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/95 z-50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-lg"
          >
            <Card className="bg-[#111] border-[#333] text-white shadow-2xl overflow-hidden">
              <CardHeader className="pb-4 text-center border-b border-[#222] bg-[#151515]">
                <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-3 ring-1 ring-blue-500/20">
                  <ShieldAlert className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-xl font-bold">Secret Recovery Phrase</CardTitle>
                <CardDescription className="text-gray-400 max-w-xs mx-auto mt-2 text-sm">
                  This is the only way to recover your wallet. Write it down and keep it safe.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 pt-6">
                <div className="relative group">
                  <ScrollArea className="h-60 rounded-xl border border-[#222] bg-[#0a0a0a]">
                    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 transition-all duration-500 ${!isRevealed ? 'blur-md select-none opacity-50' : 'opacity-100'}`}>
                      {generatedMnemonic.map((word, i) => (
                        <div key={i} className="flex items-center space-x-2 bg-[#151515] border border-[#2a2a2a] rounded-md px-3 py-2">
                          <span className="text-[10px] font-mono text-gray-600 w-4 select-none">{i + 1}.</span>
                          <span className="text-sm font-medium text-gray-200 font-mono">{word}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  {!isRevealed && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <Button 
                        onClick={() => setIsRevealed(true)}
                        variant="secondary"
                        className="bg-[#222] border border-[#333] text-white hover:bg-[#333] shadow-xl"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Reveal Phrase
                      </Button>
                    </div>
                  )}
                  
                  {isRevealed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsRevealed(false)}
                      className="absolute -top-3 -right-3 text-gray-500 hover:text-white h-8 w-8 p-0 bg-[#111] rounded-full border border-[#333]"
                    >
                      <EyeOff className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={copyMnemonic}
                    variant="outline"
                    className="w-full bg-[#1a1a1a] border-[#333] text-gray-300 hover:text-white hover:bg-[#222] h-11 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "Copied to Clipboard" : "Copy to Clipboard"}
                  </Button>

                  <Button
                    onClick={confirmBackup}
                    className="w-full bg-white text-black hover:bg-gray-200 h-11 font-bold transition-all"
                  >
                    I Saved My Phrase
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    if (view === "import") {
      return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/90 p-4 backdrop-blur-sm pt-8 sm:items-center sm:pt-0">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-lg my-auto"
          >
            <Card className="bg-[#111] border-[#333] text-white shadow-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-[#222] bg-[#151515]">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setView("main");
                    setSeedPhrase(Array(24).fill(""));
                  }}
                  className="text-gray-400 hover:text-white hover:bg-[#222]"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <CardTitle className="text-xl font-bold">Import Wallet</CardTitle>
                <div className="w-10" /> {/* Spacer for centering */}
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <ScrollArea className="h-64 pr-4 -mr-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pl-1 py-1 pr-4">
                    {seedPhrase.map((word, i) => (
                      <div key={i} className="relative group">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 select-none pointer-events-none font-mono">
                          {i + 1}.
                        </span>
                        <Input
                          type="text"
                          value={word}
                          onChange={(e) => handleWordChange(i, e.target.value)}
                          className="bg-[#1a1a1a] border-[#333] pl-7 pr-2 text-white focus-visible:ring-blue-500/50 h-8 text-xs font-medium transition-all focus:bg-[#222]"
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Button
                  onClick={handleImport}
                  disabled={isLoading}
                  className="w-full bg-white text-black hover:bg-gray-200 py-3 h-10 rounded-xl font-bold transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 shadow-lg shadow-white/5 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (
                    <ButtonLoader />
                  ) : (
                    "Import"
                  )}
                </Button>

                <p className="text-[10px] text-center text-gray-500">
                  Only TON wallets are supported.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 w-full">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md text-center space-y-6"
        >
          <div className="w-24 h-24 bg-linear-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mx-auto border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="3.5em"
              height="3.5em"
              viewBox="0 0 24 24"
              className="text-blue-400"
            >
              <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
                <path d="M21.1 8.004q-.085-.005-.181-.004h-2.525c-2.068 0-3.837 1.628-3.837 3.75s1.77 3.75 3.837 3.75h2.525q.096.001.182-.004a1.755 1.755 0 0 0 1.645-1.628c.004-.06.004-.125.004-.185V9.817c0-.06 0-.125-.004-.185a1.755 1.755 0 0 0-1.645-1.628m-2.928 4.746c.532 0 .963-.448.963-1s-.431-1-.963-1c-.533 0-.964.448-.964 1s.431 1 .964 1" />
                <path d="M20.918 17a.22.22 0 0 1 .221.278c-.2.712-.519 1.32-1.03 1.83c-.749.75-1.698 1.081-2.87 1.239c-1.14.153-2.595.153-4.433.153h-2.112c-1.838 0-3.294 0-4.433-.153c-1.172-.158-2.121-.49-2.87-1.238c-.748-.749-1.08-1.698-1.238-2.87C2 15.099 2 13.644 2 11.806v-.112C2 9.856 2 8.4 2.153 7.26c.158-1.172.49-2.121 1.238-2.87c.749-.748 1.698-1.08 2.87-1.238C7.401 3 8.856 3 10.694 3h2.112c1.838 0 3.294 0 4.433.153c1.172.158 2.121.49 2.87 1.238c.511.512.83 1.119 1.03 1.831a.22.22 0 0 1-.221.278h-2.524c-2.837 0-5.337 2.24-5.337 5.25s2.5 5.25 5.337 5.25zM5.75 7a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5z" />
              </g>
            </svg>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-white">Quantum Club Wallet</h3>
            <p className="text-gray-400 text-sm max-w-[280px] mx-auto leading-relaxed">
              The official TON wallet of Quantum Club. Secure, fast, and built for the future.
            </p>
          </div>
          
          <div className="space-y-3 w-full">
            <Button
              onClick={createWallet}
              disabled={isLoading}
              className="w-full bg-white text-black hover:bg-gray-200 py-3 h-auto rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-white/10 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <ButtonLoader />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="1.4em" height="1.4em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Create New Wallet
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setView("import")}
              className="w-full bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222] py-3 h-auto rounded-xl font-medium transition-all border border-[#333] flex items-center justify-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1.4em" height="1.4em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              Import Existing Wallet
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }
  const sendAmountHandle = (e:ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value.replace(',', '.');
      const re = /^\d*\.?\d*$/;
      if(!isNaN(Number(inputValue))){
      if(Number(inputValue)>=0)
      {
        if (inputValue === '' || re.test(inputValue)) {
          setSendAmount(inputValue);
        }
    }
    }
  };
  // Main wallet view
  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 space-y-6">
      {/* Header Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full bg-linear-to-br from-[#1a1a1a] to-[#111] border border-[#333] rounded-3xl p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-2 bg-black/40 rounded-full px-3 py-1.5 border border-white/5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-gray-300">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={copyAddress} 
              className="ml-1 h-auto w-auto p-0 text-gray-500 hover:text-white hover:bg-transparent"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost"
              size="icon"
              onClick={() => fetchWalletAssets(walletAddress)}
              disabled={isLoadingAssets}
              className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-400 rounded-full"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingAssets ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost"
              size="icon"
              onClick={() => {
                localStorage.removeItem("quantum_wallet_address");
                setHasWallet(false);
                setWalletAddress("");
                setView("main");
                setSeedPhrase(Array(24).fill(""));
                setGeneratedMnemonic([]);
                setTonBalance("0");
                setTonUsdValue("0.00");
                setTotalUsdBalance("0.00");
                setJettons([]);
              }}
              className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </Button>
          </div>
        </div>

        <div className="space-y-1 relative z-10">
          <span className="text-gray-400 text-sm">Total Balance</span>
          <div className="flex items-baseline gap-1">
            {isLoadingAssets ? (
              <Skeleton className="h-10 w-32 bg-[#222]" />
            ) : (
              <h2 className="text-4xl font-bold text-white">${totalUsdBalance}</h2>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-6 relative z-10">
          {[
            { icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>, label: "Send", onClick: openSendView },
            { icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>, label: "Receive", onClick: () => setView("receive") },
            { icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>, label: "Swap", onClick: () => {} },
            { icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>, label: "History", onClick: () => {} },
          ].map((action, i) => (
            <button key={i} onClick={action.onClick} className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 bg-[#222] rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#333] group-hover:text-white transition-all">
                {action.icon}
              </div>
              <span className="text-xs text-gray-500 group-hover:text-gray-300">{action.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* TON Network Warning */}
      <div className="w-full bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500 mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p className="text-xs text-yellow-500/90 leading-relaxed">
          This wallet only supports TON assets. Sending other tokens may result in permanent loss.
        </p>
      </div>

      {/* Assets List */}
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-white">Assets</h3>
        </div>
        <div className="space-y-3">
          {/* TON Asset */}
          <Card className="bg-[#111] border border-[#222] rounded-2xl shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
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
                    <h4 className="font-bold text-white">{tonBalance}</h4>
                    <p className="text-xs text-gray-500">${tonUsdValue}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* QNTM Asset */}
          <Card className="bg-[#111] border border-[#222] rounded-2xl shadow-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center border border-[#333]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32" className="text-white">
                    <path fill="currentColor" d="M27.328 12.036c-2.912-1.239-6.823-2.041-11-2.26a32 32 0 0 0-1.932-.057c3.088-3.771 6.401-6.303 8.583-6.385q.644-.022 1.084.26c.943.615 1.203 2.36.724 4.787c-.052.333.161.661.479.724a.61.61 0 0 0 .724-.479c.599-3.041.156-5.131-1.255-6.052c-.505-.333-1.12-.491-1.803-.464c-2.729.104-6.583 3.068-10.12 7.631a35 35 0 0 0-4.307.38c-.86-3.865-.521-6.636.792-7.303c.181-.099.38-.145.609-.167c.932-.072 2.213.527 3.615 1.693c.26.213.645.187.859-.079a.606.606 0 0 0-.077-.859c-1.683-1.391-3.229-2.073-4.496-1.98a3 3 0 0 0-1.072.292c-1.589.812-2.224 3.104-1.828 6.453c.093.692.213 1.416.391 2.156c-4.376.875-7.161 2.631-7.281 4.833c-.084 1.563 1.151 3.047 3.572 4.297a.61.61 0 0 0 .824-.265a.607.607 0 0 0-.267-.824c-1.932-.995-2.973-2.115-2.911-3.14c.068-1.443 2.364-2.923 6.349-3.708a36 36 0 0 0 1.4 4.119c-1.359 2.516-2.344 4.996-2.848 7.199c-.751 3.287-.349 5.631 1.145 6.599c.479.312 1.036.469 1.661.469c1.245 0 2.755-.615 4.464-1.833a.611.611 0 1 0-.71-.995c-2.057 1.473-3.791 1.963-4.749 1.337c-1.011-.661-1.235-2.588-.609-5.301c.421-1.849 1.208-3.907 2.276-6.027q.4.875.839 1.751c1.901 3.729 4.229 6.968 6.547 9.131c1.849 1.719 3.568 2.615 4.979 2.615c.469 0 .907-.1 1.303-.297c1.525-.781 2.188-2.948 1.864-6.099c-.296-2.953-1.411-6.548-3.14-10.136a.614.614 0 0 0-.812-.287a.614.614 0 0 0-.292.819c3.583 7.468 3.839 13.583 1.828 14.609c-2.125 1.088-7.235-3.141-11.188-10.907a36 36 0 0 1-1.203-2.573c.453-.807.932-1.625 1.464-2.437a44 44 0 0 1 1.629-2.328h.527c.719 0 1.5.016 2.312.063c8.703.459 14.631 3.416 14.511 5.781c-.052 1.02-1.235 2.052-3.235 2.828a.612.612 0 0 0 .443 1.14c2.541-.984 3.937-2.339 4.016-3.905c.093-1.772-1.557-3.48-4.667-4.803v-.011zm-16.557.563a39 39 0 0 0-1.016 1.661a31 31 0 0 1-.963-2.953a33 33 0 0 1 3.077-.323a33 33 0 0 0-1.093 1.615v-.015zm5.234 1.568c-2.443 0-2.443 3.667 0 3.667c2.448 0 2.448-3.667 0-3.667" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-white">QNTM</h4>
                  <p className="text-xs text-gray-500">Quantum Club</p>
                </div>
              </div>
              <div className="text-right">
                <h4 className="font-bold text-white">{mainQuantAmount}</h4>
                <p className="text-xs text-gray-500">~</p>
              </div>
            </CardContent>
          </Card>

          {/* Jettons (Other Tokens) - Loading Skeletons */}
          {(isLoadingAssets || !hasFetched) && jettons.length === 0 && (
            <>
              {[1, 2].map((i) => (
                <Card key={i} className="bg-[#111] border border-[#222] rounded-2xl shadow-none">
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
            <div className="py-4 text-center">
              <p className="text-xs text-gray-500">Tokens will appear here automatically.</p>
            </div>
          )}

          {jettons.map((jetton, index) => {
            const formattedBalance = (parseFloat(jetton.balance) / Math.pow(10, jetton.decimals)).toFixed(4);
            const usdDisplay = jetton.usdValue && jetton.usdValue > 0 ? `$${jetton.usdValue.toFixed(2)}` : "~";
            return (
              <Card key={index} className="bg-[#111] border border-[#222] rounded-2xl shadow-none">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#222] rounded-full flex items-center justify-center overflow-hidden border border-[#333]">
                      {jetton.image ? (
                        <img src={jetton.image} alt={jetton.symbol} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">{jetton.symbol.slice(0, 2)}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{jetton.symbol}</h4>
                      <p className="text-xs text-gray-500 truncate max-w-[120px]">{jetton.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-white">{formattedBalance}</h4>
                    <p className="text-xs text-gray-500">{usdDisplay}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Receive View (QR Code + Address) */}
      {view === "receive" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-md mt-12"
          >
            <Card className="bg-[#111] border-[#333] text-white shadow-2xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-[#222] bg-[#151515]">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setView("main")}
                  className="text-gray-400 hover:text-white hover:bg-[#222]"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <CardTitle className="text-xl font-bold">Receive TON</CardTitle>
                <div className="w-10" /> {/* Spacer for centering */}
              </CardHeader>
              
              <CardContent className="flex flex-col items-center space-y-6 pt-8 pb-8">
                <div className="p-4 bg-white rounded-2xl shadow-lg shadow-white/5">
                  <QRCode 
                    value={walletAddress} 
                    size={200}
                    level="H"
                    className="w-full h-full"
                  />
                </div>

                <div className="w-full space-y-2 text-center">
                  <p className="text-sm text-gray-400">Your Wallet Address</p>
                  <div 
                    onClick={copyAddress}
                    className="bg-[#1a1a1a] border border-[#333] rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#222] transition-colors group"
                  >
                    <p className="text-xs text-gray-300 font-mono break-all text-left flex-1">
                      {walletAddress}
                    </p>
                    <div className="text-gray-500 group-hover:text-white transition-colors">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                <div className="w-full bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-3">
                  <ShieldAlert className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-500/90 leading-relaxed text-left">
                    Send only TON and TON-based tokens (Jettons) to this address. Sending other assets may result in permanent loss.
                  </p>
                </div>

                <Button
                  onClick={copyAddress}
                  className="w-full bg-white text-black hover:bg-gray-200 h-11 font-bold transition-all"
                >
                  {copied ? "Address Copied" : "Copy Address"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Send View Modal */}
      {view === "send" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md"
          >
            <Card className="bg-[#111] border-[#333] rounded-t-3xl rounded-b-none overflow-hidden max-h-[85vh] flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-[#222] bg-[#151515]">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    if (sendStep === "mnemonic") {
                      setSendStep("details");
                    } else {
                      setView("main");
                      setSendRecipient("");
                      setSendAmount("");
                      setSelectedAsset(null);
                      setSendMnemonic(Array(24).fill(""));
                      setSendStep("details");
                    }
                  }}
                  className="text-gray-400 hover:text-white hover:bg-[#222]"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <CardTitle className="text-xl font-bold">
                  {sendStep === "mnemonic" ? "Confirm Transaction" : "Send"}
                </CardTitle>
                <div className="w-10" />
              </CardHeader>
              
              <CardContent className="flex flex-col space-y-6 pt-6 pb-8 overflow-y-auto">
                {sendStep === "details" && (
                  <>
                    {/* Asset Selector */}
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Asset</label>
                      <div className="relative">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl h-14 px-4 text-white hover:bg-[#222] hover:border-[#444] transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 font-medium justify-between"
                            >
                              <div className="flex items-center gap-3">
                                {selectedAsset?.image ? (
                                  <img src={selectedAsset.image} alt={selectedAsset.symbol} className="w-8 h-8 rounded-full" />
                                ) : (
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                    {selectedAsset?.symbol?.slice(0, 2) || "TO"}
                                  </div>
                                )}
                                <div className="flex flex-col items-start">
                                  <span className="font-bold text-sm">{selectedAsset?.symbol || "TON"}</span>
                                  <span className="text-xs text-gray-500 font-normal">
                                    {selectedAsset?.balance || "0"} Available
                                  </span>
                                </div>
                              </div>
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-[320px] sm:w-[400px] bg-[#1a1a1a] border-[#333] text-white z-60">
                            <DropdownMenuLabel className="text-gray-400 text-xs uppercase tracking-wider">Select Asset</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-[#333]" />
                            {getSendableAssets().map((asset) => (
                              <DropdownMenuItem
                                key={asset.symbol}
                                onSelect={() => setSelectedAsset(asset)}
                                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#222] focus:bg-[#222] focus:text-white"
                              >
                                {asset.image ? (
                                  <img src={asset.image} alt={asset.symbol} className="w-8 h-8 rounded-full" />
                                ) : (
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                    {asset.symbol.slice(0, 2)}
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm">{asset.symbol}</span>
                                  <span className="text-xs text-gray-500">{asset.balance} Available</span>
                                </div>
                                {selectedAsset?.symbol === asset.symbol && (
                                  <Check className="w-4 h-4 ml-auto text-blue-500" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Recipient Address */}
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Recipient Address</label>
                      <div className="relative">
                        <Input
                          value={sendRecipient}
                          onChange={(e) => setSendRecipient(e.target.value)}
                          placeholder="Enter TON address"
                          className="bg-[#1a1a1a] border-[#333] rounded-xl h-14 pl-4 pr-12 text-white placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-mono text-sm"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              setSendRecipient(text);
                              toast.success("Pasted from clipboard");
                            } catch {
                              toast.error("Failed to read clipboard");
                            }
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-gray-500 hover:text-white hover:bg-[#333] rounded-lg"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </Button>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            Available: {selectedAsset?.balance || "0"} {selectedAsset?.symbol}
                          </span>
                          <button
                            onClick={() => {
                              if (selectedAsset) {
                                if (selectedAsset.type === "ton") {
                                  const maxAmount = Math.max(0, parseFloat(selectedAsset.balance) - 0.01);
                                  setSendAmount(maxAmount.toFixed(4));
                                } else {
                                  setSendAmount(selectedAsset.balance);
                                }
                              }
                            }}
                            className="text-[10px] font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-2 py-0.5 rounded transition-colors uppercase"
                          >
                            Max
                          </button>
                        </div>
                      </div>
                      
                      <div className="relative group">
                        <Input
                          type="number"
                          value={sendAmount}
                          onChange={sendAmountHandle}
                          min={0}
                          placeholder="0.00"
                          className="bg-[#1a1a1a] border-[#333] rounded-xl h-14 pl-4 pr-20 text-lg font-bold text-white placeholder:text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end pointer-events-none">
                          <span className="text-sm font-bold text-gray-400">
                            {selectedAsset?.symbol || "TON"}
                          </span>
                          {sendAmount && parseFloat(sendAmount) > 0 && selectedAsset && (
                            <span className="text-xs text-gray-600">
                              ≈ ${selectedAsset.type === "ton" 
                                ? (parseFloat(sendAmount) * tonPrice).toFixed(2)
                                : (() => {
                                    const jetton = jettons.find(j => j.symbol === selectedAsset.symbol);
                                    return jetton?.priceUsd 
                                      ? (parseFloat(sendAmount) * jetton.priceUsd).toFixed(2) 
                                      : "0.00";
                                  })()
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-blue-400">Double Check Address</p>
                        <p className="text-[11px] text-blue-400/70 leading-relaxed">
                          Blockchain transactions are irreversible. Ensure the recipient address is correct and on the TON network.
                        </p>
                      </div>
                    </div>

                    {/* Continue Button */}
                    <Button
                      onClick={() => {
                        if (validateSendInputs()) {
                          setSendStep("mnemonic");
                        }
                      }}
                      disabled={!sendRecipient || !sendAmount || parseFloat(sendAmount) <= 0}
                      className="w-full bg-white text-black hover:bg-gray-200 h-14 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5 mt-4"
                    >
                      Continue
                    </Button>
                  </>
                )}

                {sendStep === "mnemonic" && (
                  <>
                    {/* Transaction Summary */}
                    <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between pb-4 border-b border-[#2a2a2a]">
                        <span className="text-sm text-gray-400">Sending Asset</span>
                        <div className="flex items-center gap-2">
                          {selectedAsset?.image && (
                            <img src={selectedAsset.image} alt="" className="w-5 h-5 rounded-full" />
                          )}
                          <span className="text-white font-bold">{selectedAsset?.symbol}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pb-4 border-b border-[#2a2a2a]">
                        <span className="text-sm text-gray-400">Amount</span>
                        <div className="text-right">
                          <div className="text-white font-bold text-lg">{sendAmount} {selectedAsset?.symbol}</div>
                          <div className="text-xs text-gray-500">
                            ≈ ${selectedAsset?.type === "ton" 
                                ? (parseFloat(sendAmount) * tonPrice).toFixed(2)
                                : (() => {
                                    const jetton = jettons.find(j => j.symbol === selectedAsset?.symbol);
                                    return jetton?.priceUsd 
                                      ? (parseFloat(sendAmount) * jetton.priceUsd).toFixed(2) 
                                      : "0.00";
                                  })()
                              } USD
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Recipient</span>
                        <div className="flex items-center gap-2 bg-[#111] px-3 py-1.5 rounded-lg border border-[#2a2a2a]">
                          <span className="text-white font-mono text-xs">{sendRecipient.slice(0, 6)}...{sendRecipient.slice(-6)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Mnemonic Input */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Confirm with Recovery Phrase</label>
                        <button
                          onClick={() => setIsRevealed(!isRevealed)}
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {isRevealed ? "Hide" : "Show"}
                        </button>
                      </div>
                      
                      <ScrollArea className="h-48 rounded-xl border border-[#333] bg-[#0a0a0a] p-1">
                        <div className="grid grid-cols-2 gap-1 p-2">
                          {sendMnemonic.map((word, index) => (
                            <div key={index} className="relative flex items-center group">
                              <span className="absolute left-2 text-[10px] text-gray-600 font-mono w-4 text-right select-none">{index + 1}.</span>
                              <Input
                                type={isRevealed ? "text" : "password"}
                                value={word}
                                onChange={(e) => handleSendMnemonicChange(index, e.target.value)}
                                className="h-9 text-xs bg-[#151515] border-[#2a2a2a] rounded-lg pl-8 pr-2 focus:bg-[#1a1a1a] focus:border-blue-500/50 transition-all"
                                placeholder={`Word ${index + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Warning */}
                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 flex items-start gap-3">
                      <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-400/90 leading-relaxed text-left">
                        Never share your recovery phrase. We ask for it here only to sign the transaction locally on your device.
                      </p>
                    </div>

                    {/* Send Button */}
                    <Button
                      onClick={executeSend}
                      disabled={isSending || sendMnemonic.some(word => !word.trim())}
                      className="w-full bg-white text-black hover:bg-gray-200 h-14 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
                    >
                      {isSending ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          Sending Transaction...
                        </div>
                      ) : (
                        "Confirm & Send"
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
