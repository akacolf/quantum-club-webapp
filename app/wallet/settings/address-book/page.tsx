"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, Check, X, User, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { toast } from "sonner";
import { Address } from "@ton/core";
import { useWallet } from "../../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";

interface SavedAddress {
    address: string;
    name: string;
    createdAt: number;
}

const STORAGE_KEY = "quantum_address_book";

export default function AddressBookPage() {
    useTelegramBackButton("/wallet/settings");
    const { isTestnet } = useWallet();

    const [addresses, setAddresses] = useState<SavedAddress[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingAddress, setEditingAddress] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [newAddress, setNewAddress] = useState("");
    const [editName, setEditName] = useState("");
    const [addressError, setAddressError] = useState("");
    const { telegramId } = useUserContext();
    // Format address for display
    const formatAddress = useCallback((address: string): string => {
        try {
            const addr = Address.parse(address);
            return addr.toString({ bounceable: false, testOnly: isTestnet });
        } catch {
            return address;
        }
    }, [isTestnet]);

    // Slice address for compact display (e.g., "UQBx...abc1")
    const sliceAddress = (address: string): string => {
        if (address.length <= 16) return address;
        return `${address.slice(0, 8)}...${address.slice(-8)}`;
    };

    // Load from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY+`_${telegramId}`);
        if (stored) {
            setAddresses(JSON.parse(stored));
        }
    }, []);

    // Save to localStorage
    const saveAddresses = (newAddresses: SavedAddress[]) => {
        setAddresses(newAddresses);
        localStorage.setItem(STORAGE_KEY+`_${telegramId}`, JSON.stringify(newAddresses));
    };

    const validateAddress = (addr: string): boolean => {
        try {
            Address.parse(addr);
            setAddressError("");
            return true;
        } catch {
            setAddressError("Invalid TON address");
            return false;
        }
    };

    const handleAdd = () => {
        if (!newName.trim()) {
            toast.error("Please enter a name");
            return;
        }
        if (!newAddress.trim()) {
            toast.error("Please enter an address");
            return;
        }
        if (!validateAddress(newAddress)) {
            return;
        }
        if (addresses.some(a => a.address.toLowerCase() === newAddress.toLowerCase())) {
            toast.error("Address already saved");
            return;
        }

        const newEntry: SavedAddress = {
            address: formatAddress(newAddress),
            name: newName.trim(),
            createdAt: Date.now(),
        };
        saveAddresses([...addresses, newEntry]);
        setNewName("");
        setNewAddress("");
        setIsAdding(false);
        toast.success("Address saved!");
    };

    const handleDelete = (address: string) => {
        saveAddresses(addresses.filter(a => a.address !== address));
        toast.success("Address removed");
    };

    const handleEdit = (address: string) => {
        const entry = addresses.find(a => a.address === address);
        if (entry) {
            setEditingAddress(address);
            setEditName(entry.name);
        }
    };

    const handleSaveEdit = () => {
        if (!editName.trim()) {
            toast.error("Name cannot be empty");
            return;
        }
        saveAddresses(
            addresses.map(a =>
                a.address === editingAddress ? { ...a, name: editName.trim() } : a
            )
        );
        setEditingAddress(null);
        toast.success("Name updated");
    };

    const copyAddress = (address: string) => {
        navigator.clipboard.writeText(address);
        toast.success("Address copied!");
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-4 pt-6 pb-24">
            <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold">Address Book</h1>
                    <Button
                        size="sm"
                        onClick={() => setIsAdding(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 rounded-xl px-4 font-semibold shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                    </Button>
                </div>

                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <Card className="bg-card border-border mb-4">
                                <CardContent className="p-4 space-y-3">
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Name (e.g., My Friend)"
                                        className="bg-muted border-border text-foreground"
                                    />
                                    <Input
                                        value={newAddress}
                                        onChange={(e) => {
                                            setNewAddress(e.target.value);
                                            if (e.target.value) validateAddress(e.target.value);
                                        }}
                                        placeholder="TON Address"
                                        className={`bg-muted border-border text-foreground font-mono text-sm ${addressError ? "border-destructive" : ""
                                            }`}
                                    />
                                    {addressError && (
                                        <p className="text-xs text-destructive">{addressError}</p>
                                    )}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsAdding(false);
                                                setNewName("");
                                                setNewAddress("");
                                                setAddressError("");
                                            }}
                                            className="flex-1 bg-muted border-border text-foreground"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleAdd}
                                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {addresses.length === 0 && !isAdding ? (
                    <div className="text-center py-12">
                        <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No saved addresses</p>
                        <p className="text-sm text-muted-foreground/50 mt-1">
                            Add frequently used addresses for quick access
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {addresses.map((entry) => (
                            <Card key={entry.address} className="bg-card border-border">
                                <CardContent className="p-4">
                                    {editingAddress === entry.address ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="bg-muted border-border text-foreground flex-1"
                                                autoFocus
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={handleSaveEdit}
                                                className="text-green-500 hover:text-green-400"
                                            >
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => setEditingAddress(null)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex flex-col gap-1.5 min-w-0">
                                                <div className="font-semibold text-foreground text-base leading-none truncate">{entry.name}</div>
                                                <button
                                                    onClick={() => copyAddress(entry.address)}
                                                    className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono hover:text-foreground transition-colors text-left w-fit"
                                                >
                                                    {sliceAddress(entry.address)}
                                                    <Copy className="w-3 h-3 opacity-70" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-0.5 shrink-0">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleEdit(entry.address)}
                                                    className="text-muted-foreground hover:text-foreground h-8 w-8"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(entry.address)}
                                                    className="text-destructive hover:text-destructive/80 h-8 w-8"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
