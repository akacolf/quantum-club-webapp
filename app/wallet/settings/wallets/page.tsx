"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet, StoredWallet } from "../../WalletContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { useForm } from "@tanstack/react-form";
import { walletRenameSchema } from "@/lib/validations";
import { Field, FieldError } from "@/components/ui/field";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


export default function ManageWalletsPage() {
  useTelegramBackButton("/wallet/settings");
  const router = useRouter();
  const {
    storedWallets,
    walletAddress,
    switchWallet,
    removeWallet,
    renameWallet
  } = useWallet();

  useEffect(() => {
    router.prefetch("/wallet/import");
  }, [router]);

  const [editingWallet, setEditingWallet] = useState<string | null>(null);

  const renameForm = useForm({
    defaultValues: { name: "" },
    validators: { onSubmit: walletRenameSchema },
    onSubmit: async ({ value }) => {
      if (editingWallet) {
        renameWallet(editingWallet, value.name.trim());
        haptics.light();
        toast.success("Wallet renamed!");
        setEditingWallet(null);
      }
    },
  });

  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied!");
  };

  const handleSwitchWallet = (address: string) => {
    if (address !== walletAddress) {
      switchWallet(address);
    }
  };

  const handleStartRename = (wallet: StoredWallet) => {
    setEditingWallet(wallet.address);
    renameForm.reset();
    renameForm.setFieldValue("name", wallet.name);
  };

  const handleDeleteWallet = (address: string) => {
    if (storedWallets.length === 1) {
      toast.error("Cannot delete the only wallet");
      return;
    }
    removeWallet(address);
    haptics.medium();
    toast.success("Wallet removed!");
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 pt-6 pb-24">
      <div className="max-w-lg mx-auto space-y-6">
        <div
          className="text-center space-y-2"
        >
          <Icon icon="lucide:wallet" className="mx-auto w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">Manage wallets</h1>
          <p className="text-muted-foreground text-sm">Switch between or manage your wallets</p>
        </div>

        {/* Wallet List */}
        <div className="space-y-3">
          {storedWallets.length > 0 ? (
            storedWallets.map((wallet, index) => (
              <div key={wallet.address}
              >
                <Card className="bg-card border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Icon icon="lucide:wallet" className={`w-5 h-5 shrink-0 ${wallet.address === walletAddress ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1 min-w-0">
                          {editingWallet === wallet.address ? (
                            <div className="flex items-center gap-2">
                              <renameForm.Field name="name">
                                {(field) => (
                                  <Field>
                                    <Input
                                      type="text"
                                      value={field.state.value}
                                      onChange={(e) => field.handleChange(e.target.value)}
                                      onBlur={field.handleBlur}
                                      className="bg-muted border border-border rounded-lg px-3 py-1.5 text-foreground text-sm flex-1 min-w-0 focus:outline-none focus:border-primary"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") renameForm.handleSubmit();
                                        if (e.key === "Escape") setEditingWallet(null);
                                      }}
                                    />
                                    <FieldError errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />
                                  </Field>
                                )}
                              </renameForm.Field>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => renameForm.handleSubmit()}
                                className="h-8 w-8 shrink-0 text-green-500 hover:bg-green-500/20"
                              >
                                <Icon icon="lucide:check" className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground truncate">{wallet.name}</span>
                                {wallet.address === walletAddress && (
                                  <span className="text-xs font-medium text-green-400 shrink-0">Active</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-muted-foreground text-sm font-mono truncate">
                                  {formatAddress(wallet.address)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopyAddress(wallet.address)}
                                  className="h-auto w-auto p-0 text-muted-foreground hover:text-foreground hover:bg-transparent shrink-0"
                                >
                                  <Icon icon="lucide:copy" className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {editingWallet !== wallet.address && (
                        <div className="flex items-center gap-1 shrink-0">
                          {wallet.address !== walletAddress && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSwitchWallet(wallet.address)}
                              className="text-primary hover:bg-primary/20 text-xs px-2"
                            >
                              Switch
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleStartRename(wallet)}
                            className="h-8 w-8 text-muted-foreground hover:bg-muted"
                          >
                            <Icon icon="lucide:edit-2" className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:bg-destructive/20"
                                disabled={storedWallets.length === 1}
                              >
                                <Icon icon="lucide:trash-2" className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-0 text-foreground">
                              <AlertDialogHeader className="text-left">
                                <AlertDialogTitle>Remove this wallet?</AlertDialogTitle>
                                <AlertDialogDescription className="text-left text-muted-foreground">
                                  This wallet will be removed from this device. You will need your recovery phrase to restore it later.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-muted border-0 text-foreground hover:bg-accent">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteWallet(wallet.address)}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>


                  </CardContent>
                </Card>
              </div>
            ))
          ) : (
            <Card className="bg-card border-0">
              <CardContent className="p-8 text-center">
                <Icon icon="lucide:wallet" className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No wallets found</p>
                <p className="text-muted-foreground/60 text-sm mt-1">Create or import a wallet to get started</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Wallet Button */}
        <div
          className="space-y-3"
        >
          <Button
            className="w-full bg-card border-0 text-foreground hover:bg-muted h-14"
            disabled={storedWallets.length >= 5}
            asChild
          >
            <Link href="/wallet/import">
              <Icon icon="lucide:plus" className="w-5 h-5 mr-2" />
              Import Another Wallet
            </Link>
          </Button>
        </div>

        {/* Info */}
        <div className="text-center text-muted-foreground text-sm">
          <p>You can manage up to 5 wallets</p>
          <p className="text-xs mt-1">{storedWallets.length}/5 wallets</p>
        </div>
      </div>
    </div>
  );
}
