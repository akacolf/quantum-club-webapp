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
import { useTrading } from "@/app/(contexts)/TradingContext";
import { useWallet } from "@/app/wallet/WalletContext";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { toast } from "sonner";
import { PLATFORM_FEES } from "@/types/trading";
import { isDevelopment } from "@/lib/dev-utils";
import { storage } from "@/app/(firebase)/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function CreateTokenPage() {
    const router = useRouter();
    const { createToken } = useTrading();
    const { walletAddress, tonBalance } = useWallet();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Telegram back button
    useTelegramBackButton("/trade");

    // Prefetch trade page for faster navigation after creation
    useEffect(() => {
        router.prefetch("/trade");
    }, [router]);

    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
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

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type (including GIF)
        const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Please select a PNG, JPG, GIF, or WebP image");
            return;
        }

        // Validate file size (max 2MB - plenty for token icons)
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Image must be less than 2MB");
            return;
        }

        setIsUploading(true);

        try {
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            // Upload to Firebase Storage
            const fileExtension = file.name.split('.').pop() || 'png';
            const fileName = `token-images/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
            const storageRef = ref(storage, fileName);

            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            setFormData(prev => ({ ...prev, image: downloadURL }));
            toast.success("Image uploaded successfully");
        } catch (error) {
            console.error("Image upload error:", error);
            toast.error("Failed to upload image");
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

        if (!walletAddress) {
            toast.error("Please connect your wallet first");
            router.push("/wallet");
            return;
        }

        if (!validateForm()) {
            return;
        }

        // Check balance for creation fee (skip in dev mode)
        const balance = parseFloat(tonBalance || "0");
        const creationFee = parseFloat(PLATFORM_FEES.creationFee);

        if (!isDevelopment && balance < creationFee) {
            toast.error(`Insufficient balance. Need ${creationFee} TON to create a token.`);
            return;
        }

        setIsLoading(true);

        try {
            const token = await createToken({
                name: formData.name.trim(),
                symbol: formData.symbol.trim().toUpperCase(),
                description: formData.description.trim(),
                image: formData.image.trim(),
            });

            if (token) {
                toast.success("Token created successfully! 🚀");
                router.push(`/trade/${token.id}`);
            } else {
                toast.error("Failed to create token. Please try again.");
            }
        } catch {
            toast.error("An error occurred. Please try again.");
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
                                <h3 className="font-semibold text-white">Token Protections</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:lock-bold" className="w-4 h-4 text-green-400" />
                                    <span className="text-xs text-muted-foreground">Locked Liquidity</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:users-group-rounded-bold" className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs text-muted-foreground">Fair Launch</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:rocket-2-bold" className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs text-muted-foreground">Auto DEX at $69K</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:hand-money-bold" className="w-4 h-4 text-amber-400" />
                                    <span className="text-xs text-muted-foreground">{PLATFORM_FEES.creatorFeePercent}% Creator Fee</span>
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
                                                <Icon icon="solar:spinner-bold" className="w-6 h-6 text-muted-foreground animate-spin" />
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
                                        placeholder="e.g., Quantum Coin"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
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

                        {/* Fee Info */}
                        <Alert className="bg-white/5 border-white/10">
                            <Icon icon="solar:info-circle-bold" className="w-4 h-4" />
                            <AlertDescription className="text-muted-foreground">
                                <span className="font-medium text-white">Creation Fee: {PLATFORM_FEES.creationFee} TON</span>
                                <br />
                                <span className="text-sm">
                                    Trading Fee: {PLATFORM_FEES.tradingFeePercent}% (split between platform and you as creator)
                                </span>
                            </AlertDescription>
                        </Alert>



                        {/* Submit Button - White background with black text */}
                        <Button
                            type="submit"
                            className="w-full h-12 bg-white hover:bg-white/90 text-black font-semibold"
                            disabled={isLoading || !walletAddress}
                        >
                            {isLoading ? (
                                <>
                                    <Icon icon="solar:spinner-bold" className="w-5 h-5 mr-2 animate-spin" />
                                    Creating Token...
                                </>
                            ) : !walletAddress ? (
                                <>
                                    <Icon icon="solar:wallet-bold" className="w-5 h-5 mr-2" />
                                    Connect QC Wallet First
                                </>
                            ) : (
                                <>
                                    <Icon icon="solar:rocket-bold" className="w-5 h-5 mr-2" />
                                    Launch Token
                                </>
                            )}
                        </Button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
