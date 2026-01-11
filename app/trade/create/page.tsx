"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useTrading } from "@/app/(contexts)/TradingContext";
import { useWallet } from "@/app/wallet/WalletContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { toast } from "sonner";
import { MIN_INITIAL_BUY, MAX_INITIAL_BUY, MAX_SUPPLY_FORMATTED } from "@/types/trading";
import { ButtonLoader } from "@/app/(components)/ButtonLoader";
import { useGameContext } from "@/app/(contexts)/MiningContext";

export default function CreateTokenPage() {
    const router = useRouter();
    const { createToken, refreshTokens } = useTrading();
    const { walletAddress, setWalletAddress } = useWallet();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { telegramId } = useGameContext();
    // Telegram back button
    useTelegramBackButton("/trade");

    // Check for wallet from localStorage directly to handle SSR timing issues
    const [effectiveWalletAddress, setEffectiveWalletAddress] = useState<string>("");
    
    useEffect(() => {
        // First check localStorage directly (handles SSR hydration timing)
        const storedWallet = localStorage.getItem(`quantum_wallet_address_${telegramId}`);
        if (storedWallet && storedWallet !== "") {
            setEffectiveWalletAddress(storedWallet);
            // Also update context if needed
            if (!walletAddress || walletAddress === "") {
                setWalletAddress(storedWallet);
            }
        } else {
            // Wallet was cleared (logout) - update state
            setEffectiveWalletAddress("");
        }
    }, [walletAddress, setWalletAddress]);

    // Update effectiveWalletAddress when context updates (including when cleared)
    useEffect(() => {
        // Sync with context - handles both setting and clearing
        setEffectiveWalletAddress(walletAddress || "");
    }, [walletAddress]);

    // Prefetch trade page for faster navigation after creation
    useEffect(() => {
        router.prefetch("/trade");
    }, [router]);

    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [initialBuyAmount, setInitialBuyAmount] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        symbol: "",
        description: "",
        image: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = "Token name is required";
        } else if (formData.name.length > 32) {
            newErrors.name = "Token name must be 32 characters or less";
        }

        if (!formData.symbol.trim()) {
            newErrors.symbol = "Token symbol is required";
        } else if (formData.symbol.length > 10) {
            newErrors.symbol = "Token symbol must be 10 characters or less";
        } else if (!/^[A-Za-z0-9]+$/.test(formData.symbol)) {
            newErrors.symbol = "Token symbol can only contain letters and numbers";
        }

        if (formData.description && formData.description.length > 500) {
            newErrors.description = "Description must be 500 characters or less";
        }

        // Validate initial buy amount
        const buyAmount = parseFloat(initialBuyAmount || "0");
        if (buyAmount > 0) {
            if (buyAmount < MIN_INITIAL_BUY) {
                newErrors.initialBuy = `Minimum initial buy is ${MIN_INITIAL_BUY} TON`;
            } else if (buyAmount > MAX_INITIAL_BUY) {
                newErrors.initialBuy = `Maximum initial buy is ${MAX_INITIAL_BUY} TON`;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Calculate total cost (deployment + network fees buffer + optional initial buy)
    const initialBuyValue = parseFloat(initialBuyAmount || "0");
    const minBalanceRequired = 0.1; // Minimum 0.1 TON for deployment + network fees
    const totalCost = minBalanceRequired + (initialBuyValue > 0 ? initialBuyValue : 0);

    // Compress image to fit within Firestore limits (< 1MB)
    const compressImage = (file: File, maxSize: number = 512): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement("img");
                img.onload = () => {
                    // Calculate new dimensions (max 512x512)
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = Math.round((width * maxSize) / height);
                            height = maxSize;
                        }
                    }

                    // Create canvas and draw resized image
                    const canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                        reject(new Error("Could not get canvas context"));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to JPEG with compression (quality 0.8)
                    const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);

                    // Check final size (should be well under 1MB for 512x512)
                    const sizeInBytes = Math.round((compressedBase64.length * 3) / 4);
                    if (sizeInBytes > 900000) {
                        // If still too large, compress more
                        const moreCompressed = canvas.toDataURL("image/jpeg", 0.5);
                        resolve(moreCompressed);
                    } else {
                        resolve(compressedBase64);
                    }
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Handle image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Please select a PNG, JPG, GIF, or WebP image");
            return;
        }

        setIsUploading(true);

        try {
            // Special handling for GIFs to preserve animation
            if (file.type === "image/gif") {
                // GIFs must be under 800KB to store in Firestore
                const maxGifSize = 800 * 1024;
                if (file.size > maxGifSize) {
                    toast.error("Animated GIFs must be under 800KB. Please use a smaller GIF.");
                    setIsUploading(false);
                    return;
                }

                // Read GIF as base64 directly (preserves animation)
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    setImagePreview(base64);
                    setFormData(prev => ({ ...prev, image: base64 }));
                    const sizeKB = Math.round(file.size / 1024);
                    toast.success(`GIF uploaded (${sizeKB}KB)`);
                    setIsUploading(false);
                };
                reader.onerror = () => {
                    toast.error("Failed to read GIF");
                    setIsUploading(false);
                };
                reader.readAsDataURL(file);
                return;
            }

            // For non-GIF images: validate size and compress
            if (file.size > 10 * 1024 * 1024) {
                toast.error("Image must be less than 10MB");
                setIsUploading(false);
                return;
            }

            // Compress image to 512x512 JPEG (typically ~50-100KB)
            const compressedBase64 = await compressImage(file, 512);

            // Set preview and form data
            setImagePreview(compressedBase64);
            setFormData(prev => ({ ...prev, image: compressedBase64 }));

            const sizeKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
            toast.success(`Image compressed to ${sizeKB}KB`);
        } catch (error) {
            console.error("Image compression error:", error);
            toast.error("Failed to process image");
            setImagePreview(null);
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = () => {
        setImagePreview(null);
        setFormData(prev => ({ ...prev, image: "" }));
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!effectiveWalletAddress) {
            toast.error("Please connect your wallet first");
            router.push("/wallet");
            return;
        }

        if (!validateForm()) {
            return;
        }

        // Note: Balance check removed - let the blockchain handle insufficient funds
        // This allows users with borderline balances to attempt deployment

        setIsLoading(true);

        try {
            toast.info("Creating and deploying token...", { duration: 5000 });

            const token = await createToken({
                name: formData.name.trim(),
                symbol: formData.symbol.trim().toUpperCase(),
                description: formData.description.trim(),
                image: formData.image.trim(),
                initialBuyAmount: initialBuyValue > 0 ? initialBuyAmount : undefined,
            });

            if (!token) {
                toast.error("Failed to create token. Please try again.");
                setIsLoading(false);
                return;
            }

            toast.success(`${token.symbol} created on TON!`, {
                description: token.jettonMasterAddress
                    ? `Contract: ${token.jettonMasterAddress.slice(0, 12)}...`
                    : "Deployment in progress...",
            });

            refreshTokens();
            router.push(`/trade/${token.id}`);
        } catch (err) {
            console.error("Token creation error:", err);
            const errorMessage = err instanceof Error ? err.message : "An error occurred. Please try again.";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 pb-32">
            {/* Header - No back button, using Telegram's native back button */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5">
                <div className="px-4 py-4">
                    <h1 className="text-xl font-bold text-white">Create Token</h1>
                    <p className="text-sm text-muted-foreground">Launch your token on TON</p>
                </div>
            </div>

            <div className="px-4 py-6 max-w-md mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Token Protections - Unified Card */}
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 mb-6">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Icon icon="solar:shield-check-bold" className="w-5 h-5 text-primary" />
                                <h3 className="font-semibold text-white">Platform Utilities</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:lock-bold" className="w-4 h-4 text-green-400" />
                                    <span className="text-xs text-muted-foreground">Locked Liquidity</span>
                                </div>
                
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:rocket-2-bold" className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs text-muted-foreground">Auto DEX at 2,000 TON</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:hand-money-bold" className="w-4 h-4 text-amber-400" />
                                    <span className="text-xs text-muted-foreground">Referral Program</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:users-group-rounded-bold" className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs text-muted-foreground">Fair Launch</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card className="bg-white/5 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">Token Details</CardTitle>
                                <CardDescription>Enter your token information</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Token Image Upload */}
                                <div className="space-y-2">
                                    <Label className="text-white">Token Image</Label>
                                    <div className="flex items-center gap-4">
                                        {/* Image Preview / Upload Button */}
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="relative w-20 h-20 rounded-xl border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 hover:border-white/30 transition-all overflow-hidden"
                                        >
                                            {imagePreview ? (
                                                <>
                                                    <Image
                                                        src={imagePreview}
                                                        alt="Token preview"
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeImage();
                                                        }}
                                                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                                                    >
                                                        <Icon icon="solar:close-circle-bold" className="w-4 h-4 text-white" />
                                                    </button>
                                                </>
                                            ) : isUploading ? (
                                                <ButtonLoader />
                                            ) : (
                                                <Icon icon="solar:camera-add-bold" className="w-6 h-6 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-white mb-1">Upload an image for your token</p>
                                            <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WebP up to 5MB</p>
                                        </div>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                </div>

                                {/* Token Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-white">Token Name *</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="e.g., Quantum Club"
                                        value={formData.name}
                                        onChange={(e) => {
                                            setFormData({ ...formData, name: e.target.value });
                                            if (errors.name) {
                                                const newErrors = { ...errors };
                                                delete newErrors.name;
                                                setErrors(newErrors);
                                            }
                                        }}
                                        className={`bg-white/5 border-white/10 text-white placeholder:text-muted-foreground ${errors.name ? "border-red-500" : ""
                                            }`}
                                        maxLength={32}
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-red-400">{errors.name}</p>
                                    )}
                                </div>

                                {/* Token Symbol */}
                                <div className="space-y-2">
                                    <Label htmlFor="symbol" className="text-white">Token Symbol *</Label>
                                    <Input
                                        id="symbol"
                                        type="text"
                                        placeholder="e.g., QNTM"
                                        value={formData.symbol}
                                        onChange={(e) => {
                                            setFormData({ ...formData, symbol: e.target.value.toUpperCase() });
                                            if (errors.symbol) {
                                                const newErrors = { ...errors };
                                                delete newErrors.symbol;
                                                setErrors(newErrors);
                                            }
                                        }}
                                        className={`bg-white/5 border-white/10 text-white placeholder:text-muted-foreground uppercase ${errors.symbol ? "border-red-500" : ""
                                            }`}
                                        maxLength={10}
                                    />
                                    {errors.symbol && (
                                        <p className="text-xs text-red-400">{errors.symbol}</p>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-white">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Tell us about your token..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className={`bg-white/5 border-white/10 text-white placeholder:text-muted-foreground min-h-[100px] resize-none ${errors.description ? "border-red-500" : ""
                                            }`}
                                        maxLength={500}
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        {errors.description && (
                                            <p className="text-red-400">{errors.description}</p>
                                        )}
                                        <span className="ml-auto">{formData.description.length}/500</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/5 border-white/10 overflow-hidden">
                            <CardHeader className="pb-4 relative bg-white/[0.02]">
                                <div className="flex items-center justify-between">
                                    <div className="pr-4">
                                        <CardTitle className="text-white text-base flex items-center gap-1.5">
                                            <Icon icon="solar:bag-heart-bold" className="w-5 h-5 text-primary" />
                                            Initial Buy
                                            <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            Be the first to buy your token at the lowest price.
                                        </CardDescription>
                                    </div>
                                    <Switch
                                        checked={parseFloat(initialBuyAmount || "0") > 0}
                                        onCheckedChange={(checked) => {
                                            if (!checked) setInitialBuyAmount("");
                                            else setInitialBuyAmount("1");
                                        }}
                                        className="data-[state=checked]:bg-primary shrink-0"
                                    />
                                </div>
                            </CardHeader>
                            {parseFloat(initialBuyAmount || "0") > 0 || initialBuyAmount !== "" ? (
                                <CardContent className="space-y-6 pt-6 animate-in slide-in-from-top-4 duration-300">
                                    {/* Amount Display */}
                                    <div className="flex flex-col items-center justify-center py-2">
                                        <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                                            {initialBuyAmount || "0"}<span className="text-lg text-primary">TON</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 text-center max-w-[200px]">
                                            You will receive tokens worth {initialBuyAmount || "0"} TON instantly
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <Slider
                                            value={[parseFloat(initialBuyAmount || "0")]}
                                            onValueChange={([value]) => setInitialBuyAmount(value.toString())}
                                            min={0}
                                            max={MAX_INITIAL_BUY}
                                            step={0.5}
                                            className="w-full"
                                        />

                                        {/* Quick amount buttons */}
                                        <div className="grid grid-cols-5 gap-2">
                                            {[1, 5, 10, 25, 50].map((amount) => (
                                                <Button
                                                    key={amount}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setInitialBuyAmount(amount.toString())}
                                                    className={`h-9 text-xs font-medium transition-all ${parseFloat(initialBuyAmount) === amount
                                                        ? "bg-primary text-black border-primary hover:bg-primary/90"
                                                        : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
                                                        }`}
                                                >
                                                    {amount}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {errors.initialBuy && (
                                        <p className="text-xs text-red-400 text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                                            {errors.initialBuy}
                                        </p>
                                    )}

                                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex gap-3 items-start">
                                        <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-emerald-300 leading-relaxed">
                                            Buying initially secures your position at the best possible entry price.
                                            This amount will be added to your total creation cost.
                                        </p>
                                    </div>
                                </CardContent>
                            ) : null}
                        </Card>

                        {/* Token Info */}
                        <Card className="bg-white/5 border-white/10">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Icon icon="solar:info-circle-bold" className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Token Details</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="p-2 rounded-lg bg-white/5">
                                        <p className="text-muted-foreground mb-1">Max Supply</p>
                                        <p className="text-white font-medium">{MAX_SUPPLY_FORMATTED}</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/5">
                                        <p className="text-muted-foreground mb-1">Graduation</p>
                                        <p className="text-white font-medium">2,000 TON</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/5 flex items-center justify-between">
                                        <div>
                                            <p className="text-muted-foreground mb-1">DEX</p>
                                            <p className="text-white font-medium">STON.fi</p>
                                        </div>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button type="button" className="focus:outline-none">
                                                    <Icon icon="solar:info-circle-bold" className="w-4 h-4 text-muted-foreground/50 hover:text-white transition-colors" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-2 text-xs bg-black/90 border-white/10 text-white" side="top">
                                                <p>Migrates to after graduation</p>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Alert className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border-green-500/20">
                            <Icon icon="solar:gas-station-bold" className="w-4 h-4 text-green-400" />
                            <AlertDescription className="text-muted-foreground">
                                <span className="font-medium text-green-400">Deployment Cost</span>
                                <br />
                                <span className="text-xs">
                                    Gas: ~0.05-0.1 TON
                                </span>
                                {initialBuyValue > 0 && (
                                    <>
                                        <br />
                                        <span className="text-xs">
                                            Initial Buy: {initialBuyValue} TON
                                        </span>
                                    </>
                                )}
                                <br />
                                <span className="text-xs font-medium">
                                    Total: ~{totalCost.toFixed(2)} TON
                                </span>
                            </AlertDescription>
                        </Alert>



                        {/* Submit Button - White background with black text */}
                        <Button
                            type="submit"
                            className="w-full h-12 bg-white hover:bg-white/90 text-black font-semibold"
                            disabled={isLoading || !effectiveWalletAddress}
                        >
                            {isLoading ? (
                                <>
                                    <ButtonLoader />
                                    <span className="ml-2">Creating token...</span>
                                </>
                            ) : !effectiveWalletAddress ? (
                                <>
                                    <Icon icon="solar:wallet-bold" className="w-5 h-5 mr-2" />
                                    Connect QC Wallet first
                                </>
                            ) : (
                                <>
                                    <Icon icon="solar:rocket-bold" className="w-5 h-5 mr-2" />
                                    Launch token
                                </>
                            )}
                        </Button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
