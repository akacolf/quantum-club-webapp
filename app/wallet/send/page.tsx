"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import { tonSendSchema, multiChainSendSchema } from "@/lib/validations";
import { env } from "@/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
import { getSecureMnemonic } from "@/lib/secure-mnemonic";
import { WalletContractV5R1, WalletContractV4, WalletContractV3R2, internal, SendMode } from "@ton/ton";
import { toNano, Address, beginCell, Cell } from "@ton/core";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { encryptComment as encryptCommentMessage, createTextComment } from "@/lib/ton-encrypted-comment";
import { useWallet } from "../WalletContext";
import { analyticsEvents } from "@/lib/telegramAnalytics";
import { resolveTonAddress } from "@/lib/tonAddressResolver";
import {
  isValidEthAddress,
  isValidSolAddress,
  isValidTrxAddress,
  isValidBtcAddress,
  estimateEthGas,
  estimateSolFee,
  estimateTrxFee,
  estimateBtcFee,
  sendEthTransaction,
  sendSolTransaction,
  sendTrxTransaction,
  sendBtcTransaction,
} from "../utils/multichain";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { tonApiGet, tonApiPost, sendBoc } from "@/lib/tonapi-client";

type NetworkMode = "ton" | "multichain";
type MultiChainType = "eth" | "sol" | "trx" | "btc";

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

interface MultiChainOption {
  id: MultiChainType;
  name: string;
  symbol: string;
  balance: number;
  usdValue: number;
  price: number;
  image: string;
  color: string;
  explorerUrl: string;
}

