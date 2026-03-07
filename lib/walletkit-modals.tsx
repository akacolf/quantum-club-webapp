"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { fromNano } from "@ton/core";
import { haptics } from "@/lib/haptics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWalletKitStore } from "@/stores/walletkit-store";
import { useShallow } from "zustand/shallow";

function DAppHeader({ dAppInfo }: { dAppInfo?: { name?: string; url?: string; iconUrl?: string } }) {
    return (
        <div className="flex items-center gap-4 mb-4">
            {dAppInfo?.iconUrl ? (
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                    <Image
                        src={dAppInfo.iconUrl}
                        alt={dAppInfo.name || "dApp"}
                        width={56}
                        height={56}
                        className="w-14 h-14 object-cover"
                        unoptimized
                    />
                </div>
            ) : (
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon icon="lucide:link-2" className="w-7 h-7 text-primary" />
                </div>
            )}
            <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-foreground truncate">
                    {dAppInfo?.name || "Unknown dApp"}
                </h2>
                {dAppInfo?.url && (
                    <p className="text-xs text-muted-foreground truncate">{dAppInfo.url}</p>
                )}
            </div>
        </div>
    );
}

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="w-full max-w-lg border bg-background p-6 shadow-lg rounded-t-2xl sm:rounded-2xl animate-in slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}

function ConnectionModal() {
    const { pendingConnection, approveConnection, rejectConnection } = useWalletKitStore(
        useShallow((s) => ({
            pendingConnection: s.pendingConnection,
            approveConnection: s.approveConnection,
            rejectConnection: s.rejectConnection,
        }))
    );

    if (!pendingConnection) return null;

    return (
        <ModalBackdrop onClose={rejectConnection}>
            <DAppHeader dAppInfo={pendingConnection.dAppInfo} />

            <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    This app wants to connect to your wallet. It will be able to:
                </p>
                <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-foreground">
                        <Icon icon="lucide:eye" className="w-4 h-4 text-blue-500" />
                        View your wallet address
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground">
                        <Icon icon="lucide:send" className="w-4 h-4 text-blue-500" />
                        Request transaction approvals
                    </li>
                </ul>
            </div>

            <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1 h-12" onClick={rejectConnection}>
                    Cancel
                </Button>
                <Button className="flex-1 h-12 bg-primary hover:bg-primary/90" onClick={() => { haptics.medium(); approveConnection(); }}>
                    Connect
                </Button>
            </div>
        </ModalBackdrop>
    );
}

