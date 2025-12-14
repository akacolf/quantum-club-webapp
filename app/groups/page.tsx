"use client";

import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useGroups, Group } from "@/app/(contexts)/GroupsContext";
import Loader from "@/app/(components)/Loader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, ChevronRight } from "lucide-react";

interface GroupItemProps {
    group: Group;
    index: number;
    onNavigate: (groupId: string) => void;
}

// Memoized group item component for performance
const GroupItem = memo(function GroupItem({ group, index, onNavigate }: GroupItemProps) {
    const handleClick = useCallback(() => {
        onNavigate(group.id);
    }, [group.id, onNavigate]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card
                className="bg-[#1a1a1a]/80 border-[#333] backdrop-blur-xl cursor-pointer hover:bg-[#2a2a2a]/80 transition-colors"
                onClick={handleClick}
            >
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                            {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">{group.name}</h3>
                            <p className="text-sm text-gray-400">
                                {group.memberCount} / 5 members
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                </CardContent>
            </Card>
        </motion.div>
    );
});

export default function GroupsPage() {
    useTelegramBackButton("/home");
    const router = useRouter();
    const { groups, loading } = useGroups();

    // Memoized navigation handlers
    const handleNavigateToGroup = useCallback((groupId: string) => {
        router.push(`/groups/${groupId}`);
    }, [router]);

    const handleNavigateToCreate = useCallback(() => {
        router.push("/groups/create");
    }, [router]);

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 p-4 pt-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Groups</h1>
                        <p className="text-sm text-gray-400">Connect with your community</p>
                    </div>
                    <Button
                        onClick={handleNavigateToCreate}
                        className="bg-white text-black hover:bg-gray-200"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Create
                    </Button>
                </div>

                {/* Groups List */}
                {groups.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-16 space-y-4"
                    >
                        <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center">
                            <Users className="w-8 h-8 text-gray-500" />
                        </div>
                        <p className="text-gray-400 text-center">
                            You haven&apos;t joined any groups yet
                        </p>
                        <Button
                            onClick={handleNavigateToCreate}
                            variant="outline"
                            className="border-[#333] text-white hover:bg-[#1a1a1a]"
                        >
                            Create your first group
                        </Button>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        {groups.map((group, index) => (
                            <GroupItem
                                key={group.id}
                                group={group}
                                index={index}
                                onNavigate={handleNavigateToGroup}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
