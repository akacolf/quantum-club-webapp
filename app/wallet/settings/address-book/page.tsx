"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { Address } from "@ton/core";
import { useWallet } from "../../WalletContext";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useForm } from "@tanstack/react-form";
import { addressBookSchema, type AddressBookFormData } from "@/lib/validations";
import { Field, FieldError } from "@/components/ui/field";

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
    const [editName, setEditName] = useState("");
    const [addressError, setAddressError] = useState<string | null>(null);
    const { telegramId } = useUserContext();

    const addForm = useForm({
        defaultValues: { name: "", address: "" },
        validators: { onSubmit: addressBookSchema },
        onSubmit: async ({ value }) => {
            handleAdd(value);
        },
    });

    // Format address for display
    const formatAddress = (address: string): string => {
        try {
            const addr = Address.parse(address);
            return addr.toString({ bounceable: false, testOnly: isTestnet });
        } catch {
            return address;
        }
    };

    // Slice address for compact display (e.g., "UQBx...abc1")
    const sliceAddress = (address: string): string => {
        if (address.length <= 16) return address;
        return `${address.slice(0, 8)}...${address.slice(-8)}`;
    };

    // Load from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY+`_${telegramId}`);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                queueMicrotask(() => setAddresses(parsed));
            } catch {}
        }
    }, [telegramId]);

    // Save to localStorage
    const saveAddresses = (newAddresses: SavedAddress[]) => {
        setAddresses(newAddresses);
        localStorage.setItem(STORAGE_KEY+`_${telegramId}`, JSON.stringify(newAddresses));
    };

    const handleAdd = (data: AddressBookFormData) => {
        setAddressError(null);

        // Validate TON address format
        try {
            Address.parse(data.address);
        } catch {
            setAddressError("Invalid TON address");
            return;
        }

        const normalizedAddress = formatAddress(data.address);
        if (addresses.some(a => a.address === normalizedAddress)) {
            setAddressError("Address already saved");
            return;
        }

        const newEntry: SavedAddress = {
            address: normalizedAddress,
            name: data.name.trim(),
            createdAt: Date.now(),
        };
        saveAddresses([...addresses, newEntry]);
        addForm.reset();
        setIsAdding(false);
        haptics.light();
        toast.success("Address saved!");
    };

    const handleDelete = (address: string) => {
        saveAddresses(addresses.filter(a => a.address !== address));
        haptics.light();
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
                    <h1 className="text-xl font-bold">Address book</h1>
                    <Button
                        size="sm"
                        onClick={() => { setIsAdding(true); setAddressError(null); }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 rounded-xl px-4 font-semibold shadow-sm"
                    >
                        <Icon icon="lucide:plus" className="w-4 h-4 mr-1" />
                        Add
                    </Button>
                </div>

                
                    {isAdding && (
                        <div
                        >
                            <Card className="bg-card border-0 mb-4">
                                <CardContent className="p-4 space-y-3">
                                    <addForm.Field
                                        name="name"
                                        >
                                        {(field) => {
                                            const hasErrors = field.state.meta.errors.length > 0;
                                            return (
                                                <Field data-invalid={hasErrors}>
                                                    <Input
                                                        id={field.name}
                                                        value={field.state.value}
                                                        onBlur={field.handleBlur}
                                                        onChange={(e) => field.handleChange(e.target.value)}
                                                        aria-invalid={hasErrors}
                                                        placeholder="Name (e.g., My Friend)"
                                                        className="bg-muted border border-border text-foreground"
                                                    />
                                                    {hasErrors && <FieldError errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />}
                                                </Field>
                                            );
                                        }}
                                    </addForm.Field>
                                    <addForm.Field
                                        name="address"
                                        >
                                        {(field) => {
                                            const hasFormErrors = field.state.meta.errors.length > 0;
                                            const hasManualError = addressError !== null;
                                            const isInvalid = hasFormErrors || hasManualError;
                                            return (
                                                <Field data-invalid={isInvalid}>
                                                    <Input
                                                        id={field.name}
                                                        value={field.state.value}
                                                        onBlur={field.handleBlur}
                                                        onChange={(e) => { field.handleChange(e.target.value); setAddressError(null); }}
                                                        aria-invalid={isInvalid}
                                                        placeholder="TON Address"
                                                        className={`bg-muted border border-border text-foreground font-mono text-sm ${isInvalid ? "border-destructive" : ""}`}
                                                    />
                                                    {hasFormErrors && <FieldError errors={field.state.meta.errors.map(e => ({ message: typeof e === 'string' ? e : (e as any)?.message ?? String(e) }))} />}
                                                    {!hasFormErrors && hasManualError && <FieldError errors={[{ message: addressError }]} />}
                                                </Field>
                                            );
                                        }}
                                    </addForm.Field>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsAdding(false);
                                                addForm.reset();
                                                setAddressError(null);
                                            }}
                                            className="flex-1 bg-muted border-0 text-foreground"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() => addForm.handleSubmit()}
                                            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                

                {addresses.length === 0 && !isAdding ? (
                    <div className="text-center py-12">
                        <Icon icon="lucide:user" className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No saved addresses</p>
                        <p className="text-sm text-muted-foreground/50 mt-1">
                            Add frequently used addresses for quick access
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {addresses.map((entry) => (
                            <Card key={entry.address} className="bg-card border-0">
                                <CardContent className="p-4">
                                    {editingAddress === entry.address ? (
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="bg-muted border border-border text-foreground flex-1"
                                                autoFocus
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={handleSaveEdit}
                                                className="text-green-500 hover:text-green-400"
                                            >
                                                <Icon icon="lucide:check" className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => setEditingAddress(null)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                <Icon icon="lucide:x" className="w-4 h-4" />
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
                                                    <Icon icon="lucide:copy" className="w-3 h-3 opacity-70" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-0.5 shrink-0">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleEdit(entry.address)}
                                                    className="text-muted-foreground hover:text-foreground h-8 w-8"
                                                >
                                                    <Icon icon="lucide:edit-2" className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(entry.address)}
                                                    className="text-destructive hover:text-destructive/80 h-8 w-8"
                                                >
                                                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
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
