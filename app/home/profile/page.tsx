"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useGameContext } from "@/app/(contexts)/MiningContext";
import Loader from "@/app/(components)/Loader";
import { toast } from "sonner";
import {
    User,
    Copy,
    Check,
} from "lucide-react";

export default function ProfilePage() {
    useTelegramBackButton("/home");
    const { telegramId, username } = useGameContext();

    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    // Copy QC ID to clipboard
    const handleCopyId = async () => {
        if (!telegramId) return;
        try {
            await navigator.clipboard.writeText(telegramId);
            setCopied(true);
            toast.success("QC ID copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy ID");
        }
    };

    // Fetch user photo
    useEffect(() => {
        const fetchData = async () => {
            const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

            // Fetch photo
            if (tgUser?.photo_url) {
                setPhotoUrl(tgUser.photo_url);
            } else if (tgUser?.id) {
                try {
                    const res = await fetch('/api/get-profile-photo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ telegramId: tgUser.id })
                    });
                    const data = await res.json();
                    setPhotoUrl(data.photoUrl);
                } catch { }
            }

            setIsLoading(false);
        };

        fetchData();
    }, [telegramId]);

    if (isLoading) {
        return <Loader />;
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 p-4 pt-8 space-y-6">
                {/* Profile Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center space-y-4"
                >
                    {/* Profile Photo - Simple border, no gradient */}
                    <div className="w-28 h-28 rounded-full border-2 border-[#333] bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
                        {photoUrl ? (
                            <Image
                                src={photoUrl}
                                alt="Profile"
                                width={112}
                                height={112}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        ) : (
                            <User className="w-12 h-12 text-gray-500" />
                        )}
                    </div>

                    {/* Username */}
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-white">
                            {username || "Quantum User"}
                        </h1>
                    </div>

                    {/* QC ID - Tappable to copy */}
                    <motion.button
                        onClick={handleCopyId}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a]/80 border border-[#333] rounded-xl backdrop-blur-xl transition-colors hover:bg-[#2a2a2a]/80"
                    >
                        <span className="text-sm text-gray-400">QC ID:</span>
                        <span className="text-sm font-mono text-white">
                            {telegramId}
                        </span>
                        {copied ? (
                            <Check className="w-4 h-4 text-green-400" />
                        ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                        )}
                    </motion.button>
                </motion.div>
            </div>
        </div>
    );
}
