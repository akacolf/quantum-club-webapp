"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { useGameContext } from "./MiningContext";

export interface SavedAddress {
    address: string;
    name: string;
    createdAt: number;
}

interface AddressBookContextType {
    addresses: SavedAddress[];
    addAddress: (address: string, name: string) => void;
    removeAddress: (address: string) => void;
    updateAddress: (address: string, name: string) => void;
    getAddressByName: (name: string) => SavedAddress | undefined;
}

const AddressBookContext = createContext<AddressBookContextType | null>(null);

const STORAGE_KEY = "quantum_address_book";

export function AddressBookProvider({ children }: { children: ReactNode }) {
    const { telegramId } = useGameContext();
    const [addresses, setAddresses] = useState<SavedAddress[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load addresses from localStorage when telegramId is available
    useEffect(() => {
        if (typeof window !== "undefined" && telegramId) {
            const stored = localStorage.getItem(`${STORAGE_KEY}_${telegramId}`);
            if (stored) {
                try {
                    setAddresses(JSON.parse(stored));
                } catch {
                    // Invalid JSON, reset storage
                    localStorage.removeItem(`${STORAGE_KEY}_${telegramId}`);
                }
            }
            setIsInitialized(true);
        }
    }, [telegramId]);

    // Persist to localStorage only after initialization
    useEffect(() => {
        if (typeof window !== "undefined" && telegramId && isInitialized) {
            localStorage.setItem(`${STORAGE_KEY}_${telegramId}`, JSON.stringify(addresses));
        }
    }, [addresses, telegramId, isInitialized]);

    const addAddress = useCallback((address: string, name: string) => {
        setAddresses((prev) => {
            // Check if address already exists
            if (prev.some((a) => a.address.toLowerCase() === address.toLowerCase())) {
                return prev;
            }
            return [...prev, { address, name, createdAt: Date.now() }];
        });
    }, []);

    const removeAddress = useCallback((address: string) => {
        setAddresses((prev) => prev.filter((a) => a.address.toLowerCase() !== address.toLowerCase()));
    }, []);

    const updateAddress = useCallback((address: string, name: string) => {
        setAddresses((prev) =>
            prev.map((a) =>
                a.address.toLowerCase() === address.toLowerCase() ? { ...a, name } : a
            )
        );
    }, []);

    const getAddressByName = useCallback(
        (name: string) => {
            return addresses.find((a) => a.name.toLowerCase() === name.toLowerCase());
        },
        [addresses]
    );

    return (
        <AddressBookContext.Provider
            value={{
                addresses,
                addAddress,
                removeAddress,
                updateAddress,
                getAddressByName,
            }}
        >
            {children}
        </AddressBookContext.Provider>
    );
}

export function useAddressBook() {
    const context = useContext(AddressBookContext);
    if (!context) {
        throw new Error("useAddressBook must be used within an AddressBookProvider");
    }
    return context;
}
