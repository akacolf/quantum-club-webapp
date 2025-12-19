"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, Check, X, User, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { toast } from "sonner";
import { Address } from "@ton/core";
import { IS_TESTNET } from "../../WalletContext";

interface SavedAddress {
    address: string;
    name: string;
    createdAt: number;
}

const STORAGE_KEY = "quantum_address_book";

// Format address for display
const formatAddress = (address: string): string => {
    try {
        const addr = Address.parse(address);
        return addr.toString({ bounceable: false, testOnly: IS_TESTNET });
    } catch {
        return address;
    }
};

export default function AddressBookPage() {
    useTelegramBackButton("/wallet/settings");

    const [addresses, setAddresses] = useState<SavedAddress[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingAddress, setEditingAddress] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [newAddress, setNewAddress] = useState("");
    const [editName, setEditName] = useState("");
    const [addressError, setAddressError] = useState("");

    // Load from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setAddresses(JSON.parse(stored));
        }
    }, []);

    // Save to localStorage
    const saveAddresses = (newAddresses: SavedAddress[]) => {
        setAddresses(newAddresses);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newAddresses));
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
        <div className="min-h-screen bg-black text-white p-4 pt-6 pb-24">
            <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold">Address Book</h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAdding(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white border-0"
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
                            <Card className="bg-[#111] border-[#222] mb-4">
                                <CardContent className="p-4 space-y-3">
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Name (e.g., My Friend)"
                                        className="bg-[#1a1a1a] border-[#333] text-white"
                                    />
                                    <Input
                                        value={newAddress}
                                        onChange={(e) => {
                                            setNewAddress(e.target.value);
                                            if (e.target.value) validateAddress(e.target.value);
                                        }}
                                        placeholder="TON Address"
                                        className={`bg-[#1a1a1a] border-[#333] text-white font-mono text-sm ${addressError ? "border-red-500" : ""
                                            }`}
                                    />
                                    {addressError && (
                                        <p className="text-xs text-red-500">{addressError}</p>
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
                                            className="flex-1 bg-[#1a1a1a] border-[#333] text-white"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleAdd}
                                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
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
                        <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No saved addresses</p>
                        <p className="text-sm text-gray-600 mt-1">
                            Add frequently used addresses for quick access
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {addresses.map((entry) => (
                            <Card key={entry.address} className="bg-[#111] border-[#222]">
                                <CardContent className="p-4">
                                    {editingAddress === entry.address ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="bg-[#1a1a1a] border-[#333] text-white flex-1"
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
                                                className="text-gray-500 hover:text-gray-400"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-white">{entry.name}</div>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => copyAddress(entry.address)}
                                                    className="h-auto p-0 text-xs text-gray-500 font-mono break-all text-left hover:text-gray-400 hover:bg-transparent flex items-center gap-1 mt-1"
                                                >
                                                    {entry.address.slice(0, 12)}...{entry.address.slice(-8)}
                                                    <Copy className="w-3 h-3 shrink-0" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleEdit(entry.address)}
                                                    className="text-gray-500 hover:text-white h-8 w-8"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(entry.address)}
                                                    className="text-red-500 hover:text-red-400 h-8 w-8"
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
