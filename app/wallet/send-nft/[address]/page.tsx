"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useForm, useStore } from "@tanstack/react-form";
import { sendNftSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, FieldError } from "@/components/ui/field";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useWallet } from "../../WalletContext";
import { BiometricAuth, useBiometricAuth } from "@/components/ui/biometric-auth";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import Loader from "@/app/(components)/Loader";
import { getSecureMnemonic } from "@/lib/secure-mnemonic";
import { resolveTonAddress } from "@/lib/tonAddressResolver";
import { toast } from "sonner";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV5R1, internal, SendMode } from "@ton/ton";
import { toNano, Address, beginCell } from "@ton/core";
import { TonApiClient } from "@ton-api/client";
import { ContractAdapter } from "@ton-api/ton-adapter";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useNftDetailsQuery } from "@/app/(hooks)/queries/use-nft-details";
import { sendBoc } from "@/lib/tonapi-client";

export default function SendNftPage() {
    const params = useParams();
    const router = useRouter();
    const nftAddress = decodeURIComponent(params.address as string);
    const {telegramId}  = useUserContext();
    useTelegramBackButton(`/wallet/nft/${encodeURIComponent(nftAddress)}`);

    const { isOpen: isAuthOpen, requestAuth, handleSuccess: handleAuthSuccess, handleCancel: handleAuthCancel } = useBiometricAuth();
    const { walletAddress, tonBalance, fetchWalletAssets, isTestnet } = useWallet();

    const TON_API_BASE_URL = isTestnet ? "https://testnet.tonapi.io" : "https://tonapi.io";
    const EXPLORER_BASE_URL = isTestnet ? "https://testnet.tonviewer.com" : "https://tonviewer.com";
    const MIN_TON_FOR_NFT = 0.05;

    const form = useForm({
        defaultValues: { recipient: "" },
        validators: { onSubmit: sendNftSchema },
    });

    const watchedRecipient = useStore(form.store, (s) => s.values.recipient);

    const [step, setStep] = useState<"input" | "confirm" | "processing" | "success">("input");
    const { data: nft, isLoading: isLoadingNft } = useNftDetailsQuery(nftAddress, isTestnet);
    const [resolvedAddress, setResolvedAddress] = useState("");
    const [isResolvingAddress, setIsResolvingAddress] = useState(false);
    const [addressError, setAddressError] = useState("");
    const [isDomainAddress, setIsDomainAddress] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [lastTxHash, setLastTxHash] = useState<string | null>(null);

    const insufficientTonForGas = parseFloat(tonBalance) < MIN_TON_FOR_NFT;

    // Resolve .ton domain addresses
    useEffect(() => {
        const resolveAddress = async () => {
            if (!watchedRecipient.trim()) {
                setResolvedAddress("");
                setAddressError("");
                setIsDomainAddress(false);
                return;
            }

            if (watchedRecipient.trim().toLowerCase().endsWith(".ton")) {
                setIsDomainAddress(true);
                setIsResolvingAddress(true);
                setAddressError("");
                const result = await resolveTonAddress(watchedRecipient);
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
                const result = await resolveTonAddress(watchedRecipient);
                if (result.isValid) {
                    setResolvedAddress(result.address);
                    setAddressError("");
                } else if (watchedRecipient.trim().length > 0) {
                    setResolvedAddress("");
                    setAddressError(result.error || "Invalid address");
                }
            }
        };

        const debounceTimer = setTimeout(resolveAddress, 500);
        return () => clearTimeout(debounceTimer);
    }, [watchedRecipient]);

    const validateInput = () => {
        const recipientValue = form.getFieldValue("recipient");
        if (!recipientValue) {
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
        const storedMnemonic = await getSecureMnemonic(telegramId);
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
                await sendBoc(boc, { testnet: isTestnet });
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
            <div className="min-h-screen bg-background text-foreground p-4">
                <div className="max-w-md mx-auto space-y-6">
                    <Skeleton className="w-full h-32 rounded-2xl bg-muted" />
                    <Skeleton className="h-14 w-full bg-muted" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pt-6">
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
                            <Card className="bg-card border-border overflow-hidden">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden shrink-0">
                                        {nft?.image ? (
                                            <Image src={nft.image} alt={nft.name} width={80} height={80} className="w-full h-full object-cover" unoptimized />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Icon icon="lucide:image" className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-foreground truncate">{nft?.name}</h3>
                                        {nft?.collectionName && (
                                            <p className="text-sm text-muted-foreground truncate">{nft.collectionName}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recipient */}
                            <form.Field name="recipient">
                                {(field) => {
                                    const hasErrors = field.state.meta.errors.length > 0;
                                    return (
                                        <Field data-invalid={hasErrors || !!addressError}>
                                            <Label className="text-sm text-muted-foreground ml-1">Recipient Address</Label>
                                            <div className="relative">
                                                <Input
                                                    id={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                    placeholder="Enter TON address or name.ton"
                                                    aria-invalid={hasErrors || !!addressError}
                                                    className={`bg-card border-border h-14 pl-4 pr-10 text-foreground placeholder:text-muted-foreground/50 rounded-xl font-mono text-sm ${addressError ? 'border-destructive' : resolvedAddress ? 'border-green-500/50' : ''
                                                        }`}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    {isResolvingAddress ? (
                                                        <ButtonLoader />
                                                    ) : resolvedAddress ? (
                                                        <Icon icon="lucide:check" className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <Icon icon="lucide:wallet" className="w-4 h-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </div>
                                            {hasErrors && <FieldError errors={field.state.meta.errors.map(e => ({ message: String(e) }))} />}
                                            {isDomainAddress && resolvedAddress && (
                                                <p className="text-xs text-green-400 ml-1 flex items-center gap-1">
                                                    <Icon icon="lucide:check" className="w-3 h-3" />
                                                    Resolved: {resolvedAddress.slice(0, 8)}...{resolvedAddress.slice(-6)}
                                                </p>
                                            )}
                                            {addressError && (
                                                <p className="text-xs text-destructive ml-1 flex items-center gap-1">
                                                    <Icon icon="lucide:info" className="w-3 h-3" />
                                                    {addressError}
                                                </p>
                                            )}
                                        </Field>
                                    );
                                }}
                            </form.Field>

                            {/* TON Warning */}
                            {insufficientTonForGas && (
                                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
                                    <Icon icon="lucide:alert-triangle" className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-destructive-foreground">Insufficient TON</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            You need at least <span className="text-foreground font-medium">0.05 TON</span> for fees.
                                            Current balance: <span className="text-foreground font-medium">{tonBalance} TON</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Button
                                onClick={handleContinue}
                                disabled={!watchedRecipient || !resolvedAddress || isResolvingAddress || insufficientTonForGas}
                                className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold text-lg mt-8"
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
                            <Card className="bg-card border-border overflow-hidden">
                                <CardContent className="p-6 space-y-6">
                                    <div className="text-center">
                                        <div className="w-24 h-24 rounded-xl bg-muted overflow-hidden mx-auto mb-4">
                                            {nft?.image ? (
                                                <Image src={nft.image} alt={nft.name} width={96} height={96} className="w-full h-full object-cover" unoptimized />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                <Icon icon="lucide:image" className="w-10 h-10 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground">{nft?.name}</h3>
                                        {nft?.collectionName && (
                                            <p className="text-sm text-muted-foreground">{nft.collectionName}</p>
                                        )}
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-border">
                                        <div className="flex justify-between items-start">
                                            <span className="text-sm text-muted-foreground">To</span>
                                            <div className="text-right flex-1 pl-8">
                                                {isDomainAddress ? (
                                                    <div>
                                                        <div className="text-sm font-medium text-blue-400">{watchedRecipient}</div>
                                                        <div className="text-xs text-gray-500 font-mono break-all mt-1">
                                                            {resolvedAddress.slice(0, 12)}...{resolvedAddress.slice(-8)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-foreground font-mono break-all">
                                                        {resolvedAddress.slice(0, 12)}...{resolvedAddress.slice(-8)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-muted-foreground">Network Fee</span>
                                            <span className="text-sm text-foreground">~0.05 TON</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep("input")}
                                    className="h-14 bg-card border-border text-foreground hover:bg-muted rounded-xl font-bold"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleConfirmSend}
                                    disabled={isSending}
                                    className="h-14 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold"
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
                                <Icon icon="lucide:check" className="w-10 h-10 text-green-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">NFT Sent!</h2>
                            <p className="text-gray-400 mb-8">Your NFT has been transferred</p>

                            <div className="space-y-3">
                                {lastTxHash && (
                                    <Button
                                        variant="outline"
                                        onClick={() => window.open(`${EXPLORER_BASE_URL}/${lastTxHash}`, "_blank")}
                                        className="w-full h-12 bg-card border-border text-foreground hover:bg-muted rounded-xl"
                                    >
                                        <Icon icon="lucide:external-link" className="w-4 h-4 mr-2" />
                                        View on Explorer
                                    </Button>
                                )}
                                <Button
                                    onClick={() => router.push("/wallet")}
                                    className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold"
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
