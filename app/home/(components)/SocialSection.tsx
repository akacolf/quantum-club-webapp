"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";

export default function SocialSection() {
    const router = useRouter();

    // Prefetch social routes
    useEffect(() => {
        router.prefetch("/groups");
        router.prefetch("/chat");
        router.prefetch("/groups/create");
    }, [router]);

    return (
        <div className="px-4 py-4 space-y-3">
            <h2 className="text-lg font-semibold text-white">Community</h2>
            <div className="grid grid-cols-2 gap-3">
                {/* Groups */}
                <Link href="/groups" prefetch={true}>
                    <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30 hover:border-blue-400/50 transition-colors cursor-pointer h-full">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <Icon icon="lucide:users" className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-white text-sm">Groups</p>
                                <p className="text-xs text-gray-400">Connect with clubs</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                {/* Chat */}
                <Link href="/chat" prefetch={true}>
                    <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:border-purple-400/50 transition-colors cursor-pointer h-full">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                <Icon icon="lucide:message-circle" className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-white text-sm">Messages</p>
                                <p className="text-xs text-gray-400">Chat with friends</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