export default function SendPage() {
  useTelegramBackButton("/wallet");
  const router = useRouter();
  const {telegramId} = useUserContext()
  const { isOpen: isAuthOpen, requestAuth, handleSuccess: handleAuthSuccess, handleCancel: handleAuthCancel } = useBiometricAuth();

  // Telegram native QR scanner handler
  function openQRScanner() {
    const WebApp = window?.Telegram?.WebApp;

    if (WebApp?.showScanQrPopup) {
      WebApp.showScanQrPopup(
        { text: "Scan wallet address QR code" },
        (result: string) => {
          // Parse the scanned result
          let address = result;

          // Handle ton:// deep links
          if (result.startsWith("ton://transfer/")) {
            const url = new URL(result);
            address = url.pathname.replace("/transfer/", "");
            setRecipient(address);
          } else if (result.startsWith("tonkeeper://")) {
            address = result.replace("tonkeeper://transfer/", "").split("?")[0];
            setRecipient(address);
          } else if (result.startsWith("ethereum:") || result.startsWith("0x")) {
            // Ethereum address (EIP-681 or raw)
            address = result.startsWith("ethereum:") ? result.replace("ethereum:", "").split("@")[0] : result;
            if (isValidEthAddress(address)) {
              setSelectedChain("eth");
              setMultiChainRecipient(address);
            } else {
              setRecipient(address);
            }
          } else if (result.startsWith("solana:") || (result.length >= 32 && result.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(result))) {
            // Solana address
            address = result.startsWith("solana:") ? result.replace("solana:", "").split("?")[0] : result;
            if (isValidSolAddress(address)) {
              setSelectedChain("sol");
              setMultiChainRecipient(address);
            } else {
              setRecipient(address);
            }
          } else if (result.startsWith("bitcoin:") || result.startsWith("bc1") || result.startsWith("tb1") || result.startsWith("1") || result.startsWith("3")) {
            // Bitcoin address
            address = result.startsWith("bitcoin:") ? result.replace("bitcoin:", "").split("?")[0] : result;
            if (isValidBtcAddress(address)) {
              setSelectedChain("btc");
              setMultiChainRecipient(address);
            } else {
              setRecipient(address);
            }
          } else if (result.startsWith("tron:") || result.startsWith("T")) {
            // TRON address
            address = result.startsWith("tron:") ? result.replace("tron:", "").split("?")[0] : result;
            if (isValidTrxAddress(address)) {
              setSelectedChain("trx");
              setMultiChainRecipient(address);
            } else {
              setRecipient(address);
            }
          } else if (result.includes("?")) {
            address = result.split("?")[0];
            setRecipient(address);
          } else {
            // Default to TON
            setRecipient(address);
          }

          toast.success("Address scanned!");
          WebApp.closeScanQrPopup();
          return true;
        }
      );
    } else {
      toast.error("QR Scanner not available", {
        description: "Please use the Telegram mobile app to scan QR codes",
      });
    }
  }

  const {
    walletAddress,
    tonBalance,
    tonPrice,
    jettons,
    isLoadingAssets: isContextLoading,
    hasFetched,
    walletStatus,
    fetchWalletAssets,
    isTestnet,
    // Multi-chain
    ethBalance,
    ethUsdValue,
    ethPrice,
    btcBalance,
    btcUsdValue,
    btcPrice,
    solBalance,
    solUsdValue,
    solPrice,
    trxBalance,
    trxUsdValue,
    trxPrice,
    fetchMultiChainBalances,
  } = useWallet();

  const TON_API_BASE_URL = isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io";

  useEffect(() => {
    router.prefetch("/wallet");
  }, [router]);

  // ── TON send form (TanStack Form) ──
  const tonForm = useForm({
    defaultValues: { recipient: "", amount: "", comment: "", encryptComment: false },
  });
  const recipient = useStore(tonForm.store, s => s.values.recipient);
  const amount = useStore(tonForm.store, s => s.values.amount);
  const comment = useStore(tonForm.store, s => s.values.comment);
  const encryptComment = useStore(tonForm.store, s => s.values.encryptComment);
  const setRecipient = (v: string) => tonForm.setFieldValue("recipient", v);
  const setAmount = (v: string) => tonForm.setFieldValue("amount", v);
  const setComment = (v: string) => tonForm.setFieldValue("comment", v);
  const setEncryptComment = (v: boolean) => tonForm.setFieldValue("encryptComment", v);

  // ── Multi-chain send form (TanStack Form) ──
  const multiChainForm = useForm({
    defaultValues: { recipient: "", amount: "", comment: "" },
  });
  const multiChainRecipient = useStore(multiChainForm.store, s => s.values.recipient);
  const multiChainAmount = useStore(multiChainForm.store, s => s.values.amount);
  const multiChainComment = useStore(multiChainForm.store, s => s.values.comment);
  const setMultiChainRecipient = (v: string) => multiChainForm.setFieldValue("recipient", v);
  const setMultiChainAmount = (v: string) => multiChainForm.setFieldValue("amount", v);
  const setMultiChainComment = (v: string) => multiChainForm.setFieldValue("comment", v);

  // Network mode state
  const [networkMode, setNetworkMode] = useState<NetworkMode>("ton");
  const [selectedChain, setSelectedChain] = useState<MultiChainType>("eth");
  const [multiChainAddressError, setMultiChainAddressError] = useState("");
  const [multiChainEstimatedFee, setMultiChainEstimatedFee] = useState("0");
  const [isMultiChainSending, setIsMultiChainSending] = useState(false);
  const [multiChainStep, setMultiChainStep] = useState<"input" | "confirm" | "processing" | "success">("input");
  const [multiChainTxHash, setMultiChainTxHash] = useState<string | null>(null);

  // TON state
  const [step, setStep] = useState<"input" | "confirm" | "processing" | "success">("input");
  const [selectedAsset, setSelectedAsset] = useState<SendableAsset | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [isDomainAddress, setIsDomainAddress] = useState(false);
  const [recipientPublicKey, setRecipientPublicKey] = useState<Uint8Array | null>(null);
  const [canEncrypt, setCanEncrypt] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState("0.005");
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [needMinimum, setNeedMinimum] = useState(false);
  const [isFirstTransaction, setIsFirstTransaction] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<{ address: string; name: string }[]>([]);

  // Multi-chain options
  const multiChainOptions: MultiChainOption[] = [
    {
      id: "eth" as MultiChainType,
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
      id: "btc" as MultiChainType,
      name: "Bitcoin",
      symbol: "BTC",
      balance: btcBalance,
      usdValue: btcUsdValue,
      price: btcPrice,
      image: "/svg/btc-logo.svg",
      color: "#F7931A",
      explorerUrl: isTestnet ? "https://blockstream.info/testnet/tx/" : "https://blockstream.info/tx/",
    },
    {
      id: "sol" as MultiChainType,
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
      id: "trx" as MultiChainType,
      name: "TRON",
      symbol: "TRX",
      balance: trxBalance,
      usdValue: trxUsdValue,
      price: trxPrice,
      image: "/svg/trx-logo.svg",
      color: "#FF0013",
      explorerUrl: "https://tronscan.org/#/transaction/",
    },
  ];

  const currentChain = multiChainOptions.find(c => c.id === selectedChain) || multiChainOptions[0];

  // Validate multi-chain address
  useEffect(() => {
    if (!multiChainRecipient.trim()) {
      setMultiChainAddressError("");
      return;
    }

    const debounceTimer = setTimeout(() => {
      let isValid = false;
      switch (selectedChain) {
        case "eth":
          isValid = isValidEthAddress(multiChainRecipient);
          break;
        case "sol":
          isValid = isValidSolAddress(multiChainRecipient);
          break;
        case "trx":
          isValid = isValidTrxAddress(multiChainRecipient);
          break;
        case "btc":
          isValid = isValidBtcAddress(multiChainRecipient);
          break;
      }
      setMultiChainAddressError(isValid ? "" : `Invalid ${currentChain.symbol} address`);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [multiChainRecipient, selectedChain, currentChain.symbol]);

  // Estimate multi-chain fee
  useEffect(() => {
    const estimateFee = async () => {
      if (selectedChain === "eth") {
        const gas = await estimateEthGas("", "", "0");
        setMultiChainEstimatedFee(gas.estimatedFee);
      } else if (selectedChain === "sol") {
        const fee = await estimateSolFee();
        setMultiChainEstimatedFee(fee);
      } else if (selectedChain === "trx") {
        const fee = await estimateTrxFee();
        setMultiChainEstimatedFee(fee);
      } else if (selectedChain === "btc") {
        const fee = await estimateBtcFee(isTestnet);
        setMultiChainEstimatedFee(fee);
      }
    };
    estimateFee();
  }, [selectedChain, isTestnet]);

  // Minimum TON required for jetton transfers (gas fees)
  const MIN_TON_FOR_JETTON = 0.1;
  // Deployment fee for first transaction (wallet contract deployment)
  const DEPLOYMENT_FEE = 0.005;

  // Check if TON balance is too low for jetton transfer
  const insufficientTonForGas = selectedAsset?.type === "jetton"
    ? parseFloat(tonBalance) < MIN_TON_FOR_JETTON
    : false;

  // Explorer URL based on network
  const EXPLORER_BASE_URL = isTestnet ? "https://testnet.tonviewer.com" : "https://tonviewer.com";

  // Resolve .ton domain addresses
  useEffect(() => {
    async function fetchRecipientPublicKey(address: string) {
      try {
        const data = await tonApiGet<{ public_key?: string }>(
          `/v2/accounts/${encodeURIComponent(address)}/publickey`,
          { testnet: isTestnet }
        );
        if (data.public_key) {
          // Public key is returned as hex string
          const pubKeyBytes = new Uint8Array(Buffer.from(data.public_key, 'hex'));
          setRecipientPublicKey(pubKeyBytes);
          setCanEncrypt(true);
          return;
        }
      } catch (error) {
        console.log("Could not fetch recipient public key:", error);
      }
      setRecipientPublicKey(null);
      setCanEncrypt(false);
      setEncryptComment(false); // Disable encryption if we can't get the key
    }

    const resolveAddress = async () => {
      if (!recipient.trim()) {
        setResolvedAddress("");
        setAddressError("");
        setIsDomainAddress(false);
        setRecipientPublicKey(null);
        setCanEncrypt(false);
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
          // Fetch public key for encryption
          fetchRecipientPublicKey(result.address);
        } else {
          setResolvedAddress("");
          setAddressError(result.error || "Invalid domain");
          setRecipientPublicKey(null);
          setCanEncrypt(false);
        }
        setIsResolvingAddress(false);
      } else {
        setIsDomainAddress(false);
        // Regular address validation
        const result = await resolveTonAddress(recipient);
        if (result.isValid) {
          setResolvedAddress(result.address);
          setAddressError("");
          // Fetch public key for encryption
          fetchRecipientPublicKey(result.address);
        } else if (recipient.trim().length > 0) {
          setResolvedAddress("");
          setAddressError(result.error || "Invalid address");
          setRecipientPublicKey(null);
          setCanEncrypt(false);
        }
      }
    };

    const debounceTimer = setTimeout(resolveAddress, 500);
    return () => clearTimeout(debounceTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setEncryptComment is a stable wrapper around form.setFieldValue
  }, [recipient, isTestnet]);

  // Redirect if no wallet
  useEffect(() => {
    const storedWallet = localStorage.getItem(`quantum_wallet_address_${telegramId}`);
    if (!storedWallet) {
      router.push("/wallet");
    }
    // Load saved addresses
    const storedAddresses = localStorage.getItem(`quantum_address_book_${telegramId}`);
    if (storedAddresses) {
      setSavedAddresses(JSON.parse(storedAddresses));
    }
  }, [router, telegramId]);

  // Get sendable assets from context data
  const sendableAssets: SendableAsset[] = (() => {
    const assets: SendableAsset[] = [
      {
        type: "ton",
        symbol: "TON",
        name: "Toncoin",
        balance: tonBalance,
        decimals: 9,
        image: "/svg/ton-logo.svg",
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
  })();

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
        if (numValue < (walletStatus === "active" ? 0.01 : 0.05)) {
          setNeedMinimum(true);
        } else {
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
      setNeedMinimum(false);
    }
  };

  const validateInput = () => {
    // Zod schema validation at submit boundary
    const parsed = tonSendSchema.safeParse({
      recipient,
      resolvedAddress: resolvedAddress || "",
      amount: amount || "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
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

    // Prevent self-send
    if (walletAddress) {
      try {
        const { Address } = require("@ton/core");
        const senderAddr = Address.parse(walletAddress).toString({ bounceable: false });
        const recipientAddr = Address.parse(resolvedAddress).toString({ bounceable: false });
        if (senderAddr === recipientAddr) {
          toast.error("You cannot send funds to yourself");
          return false;
        }
      } catch {
        // If address parsing fails, continue with other validations
      }
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
      const estimatedFeeAmount = 0.01
      const recipientWouldReceive = sendAmount - estimatedFeeAmount;

      if (recipientWouldReceive < 0.001) {
        toast.error("Amount too small - recipient would receive less than 0.001 TON after fees");
        return false;
      }
    }

    if (parseFloat(amount) < (walletStatus === "active" ? 0.01 : 0.05)) {
      toast.error(`Minimum send amount is ${(walletStatus === "active" ? "0.01" : "0.05")} TON`);
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
      const storedMnemonic = await getSecureMnemonic(telegramId);
      if (!storedMnemonic) {
        throw new Error("Wallet not found");
      }

      const mnemonic = storedMnemonic.split(" ");
      const keyPair = await mnemonicToPrivateKey(mnemonic);

      // Get the stored wallet version to create the correct wallet contract
      const storedVersion = localStorage.getItem(`quantum_wallet_version_${telegramId}`) || "v5r1";
      let wallet;
      switch (storedVersion) {
        case "v4r2":
          wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
          break;
        case "v3r2":
          wallet = WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey });
          break;
        case "v5r1":
        default:
          wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
          break;
      }

      const ta = new TonApiClient({ baseUrl: TON_API_BASE_URL, apiKey: env.NEXT_PUBLIC_TONAPI_KEY });
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

        // Build comment body if provided - use encryption if enabled and recipient has public key
        let messageBody: Cell | undefined = undefined;
        if (hasComment) {
          if (encryptComment && recipientPublicKey && walletAddress) {
            messageBody = await encryptCommentMessage(
              comment.trim(), 
              recipientPublicKey,
              undefined, // Use ephemeral sender keys
              undefined,
              walletAddress // Sender address for salt
            );
          } else {
            messageBody = createTextComment(comment.trim());
          }
        }

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
        const transfer = (wallet as any).createTransfer({
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
          const emulateData = await tonApiPost<{ transactions?: Record<string, unknown>[] }>(
            `/v2/emulation/emulateMessageToTrace`,
            {
              boc: externalMessage.toBoc().toString("base64"),
              ignore_signature_check: true
            },
            { testnet: isTestnet }
          );

          const transactions = emulateData.transactions || [];
          let totalFees = 0;

          for (const tx of transactions) {
            const computeFee = (tx.compute_phase as Record<string, number> | undefined)?.gas_fees || 0;
            const storageFee = (tx.storage_phase as Record<string, number> | undefined)?.storage_fees_collected || 0;
            const actionFee = (tx.action_phase as Record<string, number> | undefined)?.total_action_fees || 0;
            totalFees += computeFee + storageFee + actionFee;
          }

          networkFee = totalFees / 1e9;
          if (networkFee < 0.001) {
            networkFee = 0.005;
          }
          networkFee = networkFee * 1.15; // 15% buffer
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
    const storedMnemonic = await getSecureMnemonic(telegramId);
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

      // Get the stored wallet version to create the correct wallet contract
      const storedVersion = localStorage.getItem(`quantum_wallet_version_${telegramId}`) || "v5r1";
      let wallet;
      switch (storedVersion) {
        case "v4r2":
          wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
          break;
        case "v3r2":
          wallet = WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey });
          break;
        case "v5r1":
        default:
          wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
          break;
      }

      const ta = new TonApiClient({ baseUrl: TON_API_BASE_URL, apiKey: env.NEXT_PUBLIC_TONAPI_KEY });
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

        // Build comment body if provided - use encryption if enabled and recipient has public key
        let messageBody: Cell | undefined = undefined;
        if (comment.trim()) {
          if (encryptComment && recipientPublicKey && walletAddress) {
            // Use encrypted comment
            messageBody = await encryptCommentMessage(
              comment.trim(), 
              recipientPublicKey,
              undefined, // Use ephemeral sender keys
              undefined,
              walletAddress // Sender address for salt
            );
          } else {
            // Use plain text comment
            messageBody = createTextComment(comment.trim());
          }
        }

        // For first transaction with undeployed wallet, we need to manually send with StateInit
        if (!isWalletDeployed && seqno === 0) {
          // Create the transfer message
          const transfer = (wallet as any).createTransfer({
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
          await sendBoc(boc, { testnet: isTestnet });
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
        // Jetton transfer
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

        // For first transaction with undeployed wallet, we need to manually send with StateInit
        if (!isWalletDeployed && seqno === 0) {
          // Create the transfer message for jetton
          const transfer = (wallet as any).createTransfer({
            seqno: 0,
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
          await sendBoc(boc, { testnet: isTestnet });
        } else {
          // Normal transfer for deployed wallet
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

  // Multi-chain send function
  const handleMultiChainSend = async () => {
    if (!multiChainRecipient || !multiChainAmount || multiChainAddressError) {
      toast.error("Please enter valid recipient and amount");
      return;
    }

    const sendAmount = parseFloat(multiChainAmount);
    if (sendAmount <= 0 || sendAmount > currentChain.balance) {
      toast.error(sendAmount > currentChain.balance ? "Insufficient balance" : "Invalid amount");
      return;
    }

    setIsMultiChainSending(true);
    setMultiChainStep("processing");

    try {
      const mnemonic = await getSecureMnemonic(telegramId);
      if (!mnemonic) {
        throw new Error("Wallet not found");
      }

      let result: { success: boolean; txHash?: string; error?: string };

      switch (selectedChain) {
        case "eth":
          result = await sendEthTransaction(mnemonic, multiChainRecipient, multiChainAmount);
          break;
        case "sol":
          result = await sendSolTransaction(mnemonic, multiChainRecipient, multiChainAmount);
          break;
        case "trx":
          result = await sendTrxTransaction(mnemonic, multiChainRecipient, multiChainAmount);
          break;
        case "btc":
          result = await sendBtcTransaction(mnemonic, multiChainRecipient, multiChainAmount, isTestnet);
          break;
        default:
          throw new Error("Unsupported chain");
      }

      if (result.success && result.txHash) {
        setMultiChainTxHash(result.txHash);
        setMultiChainStep("success");
        toast.success("Transaction sent!");

        // Refresh balances after delay
        setTimeout(() => {
          fetchMultiChainBalances();
        }, 3000);
      } else {
        throw new Error(result.error || "Transaction failed");
      }
    } catch (error) {
      console.error("Multi-chain send failed:", error);
      toast.error(error instanceof Error ? error.message : "Transaction failed");
      setMultiChainStep("input");
    } finally {
      setIsMultiChainSending(false);
    }
  };

  // Handle multi-chain send with auth
  const handleMultiChainSendWithAuth = async () => {
    const authenticated = await requestAuth();
    if (authenticated) {
      await handleMultiChainSend();
    }
  };

  // Validate multi-chain input
  const validateMultiChainInput = (): boolean => {
    // Zod schema validation at submit boundary
    const parsed = multiChainSendSchema.safeParse({
      recipient: multiChainRecipient.trim(),
      amount: multiChainAmount || "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return false;
    }
    if (multiChainAddressError) {
      toast.error(multiChainAddressError);
      return false;
    }
    if (parseFloat(multiChainAmount) > currentChain.balance) {
      toast.error("Insufficient balance");
      return false;
    }
    return true;
  };

  // Handle multi-chain max amount
  const handleMultiChainMaxAmount = () => {
    const fee = parseFloat(multiChainEstimatedFee) || 0;
    const maxAmount = Math.max(0, currentChain.balance - fee);
    setMultiChainAmount(maxAmount.toFixed(6));
  };

  if (isContextLoading && !selectedAsset) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pt-6">
      <div className="max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">Send Assets</h1>
        </div>

        {/* Network Toggle - Only show on mainnet */}
        {!isTestnet && (
          <Tabs value={networkMode} onValueChange={(v) => setNetworkMode(v as NetworkMode)} className="mb-6">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger 
                value="ton" 
                className="h-full rounded-lg text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-black text-gray-400"
              >
                TON
              </TabsTrigger>
              <TabsTrigger 
                value="multichain" 
                className="h-full rounded-lg text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-black text-gray-400"
              >
                Multi-chain
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Multi-chain Send Form */}
        {networkMode === "multichain" && !isTestnet && (
          <AnimatePresence mode="wait">
            {multiChainStep === "input" && (
              <motion.div
                key="multichain-input"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Chain Selection */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground ml-1">Chain</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full bg-card border-border h-16 px-5 justify-between hover:bg-accent/50 hover:border-muted-foreground/20 transition-all rounded-2xl shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <Image src={currentChain.image} alt={currentChain.symbol} width={32} height={32} className="w-8 h-8 rounded-full" unoptimized />
                          <div className="text-left">
                            <div className="font-bold text-foreground">{currentChain.symbol}</div>
                            <div className="text-xs text-muted-foreground">Balance: {currentChain.balance.toFixed(6)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">${currentChain.usdValue.toFixed(2)}</span>
                          <Icon icon="lucide:chevron-down" className="w-4 h-4 text-muted-foreground"/>
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-md bg-popover border-border text-popover-foreground rounded-2xl p-2 shadow-2xl">
                      <DropdownMenuLabel className="text-muted-foreground text-[10px] uppercase tracking-widest px-3 py-2 font-bold">Select Chain</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-border" />
                      {multiChainOptions.map((chain) => (
                        <DropdownMenuItem
                          key={chain.id}
                          onClick={() => {
                            setSelectedChain(chain.id);
                            setMultiChainRecipient("");
                            setMultiChainAddressError("");
                          }}
                          className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer rounded-xl transition-colors"
                        >
                          <Image src={chain.image} alt={chain.symbol} width={32} height={32} className="w-8 h-8 rounded-full" unoptimized />
                          <div className="flex-1">
                            <div className="font-bold">{chain.symbol}</div>
                            <div className="text-xs text-muted-foreground">{chain.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{chain.balance.toFixed(6)}</div>
                            <div className="text-xs text-muted-foreground">${chain.usdValue.toFixed(2)}</div>
                          </div>
                          {chain.id === selectedChain && (
                            <Icon icon="lucide:check" className="w-4 h-4 text-green-500"/>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Recipient Address */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground ml-1">{currentChain.symbol} Address</Label>
                  <div className="relative">
                    <Input
                      value={multiChainRecipient}
                      onChange={(e) => setMultiChainRecipient(e.target.value)}
                      placeholder={`Enter ${currentChain.symbol} address`}
                      className={`bg-card border-border h-14 pl-4 pr-20 text-foreground placeholder:text-muted-foreground/50 rounded-xl transition-all font-mono text-sm ${
                        multiChainAddressError ? 'border-destructive focus:border-destructive' :
                        multiChainRecipient && !multiChainAddressError ? 'border-green-500/50 focus:border-green-500' : 'focus:border-primary/50'
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {multiChainRecipient && !multiChainAddressError ? (
                        <Icon icon="lucide:check" className="w-4 h-4 text-green-500"/>
                      ) : (
                        <Icon icon="lucide:wallet" className="w-4 h-4 text-muted-foreground"/>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={openQRScanner}
                        className="w-8 h-8 rounded-lg bg-muted hover:bg-accent"
                      >
                        <Icon icon="lucide:scan-line" className="w-4 h-4"/>
                      </Button>
                    </div>
                  </div>
                  {multiChainAddressError && (
                    <p className="text-xs text-destructive ml-1 flex items-center gap-1">
                      <Icon icon="lucide:info" className="w-3 h-3"/>
                      {multiChainAddressError}
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-sm text-muted-foreground">Amount</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {currentChain.balance.toFixed(6)} {currentChain.symbol}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMultiChainMaxAmount}
                        className="h-auto p-0 text-xs font-bold text-primary hover:text-primary/80 hover:bg-transparent transition-colors uppercase"
                      >
                        Max
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={multiChainAmount}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.');
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setMultiChainAmount(value);
                        }
                      }}
                      placeholder="0.00"
                      className="bg-card border-border h-14 pl-4 pr-24 text-foreground placeholder:text-muted-foreground/50 text-2xl font-bold rounded-xl focus:border-primary/50 transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                      {currentChain.symbol}
                    </div>
                  </div>
                  {multiChainAmount && currentChain.price > 0 && (
                    <p className="text-xs text-muted-foreground ml-1">
                      ≈ ${(parseFloat(multiChainAmount || "0") * currentChain.price).toFixed(2)} USD
                    </p>
                  )}
                </div>

                {/* Comment/Memo (Optional) */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground ml-1">Comment (Optional)</Label>
                  <Input
                    value={multiChainComment}
                    onChange={(e) => setMultiChainComment(e.target.value)}
                    placeholder="Add a memo or note"
                    maxLength={200}
                    className="bg-card border-border h-12 px-4 text-foreground placeholder:text-muted-foreground/50 rounded-xl focus:border-primary/50 transition-all text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground/70 ml-1">
                    Note: Comments are for your records only and may not be stored on all chains.
                  </p>
                </div>

                {/* Fee Estimate */}
                <Card className="bg-card border-border rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Estimated Fee</span>
                      <span className="font-medium">~{multiChainEstimatedFee} {currentChain.symbol}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Insufficient Balance Warning */}
                {parseFloat(multiChainAmount || "0") > currentChain.balance && (
                  <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-xl">
                    <Icon icon="lucide:alert-triangle" className="w-4 h-4"/>
                    <span>Insufficient {currentChain.symbol} balance</span>
                  </div>
                )}

                {/* Continue Button */}
                <Button
                  onClick={() => {
                    if (validateMultiChainInput()) {
                      setMultiChainStep("confirm");
                    }
                  }}
                  disabled={!multiChainRecipient || !multiChainAmount || !!multiChainAddressError || parseFloat(multiChainAmount || "0") > currentChain.balance}
                  className="w-full h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90 transition-colors"
                >
                  Continue
                </Button>
              </motion.div>
            )}

            {multiChainStep === "confirm" && (
              <motion.div
                key="multichain-confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="bg-card border-border rounded-2xl overflow-hidden">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-center mb-4">
                      <div className="p-4 rounded-full" style={{ backgroundColor: `${currentChain.color}20` }}>
                        <Image src={currentChain.image} alt={currentChain.symbol} width={48} height={48} className="w-12 h-12" unoptimized />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">{multiChainAmount} {currentChain.symbol}</p>
                      <p className="text-muted-foreground text-sm mt-1">
                        ≈ ${(parseFloat(multiChainAmount || "0") * currentChain.price).toFixed(2)} USD
                      </p>
                    </div>
                    <div className="border-t border-border pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">To</span>
                        <span className="font-mono text-xs">{multiChainRecipient.slice(0, 12)}...{multiChainRecipient.slice(-8)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Network</span>
                        <span className="font-medium">{currentChain.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Est. Fee</span>
                        <span>~{multiChainEstimatedFee} {currentChain.symbol}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setMultiChainStep("input")}
                    className="flex-1 h-14 rounded-xl border-border"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleMultiChainSendWithAuth}
                    disabled={isMultiChainSending}
                    className="flex-1 h-14 rounded-xl bg-primary hover:bg-primary/90"
                  >
                    {isMultiChainSending ? <ButtonLoader /> : "Confirm & Send"}
                  </Button>
                </div>
              </motion.div>
            )}

            {multiChainStep === "processing" && (
              <motion.div
                key="multichain-processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 space-y-6"
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin shadow-[0_0_15px] shadow-primary/30" />
                  <div className="absolute w-10 h-10 rounded-full border-2 border-primary/20 border-b-primary animate-[spin_1.5s_linear_infinite_reverse]" />
                  <div className="absolute w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px] shadow-primary/80" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">Processing Transaction</p>
                  <p className="text-muted-foreground text-sm mt-1">Please wait while we send your {currentChain.symbol}...</p>
                </div>
              </motion.div>
            )}

            {multiChainStep === "success" && (
              <motion.div
                key="multichain-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <Icon icon="lucide:check" className="w-10 h-10 text-green-500"/>
                  </div>
                  <h2 className="text-xl font-bold">Transaction Sent!</h2>
                  <p className="text-muted-foreground text-sm mt-1 text-center">
                    Your {multiChainAmount} {currentChain.symbol} has been sent successfully.
                  </p>
                </div>

                {multiChainTxHash && (
                  <a
                    href={`${currentChain.explorerUrl}${multiChainTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-primary text-sm hover:underline"
                  >
                    <Icon icon="lucide:external-link" className="w-4 h-4"/>
                    View on Explorer
                  </a>
                )}

                <Button
                  onClick={() => {
                    setMultiChainStep("input");
                    setMultiChainRecipient("");
                    setMultiChainAmount("");
                    setMultiChainTxHash(null);
                    setMultiChainComment("");
                    router.push("/wallet");
                  }}
                  className="w-full h-14 rounded-xl"
                >
                  Done
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* TON Send Form - Original */}
        {(networkMode === "ton" || isTestnet) && (
        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Batch Send Feature Link */}
              <button
                onClick={() => router.push("/wallet/send-multiple")}
                className="w-full p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon icon="lucide:users" className="w-4 h-4 text-primary"/>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Send to Multiple</p>
                    <p className="text-xs text-muted-foreground">Send TON to multiple recipients at once</p>
                  </div>
                </div>
                <Icon icon="lucide:chevron-down" className="w-4 h-4 text-primary rotate-[-90deg]"/>
              </button>

              {/* Asset Selection */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground ml-1">Asset</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full bg-card border-border h-16 px-5 justify-between hover:bg-accent/50 hover:border-muted-foreground/20 transition-all rounded-2xl shadow-sm"
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
                          <div className="font-bold text-foreground">{selectedAsset?.symbol}</div>
                          <div className="text-xs text-muted-foreground">Balance: {selectedAsset?.balance}</div>
                        </div>
                      </div>
                      <Icon icon="lucide:chevron-down" className="w-4 h-4 text-muted-foreground"/>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-md bg-popover border-border text-popover-foreground rounded-2xl p-2 shadow-2xl">
                    <DropdownMenuLabel className="text-muted-foreground text-[10px] uppercase tracking-widest px-3 py-2 font-bold">Select Asset</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-border" />
                    {sendableAssets.map((asset) => (
                      <DropdownMenuItem
                        key={asset.symbol}
                        onClick={() => setSelectedAsset(asset)}
                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer rounded-xl transition-colors"
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
                          <div className="text-xs text-muted-foreground">{asset.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{asset.balance}</div>
                          {asset.priceUsd && (
                            <div className="text-xs text-muted-foreground">
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
                <Label className="text-sm text-muted-foreground ml-1">Recipient Address or .ton Domain</Label>

                {/* Quick Select from Address Book */}
                {savedAddresses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {savedAddresses.slice(0, 3).map((addr) => (
                      <Button
                        key={addr.address}
                        variant="outline"
                        size="sm"
                        onClick={() => setRecipient(addr.address)}
                        className="flex items-center gap-1.5 h-8 px-3 bg-muted border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-colors rounded-lg text-xs"
                      >
                        <Icon icon="lucide:book-user" className="w-3 h-3 text-purple-400"/>
                        <span>{addr.name}</span>
                      </Button>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Enter TON address or name.ton"
                    className={`bg-card border-border h-14 pl-4 pr-20 text-foreground placeholder:text-muted-foreground/50 rounded-xl transition-all font-mono text-sm ${addressError ? 'border-destructive focus:border-destructive' :
                      resolvedAddress ? 'border-green-500/50 focus:border-green-500' : 'focus:border-primary/50'
                      }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {isResolvingAddress ? (
                      <ButtonLoader />
                    ) : resolvedAddress ? (
                      <Icon icon="lucide:check" className="w-4 h-4 text-green-500"/>
                    ) : (
                      <Icon icon="lucide:wallet" className="w-4 h-4 text-muted-foreground"/>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={openQRScanner}
                      className="w-8 h-8 rounded-lg bg-muted hover:bg-accent"
                    >
                      <Icon icon="lucide:scan-line" className="w-4 h-4"/>
                    </Button>
                  </div>
                </div>
                {isDomainAddress && resolvedAddress && (
                  <p className="text-xs text-green-400 ml-1 flex items-center gap-1">
                    <Icon icon="lucide:check" className="w-3 h-3"/>
                    Resolved to: {resolvedAddress.slice(0, 8)}...{resolvedAddress.slice(-6)}
                  </p>
                )}
                {addressError && (
                  <p className="text-xs text-destructive ml-1 flex items-center gap-1">
                    <Icon icon="lucide:info" className="w-3 h-3"/>
                    {addressError}
                  </p>
                )}
              </div>

              {/* Comment (Optional) */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground ml-1 flex items-center gap-2">
                  <Icon icon="lucide:message-square" className="w-3 h-3"/>
                  Comment (Optional)
                </Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a message to your transaction..."
                  className="bg-card border-border text-foreground placeholder:text-muted-foreground/50 rounded-xl focus:border-primary/50 transition-all resize-none h-20"
                  maxLength={120}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{comment.length}/120</p>
                  
                  {/* Encrypt toggle - only for TON transfers with comments when encryption is available */}
                  {selectedAsset?.type === "ton" && comment.trim().length > 0 && canEncrypt && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        {encryptComment ? (
                          <Icon icon="lucide:lock" className="w-3 h-3 text-primary"/>
                        ) : (
                          <Icon icon="lucide:lock-open" className="w-3 h-3 text-muted-foreground"/>
                        )}
                        <span className={`text-xs ${encryptComment ? 'text-primary' : 'text-muted-foreground'}`}>
                          {encryptComment ? 'Encrypted' : 'Public'}
                        </span>
                      </div>
                      <Switch
                        checked={encryptComment}
                        onCheckedChange={setEncryptComment}
                        className="data-[state=checked]:bg-primary scale-75"
                      />
                    </div>
                  )}
                </div>
                
                {/* Encryption info */}
                {selectedAsset?.type === "ton" && comment.trim().length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 leading-relaxed">
                    {encryptComment && canEncrypt ? (
                      <>
                        <Icon icon="lucide:lock" className="w-3 h-3 text-primary shrink-0"/>
                        <span>Only you and the recipient can read this message.</span>
                      </>
                    ) : !canEncrypt ? (
                      <>
                        <Icon icon="lucide:info" className="w-3 h-3 text-muted-foreground/50 shrink-0"/>
                        <span>Encryption unavailable - recipient wallet hasn&apos;t sent any transactions yet.</span>
                      </>
                    ) : (
                      <>
                        <Icon icon="lucide:lock-open" className="w-3 h-3 text-yellow-500 shrink-0"/>
                        <span>This message will be visible publicly on the blockchain.</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-sm text-muted-foreground">Amount</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {selectedAsset?.balance} {selectedAsset?.symbol}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMaxAmount}
                      className="h-auto p-0 text-xs font-bold text-primary hover:text-primary/80 hover:bg-transparent transition-colors uppercase"
                    >
                      Max
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className={`bg-card border-border h-14 pl-4 pr-20 text-2xl font-bold text-foreground placeholder:text-muted-foreground/50 rounded-xl transition-all ${insufficientFunds ? 'border-destructive focus:border-destructive' : 'focus:border-primary/50'
                      }`}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-right">
                    <div className="text-sm font-bold text-foreground">{selectedAsset?.symbol}</div>
                    {amount && selectedAsset?.priceUsd && (
                      <div className="text-xs text-muted-foreground">
                        ≈ ${(parseFloat(amount) * selectedAsset.priceUsd).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
                {insufficientFunds ? (
                  <p className="text-xs text-destructive ml-1 flex items-center gap-1">
                    <Icon icon="lucide:info" className="w-3 h-3"/>
                    Insufficient funds. You have {selectedAsset?.balance} {selectedAsset?.symbol} available.
                  </p>
                ) : needMinimum ? (
                  <p className="text-xs text-yellow-500 ml-1 flex items-center gap-1.5">
                    <Icon icon="lucide:alert-triangle" className="w-3.5 h-3.5 shrink-0"/>
                    <span className="mt-[1px]">Min {walletStatus === "active" ? "0.01" : "0.05"} {selectedAsset?.symbol}</span>
                  </p>
                ) : null}
              </div>

              {/* Warning for insufficient TON for jetton gas fees */}
              {insufficientTonForGas && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
                  <Icon icon="lucide:alert-triangle" className="w-5 h-5 text-destructive shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-sm font-medium text-destructive">Insufficient TON for Transaction</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You need at least <span className="text-foreground font-medium">0.1 TON</span> to cover network fees when sending tokens.
                      Your current TON balance is <span className="text-foreground font-medium">{tonBalance} TON</span>.
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={handleContinue}
                disabled={!recipient || !resolvedAddress || !amount || parseFloat(amount) <= 0 || isEstimating || insufficientFunds || isResolvingAddress || needMinimum || insufficientTonForGas}
                className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold text-lg mt-8"
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
              {isTestnet && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-2">
                  <Icon icon="lucide:info" className="w-4 h-4 text-yellow-500 shrink-0"/>
                  <span className="text-xs text-yellow-400 font-medium">Testnet Mode - For testing only</span>
                </div>
              )}

              <Card className="bg-card border-border overflow-hidden">
                <CardContent className="p-6 space-y-6">
                  <div className="text-center space-y-1">
                    <div className="text-sm text-muted-foreground">Sending</div>
                    <div className="text-3xl font-bold text-foreground">
                      {amount} <span className="text-primary">{selectedAsset?.symbol}</span>
                    </div>
                    {amount && selectedAsset?.priceUsd && (
                      <div className="text-sm text-muted-foreground">
                        ≈ ${(parseFloat(amount) * selectedAsset.priceUsd).toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">To</span>
                      <div className="text-right flex-1 pl-8">
                        {isDomainAddress ? (
                          <div>
                            <div className="text-sm font-medium text-primary">{recipient}</div>
                            <div className="text-xs font-mono text-muted-foreground break-all mt-1">
                              {resolvedAddress.slice(0, 12)}...{resolvedAddress.slice(-8)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-mono text-foreground break-all">{resolvedAddress}</div>
                        )}
                      </div>
                    </div>

                    {comment.trim() && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Icon icon="lucide:message-square" className="w-3 h-3"/>
                          Comment
                        </span>
                        <div className="text-right flex-1 pl-8">
                          <div className="text-sm text-muted-foreground italic">&ldquo;{comment.trim()}&rdquo;</div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Network Fee
                        {isFirstTransaction && (
                          <span className="text-xs text-yellow-500 ml-1">(incl. wallet activation)</span>
                        )}
                      </span>
                      <div className="text-right">
                        <span className="text-sm text-foreground">≈ {estimatedFee} TON</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          (${(parseFloat(estimatedFee) * tonPrice).toFixed(2)})
                        </span>
                      </div>
                    </div>

                    {isFirstTransaction && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 -mx-1">
                        <p className="text-xs text-yellow-500/90 text-center">
                          First transaction includes one-time wallet activation fee
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-border">
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

              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                <Icon icon="lucide:info" className="w-5 h-5 text-primary mt-0.5 shrink-0"/>
                <p className="text-xs text-primary/90 leading-relaxed">
                  Please verify the recipient address carefully. Transactions on the blockchain are irreversible.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setStep("input")}
                  className="h-14 bg-card border-border text-foreground hover:bg-accent hover:text-accent-foreground rounded-xl font-bold"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmSend}
                  disabled={isSending}
                  className="h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold"
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
                  <Icon icon="lucide:wallet" className="w-8 h-8 text-primary"/>
                </div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-foreground">Processing Transaction</h2>
                <p className="text-muted-foreground text-sm">Please wait while we broadcast your transaction...</p>
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
                <Icon icon="lucide:check" className="w-12 h-12 text-green-500"/>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Transaction Sent!</h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Your transaction has been successfully broadcasted to the network.
                </p>
              </div>

              <div className="w-full space-y-3 pt-8">
                {lastTxHash && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(`${EXPLORER_BASE_URL}/${lastTxHash}`, "_blank")}
                    className="w-full h-12 bg-card border-border text-foreground hover:bg-accent hover:text-accent-foreground rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Icon icon="lucide:external-link" className="w-4 h-4"/>
                    View in Explorer
                  </Button>
                )}
                <Button
                  onClick={() => router.push("/wallet")}
                  className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold"
                >
                  Back to Wallet
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>

      {/* Biometric/PIN Authentication Modal */}
      <BiometricAuth
        isOpen={isAuthOpen}
        onSuccess={handleAuthSuccess}
        onCancel={handleAuthCancel}
        title="Confirm Transaction"
        description={`Authenticate to send ${networkMode === "multichain" ? multiChainAmount + " " + currentChain.symbol : amount + " " + (selectedAsset?.symbol || '')} to ${networkMode === "multichain" ? (multiChainRecipient ? multiChainRecipient.slice(0, 8) + '...' : 'recipient') : (recipient ? recipient.slice(0, 8) + '...' : 'recipient')}`}
      />
    </div>
  );
}
