"use client";

import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTelegramBackButton } from "@/app/(hooks)/useBackButton";
import { useUserContext } from "@/app/(contexts)/UserContext";
import { useUserBadgesQuery } from "@/app/(hooks)/queries/use-badges";
import { BADGE_DEFINITIONS, RARITY_COLORS } from "@/lib/badges";

export default function BadgesPage() {
    useTelegramBackButton("/home");
    const { telegramId } = useUserContext();
    const badgesQuery = useUserBadgesQuery(telegramId);

    const earnedBadgeIds = new Set(badgesQuery.data?.map((b) => b.badgeId) ?? []);
    const earnedBadges = badgesQuery.data ?? [];

    return (
        <div className="min-h-screen bg-background text-foreground pb-28">
            <div className="px-4 pt-4 space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                >
                    <h1 className="text-2xl font-bold">Badges</h1>
                    <p className="text-sm text-muted-foreground">
                        {earnedBadgeIds.size}/{BADGE_DEFINITIONS.length} earned
                    </p>
                </motion.div>

                {/* Badge Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {BADGE_DEFINITIONS.map((badge, index) => {
                        const isEarned = earnedBadgeIds.has(badge.id);
                        const earnedData = earnedBadges.find((b) => b.badgeId === badge.id);

                        return (
                            <motion.div
                                key={badge.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04 }}
                            >
                                <Card className={`border-border overflow-hidden ${isEarned ? "bg-card" : "bg-card/50 opacity-60"}`}>
                                    <CardContent className="p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isEarned ? "bg-primary/10" : "bg-muted"}`}>
                                                <Icon
                                                    icon={badge.icon}
                                                    className={`w-5 h-5 ${isEarned ? badge.color : "text-muted-foreground"}`}
                                                />
                                            </div>
                                            <Badge className={`text-[10px] ${RARITY_COLORS[badge.rarity]}`}>
                                                {badge.rarity}
                                            </Badge>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold">{badge.name}</h3>
                                            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                                {badge.description}
                                            </p>
                                        </div>
                                        {isEarned && earnedData ? (
                                            <p className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                                                <Icon icon="solar:check-circle-bold" className="w-3 h-3" />
                                                Earned {earnedData.earnedAt.toLocaleDateString()}
                                            </p>
                                        ) : (
                                            <p className="text-[10px] text-muted-foreground">
                                                {badge.criteria}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
