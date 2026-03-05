"use client";

import { useEffect, useRef } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useGroups, Group } from "@/app/(contexts)/GroupsContext";
import Loader from "@/app/(components)/Loader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@iconify/react";

interface GroupItemProps {
    group: Group;
    index: number;
    onNavigate: (groupId: string) => void;
}

function GroupItem({ group, index, onNavigate }: GroupItemProps) {
    const handleClick = () => {
        onNavigate(group.id);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card
                className="cursor-pointer bg-white/5 border-white/5 hover:bg-white/10 transition-all active:scale-[0.98] rounded-2xl"
                onClick={handleClick}
            >
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border border-white/10">
                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${group.name}`} />
                            <AvatarFallback className="bg-white/10 text-white font-bold text-lg">
                                {group.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-semibold text-foreground">{group.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                {group.memberCount} / 5 members
                            </p>
                        </div>
                    </div>
                    <Icon icon="lucide:chevron-right" className="w-5 h-5 text-muted-foreground" />
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default function GroupsPage() {
    useTelegramBackButton("/ecosystem/trade");
    const router = useRouter();
    const { groups, loading } = useGroups();

    // Navigation handlers
    const handleNavigateToGroup = (groupId: string) => {
        router.push(`/groups/${groupId}`);
    };

    const handleNavigateToCreate = () => {
        router.push("/groups/create");
    };

    // Prefetch group routes
    useEffect(() => {
        groups.slice(0, 10).forEach((g) => router.prefetch(`/groups/${g.id}`));
        router.prefetch("/groups/create");
    }, [groups, router]);

    const listRef = useRef<HTMLDivElement>(null);
    /* eslint-disable react-hooks/refs -- TanStack Virtual is designed to read refs during render for scrollMargin */
    const virtualizer = useWindowVirtualizer({
        count: groups.length,
        estimateSize: () => 80,
        overscan: 5,
        scrollMargin: listRef.current?.offsetTop ?? 0,
    });

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-24">
            <div className="p-4 pt-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Groups</h1>
                        <p className="text-sm text-muted-foreground">Connect with your community</p>
                    </div>
                    <Button
                        onClick={handleNavigateToCreate}
                        className="h-11 px-6 bg-white text-black hover:bg-white/90 font-bold rounded-2xl active:scale-95 transition-all"
                    >
                        <Icon icon="lucide:plus" className="w-4 h-4 mr-1" />
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
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                            <Icon icon="lucide:users" className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground text-center">
                            You haven&apos;t joined any groups yet
                        </p>
                        <Button
                            onClick={handleNavigateToCreate}
                            variant="outline"
                            className="text-foreground"
                        >
                            Create your first group
                        </Button>
                    </motion.div>
                ) : (
                    <div ref={listRef}>
                        <div className="relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
                            {virtualizer.getVirtualItems().map((virtualItem) => {
                                const group = groups[virtualItem.index];
                                return (
                                    <div
                                        key={group.id}
                                        className="absolute top-0 left-0 w-full"
                                        style={{ transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)` }}
                                        ref={virtualizer.measureElement}
                                        data-index={virtualItem.index}
                                    >
                                        <div className="pb-3">
                                            <GroupItem group={group} index={virtualItem.index} onNavigate={handleNavigateToGroup} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
