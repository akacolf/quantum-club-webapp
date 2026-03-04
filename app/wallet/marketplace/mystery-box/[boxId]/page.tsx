"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useMysteryBoxQuery, useClaimMysteryBoxMutation } from "@/app/(hooks)/queries/use-mystery-box";
import { toast } from "sonner";

export default function MysteryBoxDetailPage() {
    useTelegramBackButton("/wallet/marketplace");
    const params = useParams();
    const boxId = params.boxId as string;

    const { data: box, isLoading } = useMysteryBoxQuery(boxId);
    const claimMutation = useClaimMysteryBoxMutation();

    const [showReveal, setShowReveal] = useState(false);
    const [revealComplete, setRevealComplete] = useState(false);

    const handleClaim = async (paymentMethod: "ton" | "qntm") => {
        if (!box) return;
        claimMutation.mutate(
            { boxId, paymentMethod },
            {
                onSuccess: () => {
                    setShowReveal(true);
                    // Animate reveal
                    setTimeout(() => setRevealComplete(true), 2000);
                    toast.success("Mystery box claimed!");
                },
                onError: (error) => {
                    toast.error(error instanceof Error ? error.message : "Failed to claim");
                },
            }
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background p-4">
                <div className="space-y-4 max-w-md mx-auto">
                    <Skeleton className="w-full aspect-square rounded-2xl" />
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        );
    }

    if (!box) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-2">
                    <Icon icon="solar:box-linear" className="w-12 h-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">Mystery box not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md mx-auto space-y-6"
            >
                {/* Box Image */}
                <Card className="bg-card border-border overflow-hidden rounded-2xl">
                    <div className="relative w-full aspect-square bg-muted">
                        <AnimatePresence mode="wait">
                            {showReveal ? (
                                <motion.div
                                    key="reveal"
                                    initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                                    animate={revealComplete
                                        ? { scale: 1, opacity: 1, rotate: 0 }
                                        : { scale: [0.5, 1.2, 0.9, 1.1], opacity: 1, rotate: [0, -5, 5, 0] }
                                    }
                                    transition={revealComplete
                                        ? { duration: 0.3 }
                                        : { duration: 1.5, repeat: Infinity, repeatType: "reverse" }
                                    }
                                    className="absolute inset-0 flex items-center justify-center"
                                >
                                    {revealComplete ? (
                                        <div className="text-center space-y-2">
                                            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                                                <Icon icon="solar:gift-bold" className="w-10 h-10 text-primary" />
                                            </div>
                                            <p className="text-lg font-bold">Claimed!</p>
                                            <p className="text-sm text-muted-foreground">Check your wallet for your NFT</p>
                                        </div>
                                    ) : (
                                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
                                            <Icon icon="solar:box-bold" className="w-12 h-12 text-white" />
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div key="image" className="absolute inset-0">
                                    {box.image ? (
                                        <Image
                                            src={box.image}
                                            alt={box.name}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-600/20">
                                            <Icon icon="solar:box-bold" className="w-16 h-16 text-primary" />
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <Badge className="absolute top-3 right-3 bg-primary">
                            {box.remaining}/{box.totalAvailable} left
                        </Badge>
                    </div>
                </Card>

                {/* Box Info */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">{box.name}</h1>
                    <p className="text-sm text-muted-foreground">{box.description}</p>
                </div>

                {/* Price */}
                <Card className="bg-card border-border">
                    <CardContent className="p-4 space-y-3">
                        <h3 className="text-xs text-muted-foreground uppercase">Price</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 text-center">
                                <p className="text-xl font-bold">{box.price.ton} TON</p>
                            </div>
                            {box.price.qntm && (
                                <>
                                    <span className="text-muted-foreground">or</span>
                                    <div className="flex-1 text-center">
                                        <p className="text-xl font-bold">{box.price.qntm.toLocaleString()} QNTM</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                {!showReveal && box.remaining > 0 && (
                    <div className="space-y-3">
                        <Button
                            onClick={() => handleClaim("ton")}
                            disabled={claimMutation.isPending}
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold"
                        >
                            {claimMutation.isPending ? (
                                <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Icon icon="solar:box-bold" className="w-4 h-4 mr-2" />
                                    Open Box ({box.price.ton} TON)
                                </>
                            )}
                        </Button>
                        {box.price.qntm && (
                            <Button
                                onClick={() => handleClaim("qntm")}
                                disabled={claimMutation.isPending}
                                variant="outline"
                                className="w-full h-12 rounded-xl font-bold"
                            >
                                Open with {box.price.qntm.toLocaleString()} QNTM
                            </Button>
                        )}
                    </div>
                )}

                {box.remaining === 0 && !showReveal && (
                    <div className="bg-muted rounded-xl p-4 text-center">
                        <p className="text-sm text-muted-foreground font-medium">Sold Out</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