function TransactionModal() {
    const { pendingTransaction, approveTransaction, rejectTransaction } = useWalletKitStore(
        useShallow((s) => ({
            pendingTransaction: s.pendingTransaction,
            approveTransaction: s.approveTransaction,
            rejectTransaction: s.rejectTransaction,
        }))
    );

    // Check validUntil expiration (matching demo-wallet pattern)
    const [isExpired, setIsExpired] = useState(false);
    useEffect(() => {
        if (!pendingTransaction) { setIsExpired(false); return; }
        const checkExpiration = () => {
            const validUntil = pendingTransaction.request?.valid_until;
            if (validUntil) {
                setIsExpired(validUntil < Math.floor(Date.now() / 1000));
            }
        };
        checkExpiration();
        const interval = setInterval(checkExpiration, 1000);
        return () => clearInterval(interval);
    }, [pendingTransaction]);

    if (!pendingTransaction) return null;

    const { preview, dAppInfo, request } = pendingTransaction;
    const messages = request?.messages || [];
    const isEmulationSuccess = preview?.result === "success";

    return (
        <ModalBackdrop onClose={rejectTransaction}>
            <DAppHeader dAppInfo={dAppInfo} />

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Icon icon="lucide:arrow-up-right" className="w-5 h-5 text-orange-500" />
                    <h3 className="font-semibold text-foreground">Transaction Request</h3>
                </div>

                {/* Message details */}
                <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                        {messages.map((msg, i) => (
                            <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">To</span>
                                    <span className="text-xs font-mono text-foreground truncate max-w-[200px]">
                                        {msg.address}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-muted-foreground">Amount</span>
                                    <span className="text-sm font-semibold text-foreground">
                                        {fromNano(msg.amount)} TON
                                    </span>
                                </div>
                                {msg.payload && (
                                    <div className="mt-1">
                                        <Badge variant="outline" className="text-[10px]">
                                            Has payload
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                {/* Emulation result */}
                {isEmulationSuccess && preview.result === "success" && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <Icon icon="lucide:check-circle" className="w-4 h-4" />
                            <span>Transaction simulated successfully</span>
                        </div>
                        {preview.moneyFlow && (
                            <div className="mt-2 space-y-1">
                                {preview.moneyFlow.outputs && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Total out</span>
                                        <span className="text-red-400">-{fromNano(preview.moneyFlow.outputs)} TON</span>
                                    </div>
                                )}
                                {preview.moneyFlow.inputs && BigInt(preview.moneyFlow.inputs) > 0n && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Total in</span>
                                        <span className="text-green-400">+{fromNano(preview.moneyFlow.inputs)} TON</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {preview?.result === "error" && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <Icon icon="lucide:alert-triangle" className="w-4 h-4" />
                            <span>Simulation failed - proceed with caution</span>
                        </div>
                    </div>
                )}
            </div>

            {isExpired && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                        <Icon icon="lucide:clock" className="w-4 h-4" />
                        <span>Transaction has expired</span>
                    </div>
                </div>
            )}

            <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1 h-12" onClick={rejectTransaction}>
                    Reject
                </Button>
                <Button
                    className="flex-1 h-12 bg-primary hover:bg-primary/90"
                    onClick={() => { haptics.medium(); approveTransaction(); }}
                    disabled={isExpired}
                >
                    <Icon icon="lucide:check" className="w-4 h-4 mr-2" />
                    Approve
                </Button>
            </div>
        </ModalBackdrop>
    );
}

function SignDataModal() {
    const { pendingSignData, approveSignData, rejectSignData } = useWalletKitStore(
        useShallow((s) => ({
            pendingSignData: s.pendingSignData,
            approveSignData: s.approveSignData,
            rejectSignData: s.rejectSignData,
        }))
    );

    if (!pendingSignData) return null;

    const { preview, dAppInfo } = pendingSignData;

    const previewContent = (() => {
        if (!preview) return null;
        if (preview.kind === "text") return preview.content;
        if (preview.kind === "binary") return `Binary data (${preview.content.length} bytes)`;
        if (preview.kind === "cell") return preview.schema || `Cell data`;
        return null;
    })();

    return (
        <ModalBackdrop onClose={rejectSignData}>
            <DAppHeader dAppInfo={dAppInfo} />

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Icon icon="lucide:pen-tool" className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold text-foreground">Sign Data Request</h3>
                </div>

                <p className="text-sm text-muted-foreground">
                    This app is asking you to sign data. This does not send a transaction.
                </p>

                {previewContent && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                        <span className="text-xs text-muted-foreground block mb-1">Data to sign</span>
                        <p className="text-sm text-foreground font-mono break-all">{previewContent}</p>
                    </div>
                )}

                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                        <Icon icon="lucide:alert-triangle" className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>Only sign data from apps you trust. Signing unknown data could be risky.</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1 h-12" onClick={rejectSignData}>
                    Reject
                </Button>
                <Button className="flex-1 h-12 bg-primary hover:bg-primary/90" onClick={() => { haptics.medium(); approveSignData(); }}>
                    <Icon icon="lucide:pen-tool" className="w-4 h-4 mr-2" />
                    Sign
                </Button>
            </div>
        </ModalBackdrop>
    );
}

export function WalletKitModals() {
    return (
        <>
            <ConnectionModal />
            <TransactionModal />
            <SignDataModal />
        </>
    );
}
