"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet, StoredWallet } from "../../WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Plus,
  Trash2,
  Check,
  Edit2,
  Copy,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";

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

  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
    setEditName(wallet.name);
  };

  const handleSaveRename = (address: string) => {
    if (editName.trim()) {
      renameWallet(address, editName.trim());
      toast.success("Wallet renamed!");
    }
    setEditingWallet(null);
  };

  const handleDeleteWallet = (address: string) => {
    if (storedWallets.length === 1) {
      toast.error("Cannot delete the only wallet");
      return;
    }
    removeWallet(address);
    setConfirmDelete(null);
    toast.success("Wallet removed!");
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 pt-6 pb-24">
      <div className="max-w-lg mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="mx-auto w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center ring-1 ring-blue-500/20">
            <Wallet className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold">Manage Wallets</h1>
          <p className="text-gray-400 text-sm">Switch between or manage your wallets</p>
        </motion.div>

        {/* Wallet List */}
        <div className="space-y-3">
          {storedWallets.length > 0 ? (
            storedWallets.map((wallet, index) => (
              <motion.div
                key={wallet.address}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`bg-[#111] border-[#222] ${wallet.address === walletAddress ? 'ring-2 ring-blue-500/50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${wallet.address === walletAddress ? 'bg-blue-500/20' : 'bg-[#1a1a1a]'}`}>
                          <Wallet className={`w-5 h-5 ${wallet.address === walletAddress ? 'text-blue-400' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingWallet === wallet.address ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1.5 text-white text-sm flex-1 focus:outline-none focus:border-blue-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveRename(wallet.address);
                                  if (e.key === "Escape") setEditingWallet(null);
                                }}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSaveRename(wallet.address)}
                                className="h-8 w-8 text-green-500 hover:bg-green-500/20"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">{wallet.name}</span>
                                {wallet.address === walletAddress && (
                                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 text-xs py-0 px-1.5">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-gray-500 text-sm font-mono">
                                  {formatAddress(wallet.address)}
                                </span>
                                <button
                                  onClick={() => handleCopyAddress(wallet.address)}
                                  className="text-gray-500 hover:text-gray-300"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {editingWallet !== wallet.address && (
                        <div className="flex items-center gap-1">
                          {wallet.address !== walletAddress && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSwitchWallet(wallet.address)}
                              className="text-blue-400 hover:bg-blue-500/20 text-xs"
                            >
                              Switch
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleStartRename(wallet)}
                            className="h-8 w-8 text-gray-400 hover:bg-[#1a1a1a]"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setConfirmDelete(wallet.address)}
                            className="h-8 w-8 text-red-400 hover:bg-red-500/20"
                            disabled={storedWallets.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Delete Confirmation */}
                    <AnimatePresence>
                      {confirmDelete === wallet.address && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-[#222]">
                            <div className="flex items-center gap-2 text-yellow-500 mb-3">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-sm">Remove this wallet?</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 bg-[#1a1a1a] border-[#333] text-white hover:bg-[#222]"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleDeleteWallet(wallet.address)}
                                className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card className="bg-[#111] border-[#222]">
              <CardContent className="p-8 text-center">
                <Wallet className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                <p className="text-gray-400">No wallets found</p>
                <p className="text-gray-500 text-sm mt-1">Create or import a wallet to get started</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Wallet Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: storedWallets.length * 0.05 + 0.1 }}
          className="space-y-3"
        >
          <Button
            onClick={() => router.push("/wallet/import")}
            className="w-full bg-[#111] border border-[#222] text-white hover:bg-[#1a1a1a] h-14"
            disabled={storedWallets.length >= 5}
          >
            <Plus className="w-5 h-5 mr-2" />
            Import Another Wallet
          </Button>
        </motion.div>

        {/* Info */}
        <div className="text-center text-gray-500 text-sm">
          <p>You can manage up to 5 wallets</p>
          <p className="text-xs mt-1">{storedWallets.length}/5 wallets</p>
        </div>
      </div>
    </div>
  );
}
