"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Wallet, Info, AlertTriangle, ExternalLink, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet, IS_TESTNET } from "../../WalletContext";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import Loader from "@/app/(components)/Loader";
import { resolveTonAddress } from "@/lib/tonAddressResolver";
import { toast } from "sonner";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { toNano, Address, beginCell } from "@ton/core";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";

interface NftDetails {
    address: string;
    name: string;
    image?: string;
    collectionName?: string;
}

export default function SendNftPage() {
    const params = useParams();
    const router = useRouter();
    const nftAddress = decodeURIComponent(params.address as string);

    useTelegramBackButton(`/wallet/nft/${encodeURIComponent(nftAddress)}`);

    const { isOpen: isAuthOpen, requestAuth, handleSuccess: handleAuthSuccess, handleCancel: handleAuthCancel } = useBiometricAuth();
    const { walletAddress, tonBalance, fetchWalletAssets } = useWallet();

    const TON_API_BASE_URL = IS_TESTNET ? "https://testnet.tonapi.io" : "https://tonapi.io";
    const EXPLORER_BASE_URL = IS_TESTNET ? "https://testnet.tonviewer.com" : "https://tonviewer.com";
    const MIN_TON_FOR_NFT = 0.05;

    const [step, setStep] = useState<"input" | "confirm" | "processing" | "success">("input");
    const [nft, setNft] = useState<NftDetails | null>(null);
    const [isLoadingNft, setIsLoadingNft] = useState(true);
    const [recipient, setRecipient] = useState("");
    const [resolvedAddress, setResolvedAddress] = useState("");
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [addressError, setAddressError] = useState("");
    const [isDomainAddress, setIsDomainAddress] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [lastTxHash, setLastTxHash] = useState<string | null>(null);

    const insufficientTonForGas = parseFloat(tonBalance) < MIN_TON_FOR_NFT;

    // Fetch NFT details
    useEffect(() => {
        const fetchNft = async () => {
            if (!nftAddress) return;
            setIsLoadingNft(true);
            try {
                const response = await fetch(`${TON_API_BASE_URL}/v2/nfts/${encodeURIComponent(nftAddress)}`);
                if (response.ok) {
                    const data = await response.json();
                    const preview = data.previews?.find((p: { resolution: string }) => p.resolution === '500x500')
                        || data.previews?.find((p: { resolution: string }) => p.resolution === '100x100')
                        || data.previews?.[0];
                    setNft({
                        address: data.address,
                        name: data.metadata?.name || 'Unnamed NFT',
                        image: preview?.url || data.metadata?.image,
                        collectionName: data.collection?.name,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch NFT:", error);
            } finally {
                setIsLoadingNft(false);
            }
        };
        fetchNft();
    }, [nftAddress, TON_API_BASE_URL]);

    // Resolve .ton domain addresses
    useEffect(() => {
        const resolveAddress = async () => {
            if (!recipient.trim()) {
                setResolvedAddress("");
                setAddressError("");
                setIsDomainAddress(false);
                return;
            }

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

    const validateInput = () => {
        if (!recipient) {
            toast.error("Please enter a recipient address");
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
        if (insufficientTonForGas) {
            toast.error("Insufficient TON for transaction fees");
            return false;
        }
        return true;
    };

    const handleContinue = () => {
        if (validateInput()) {
            setStep("confirm");
        }
    };

    const handleConfirmSend = async () => {
        const authenticated = await requestAuth();
        if (authenticated) {
            await executeNftTransfer();
        } else {
            toast.error("Authentication required");
        }
    };

    const executeNftTransfer = async () => {
        const storedMnemonic = localStorage.getItem("quantum_wallet_mnemonic");
        if (!storedMnemonic) {
            toast.error("Wallet credentials not found");
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

            // Check wallet deployment status
            let seqno = 0;
            let isWalletDeployed = false;

            try {
                const state = await ta.accounts.getAccount(wallet.address);
                isWalletDeployed = state.status === 'active';
                if (isWalletDeployed) {
                    seqno = await contract.getSeqno();
                }
            } catch {
                isWalletDeployed = false;
                seqno = 0;
            }

            const toAddress = Address.parse(resolvedAddress);
            const nftAddr = Address.parse(nftAddress);

            // NFT Transfer message body (opcode 0x5fcc3d14)
            const body = beginCell()
                .storeUint(0x5fcc3d14, 32) // transfer opcode
                .storeUint(0, 64) // query_id
                .storeAddress(toAddress) // new_owner
                .storeAddress(wallet.address) // response_destination
                .storeBit(false) // no custom_payload
                .storeCoins(toNano("0.01")) // forward_amount
                .storeBit(false) // no forward_payload
                .endCell();

            if (!isWalletDeployed && seqno === 0) {
                // Wallet not deployed - include StateInit
                const transfer = wallet.createTransfer({
                    seqno: 0,
                    secretKey: keyPair.secretKey,
                    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
                    messages: [
                        internal({
                            to: nftAddr,
                            value: toNano("0.05"),
                            body: body,
                            bounce: true
                        }),
                    ],
                });

                const externalMessage = beginCell()
                    .storeWritable((builder) => {
                        builder.storeUint(0b10, 2);
                        builder.storeUint(0, 2);
                        builder.storeAddress(wallet.address);
                        builder.storeCoins(0);
                    })
                    .storeBit(true)
                    .storeBit(true)
                    .storeRef(
                        beginCell()
                            .storeUint(0, 2)
                            .storeMaybeRef(wallet.init.code)
                            .storeMaybeRef(wallet.init.data)
                            .storeUint(0, 1)
                            .endCell()
                    )
                    .storeBit(true)
                    .storeRef(transfer)
                    .endCell();

                const boc = externalMessage.toBoc().toString('base64');
                await fetch(`${TON_API_BASE_URL}/v2/blockchain/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ boc })
                });
            } else {
                // Normal transfer
                await contract.sendTransfer({
                    seqno,
                    secretKey: keyPair.secretKey,
                    sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
                    messages: [
                        internal({
                            to: nftAddr,
                            value: toNano("0.05"),
                            body: body,
                            bounce: true
                        }),
                    ],
                });
            }

            setLastTxHash(walletAddress || "");
            setStep("success");
            toast.success("NFT sent successfully!");

            setTimeout(() => {
                fetchWalletAssets();
            }, 3000);

        } catch (error) {
            console.error("NFT transfer failed:", error);
            const errorMessage = error instanceof Error ? error.message : "Transfer failed";
            toast.error(`Transfer failed: ${errorMessage}`);
            setStep("input");
        } finally {
            setIsSending(false);
        }
    };

    if (isLoadingNft) {
        return (
            <div className="min-h-screen bg-black text-white p-4">
                <div className="max-w-md mx-auto space-y-6">
                    <Skeleton className="w-full h-32 rounded-2xl bg-[#222]" />
                    <Skeleton className="h-14 w-full bg-[#222]" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 pt-6">
            <div className="max-w-md mx-auto">
                <div className="mb-6 text-center">
                    <h1 className="text-xl font-bold">Send NFT</h1>
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
                            {/* NFT Preview */}
                            <Card className="bg-[#111] border-[#222] overflow-hidden">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-xl bg-[#1a1a1a] overflow-hidden shrink-0">
                                        {nft?.image ? (
                                            <Image src={nft.image} alt={nft.name} width={80} height={80} className="w-full h-full object-cover" unoptimized />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className="w-8 h-8 text-gray-600" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-white truncate">{nft?.name}</h3>
                                        {nft?.collectionName && (
                                            <p className="text-sm text-gray-500 truncate">{nft.collectionName}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recipient */}
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400 ml-1">Recipient Address</label>
                                <div className="relative">
                                    <Input
                                        value={recipient}
                                        onChange={(e) => setRecipient(e.target.value)}
                                        placeholder="Enter TON address or name.ton"
                                        className={`bg-[#111] border-[#222] h-14 pl-4 pr-10 text-white placeholder:text-gray-600 rounded-xl font-mono text-sm ${addressError ? 'border-red-500' : resolvedAddress ? 'border-green-500/50' : ''
                                            }`}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {isResolvingAddress ? (
                                            <ButtonLoader />
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
                                        Resolved: {resolvedAddress.slice(0, 8)}...{resolvedAddress.slice(-6)}
                                    </p>
                                )}
                                {addressError && (
                                    <p className="text-xs text-red-500 ml-1 flex items-center gap-1">
                                        <Info className="w-3 h-3" />
                                        {addressError}
                                    </p>
                                )}
                            </div>

                            {/* TON Warning */}
                            {insufficientTonForGas && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-red-400">Insufficient TON</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            You need at least <span className="text-white font-medium">0.05 TON</span> for fees.
                                            Current balance: <span className="text-white font-medium">{tonBalance} TON</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Button
                                onClick={handleContinue}
                                disabled={!recipient || !resolvedAddress || isResolvingAddress || insufficientTonForGas}
                                className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-lg mt-8"
                            >
                                Continue
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
                                    <div className="text-center">
                                        <div className="w-24 h-24 rounded-xl bg-[#1a1a1a] overflow-hidden mx-auto mb-4">
                                            {nft?.image ? (
                                                <Image src={nft.image} alt={nft.name} width={96} height={96} className="w-full h-full object-cover" unoptimized />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ImageIcon className="w-10 h-10 text-gray-600" />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-white">{nft?.name}</h3>
                                        {nft?.collectionName && (
                                            <p className="text-sm text-gray-500">{nft.collectionName}</p>
                                        )}
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-[#222]">
                                        <div className="flex justify-between items-start">
                                            <span className="text-sm text-gray-400">To</span>
                                            <div className="text-right flex-1 pl-8">
                                                {isDomainAddress ? (
                                                    <div>
                                                        <div className="text-sm font-medium text-blue-400">{recipient}</div>
                                                        <div className="text-xs text-gray-500 font-mono break-all mt-1">
                                                            {resolvedAddress.slice(0, 12)}...{resolvedAddress.slice(-8)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-white font-mono break-all">
                                                        {resolvedAddress.slice(0, 12)}...{resolvedAddress.slice(-8)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Network Fee</span>
                                            <span className="text-sm text-white">~0.05 TON</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-2 gap-3">
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
                                    className="h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold"
                                >
                                    {isSending ? <ButtonLoader /> : "Confirm"}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === "processing" && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <Loader />
                        </motion.div>
                    )}

                    {step === "success" && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-12"
                        >
                            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                                <Check className="w-10 h-10 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">NFT Sent!</h2>
                            <p className="text-gray-400 mb-8">Your NFT has been transferred</p>

                            <div className="space-y-3">
                                {lastTxHash && (
                                    <Button
                                        variant="outline"
                                        onClick={() => window.open(`${EXPLORER_BASE_URL}/${lastTxHash}`, "_blank")}
                                        className="w-full h-12 bg-[#111] border-[#333] text-white hover:bg-[#1a1a1a] rounded-xl"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        View on Explorer
                                    </Button>
                                )}
                                <Button
                                    onClick={() => router.push("/wallet")}
                                    className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold"
                                >
                                    Back to Wallet
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <BiometricAuth
                isOpen={isAuthOpen}
                onSuccess={handleAuthSuccess}
                onCancel={handleAuthCancel}
            />
        </div>
    );
}
